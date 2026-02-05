import { Injectable, signal, inject } from '@angular/core';
import { ApiConfigService } from './api-config.service';
import { GameScene, GameConfig, GameOption } from './gemini.service';
import { IAIService } from './ai.interface';
import { buildSystemPrompt, GAME_SCHEMA_OPENAI } from './prompts';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

@Injectable({
    providedIn: 'root'
})
export class OpenAIService implements IAIService {
    private apiConfigService = inject(ApiConfigService);
    private conversationHistory: ChatMessage[] = [];

    isLoading = signal<boolean>(false);
    sceneHistory = signal<GameScene[]>([]);
    error = signal<string | null>(null);

    private get config() {
        return this.apiConfigService.getProviderConfig('openai-compatible');
    }

    private get selectedModel(): string {
        return this.config.selectedModelId || 'gpt-4o';
    }

    private parseCustomHeaders(): Record<string, string> {
        const headersStr = this.config.customHeaders || '';
        if (!headersStr.trim()) return {};
        try {
            return JSON.parse(headersStr);
        } catch {
            console.warn('Invalid custom headers JSON:', headersStr);
            return {};
        }
    }

    private async callAPI(messages: ChatMessage[], useJsonSchema = false): Promise<string> {
        const { apiKey, baseUrl, temperature } = this.config;

        if (!apiKey) {
            throw new Error('OpenAI API Key 未配置');
        }

        const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...this.parseCustomHeaders()
        };

        const body: any = {
            model: this.selectedModel,
            messages,
            temperature: temperature ?? 1.0
        };

        // Add JSON response format if needed
        if (useJsonSchema) {
            body.response_format = {
                type: 'json_schema',
                json_schema: {
                    name: 'game_scene',
                    strict: true,
                    schema: GAME_SCHEMA_OPENAI
                }
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('OpenAI Raw Response:', data);
        return data.choices?.[0]?.message?.content || '';
    }

    async generateWorldSetting(theme: string, simpleSetting: string, style: string, protagonist?: string): Promise<import('./ai.interface').WorldSettingResult> {
        const needsProtagonist = !protagonist || protagonist.trim() === '';

        const prompt = needsProtagonist
            ? `根据以下信息生成互动小说世界观和主角代号：

主题：${theme}
风格：${style}
初始概念：${simpleSetting || '自由发挥'}

要求：
1. 世界观（100-200字）：简体中文，有画面感，交代背景/氛围/潜在冲突
2. 主角代号：根据世界观设定一个符合氛围的主角代号（2-4字）

请严格按以下JSON格式返回：
{"setting": "世界观描述", "protagonist": "主角代号"}`
            : `根据以下信息扩写一个互动小说世界观（100-200字）：

主题：${theme}
风格：${style}
初始概念：${simpleSetting || '自由发挥'}

要求：简体中文，有画面感，交代背景/氛围/潜在冲突。直接输出设定内容，禁止任何元描述。`;

        const messages: ChatMessage[] = [
            { role: 'user', content: prompt }
        ];

        try {
            const text = await this.callAPI(messages);

            if (needsProtagonist) {
                // Try to parse JSON response
                try {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        return {
                            setting: parsed.setting || text,
                            protagonist: parsed.protagonist || '旅人'
                        };
                    }
                } catch {
                    console.warn('Failed to parse JSON response, using fallback');
                }
                // Fallback: return text as setting with default protagonist
                return { setting: text, protagonist: '旅人' };
            }

            return { setting: text };
        } catch (e: any) {
            console.error('Setting Generation Error', e);
            throw new Error('世界观生成失败: ' + e.message);
        }
    }

    async startGame(config: GameConfig) {
        this.isLoading.set(true);
        this.error.set(null);
        this.sceneHistory.set([]);
        this.conversationHistory = [];

        const systemPrompt = buildSystemPrompt(config);

        this.conversationHistory = [
            { role: 'system', content: systemPrompt }
        ];

        try {
            const messages: ChatMessage[] = [
                ...this.conversationHistory,
                { role: 'user', content: '开始游戏。生成开场场景。' }
            ];

            const response = await this.callAPI(messages, true);

            if (!response) throw new Error('No response from AI');

            const scene = JSON.parse(response) as GameScene;
            this.sceneHistory.set([scene]);

            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: '开始游戏' },
                { role: 'assistant', content: response }
            );

        } catch (e: any) {
            console.error('Game Start Error', e);
            this.error.set('故事启动失败，请重试。' + (e.message || ''));
        } finally {
            this.isLoading.set(false);
        }
    }

    async makeChoice(optionData: GameOption, inventoryContext?: import('./ai.interface').InventoryContext) {
        // Record the expanded action text in history
        this.sceneHistory.update(history => {
            if (history.length === 0) return history;
            const lastIndex = history.length - 1;
            const updatedLastScene = { ...history[lastIndex], userChoice: optionData.action };
            const newHistory = [...history];
            newHistory[lastIndex] = updatedLastScene;
            return newHistory;
        });

        // Build the message with inventory context
        let userMessage = `[${optionData.label}] ${optionData.action}`;

        if (inventoryContext) {
            const contextParts: string[] = [];

            // Always include favorites
            if (inventoryContext.favorites.length > 0) {
                contextParts.push(`【收藏物品】${inventoryContext.favorites.join('、')}`);
            }

            // Include all items if full or has pending discards
            if (inventoryContext.isFull || (inventoryContext.pendingDiscards && inventoryContext.pendingDiscards.length > 0)) {
                if (inventoryContext.allItems && inventoryContext.allItems.length > 0) {
                    contextParts.push(`【全部物品】${inventoryContext.allItems.join('、')}`);
                }
            }

            // Include pending discards with special instruction
            if (inventoryContext.pendingDiscards && inventoryContext.pendingDiscards.length > 0) {
                contextParts.push(`【玩家请求丢弃】${inventoryContext.pendingDiscards.join('、')} - 请在叙事中描述丢弃过程`);
            }

            // Warn if inventory is full
            if (inventoryContext.isFull) {
                contextParts.push(`【注意】物品栏已满(10/10)，如需给予新物品请在叙事中说明`);
            }

            if (contextParts.length > 0) {
                userMessage += '\n\n' + contextParts.join('\n');
            }
        }

        await this.processTurn(userMessage);
    }

    async retryLastAction() {
        if (this.conversationHistory.length === 0) return;

        // Try to recover the last user message from conversation history if possible
        // But since we pushed to history only on success in processTurn, we might not have the failed message there.
        // Wait, current logic updates conversation history ONLY on success.
        // So for retry, we need to reconstruct the message from the last scene in sceneHistory.

        const history = this.sceneHistory();
        if (history.length === 0) return;

        const lastScene = history[history.length - 1];
        if (!lastScene.userChoice) return;

        // Find the label for the user choice from options
        const options = lastScene.options || [];
        const matchedOption = options.find(opt => opt.action === lastScene.userChoice);
        const label = matchedOption ? matchedOption.label : 'Retry';

        const userMessage = `[${label}] ${lastScene.userChoice}`;
        await this.processTurn(userMessage);
    }

    private async processTurn(userMessage: string) {
        this.isLoading.set(true);
        this.error.set(null);

        try {
            const messages: ChatMessage[] = [
                ...this.conversationHistory,
                { role: 'user', content: userMessage }
            ];

            const response = await this.callAPI(messages, true);

            if (!response) throw new Error('No response from AI');

            const nextScene = JSON.parse(response) as GameScene;
            this.sceneHistory.update(history => [...history, nextScene]);

            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: response }
            );

        } catch (e: any) {
            console.error('Turn Error', e);
            this.error.set('Failed to fetch'); // Standardized error message
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * 导出当前对话上下文（用于存档）
     */
    getContext(): ChatMessage[] {
        return [...this.conversationHistory];
    }

    /**
     * 从存档恢复会话
     */
    restoreSession(sceneHistory: GameScene[], chatContext: ChatMessage[]): void {
        this.sceneHistory.set(sceneHistory);
        this.conversationHistory = [...chatContext];
        this.error.set(null);
    }
}
