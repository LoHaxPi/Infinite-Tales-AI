import { Injectable, signal, inject } from '@angular/core';
import { ApiConfigService } from './api-config.service';
import { GameScene, GameConfig, GameOption } from './gemini.service';
import { IAIService } from './ai.interface';
import { buildGameSchemaForOpenAI, buildGameSystemPrompt, parseAndValidateGameScene } from './prompt-builder';

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
                    schema: buildGameSchemaForOpenAI()
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

    async generateWorldSetting(theme: string, simpleSetting: string, style: string): Promise<string> {
        const prompt = `根据以下信息扩写一个互动小说世界观（100-200字）：

主题：${theme}
风格：${style}
初始概念：${simpleSetting || '自由发挥'}

要求：简体中文，有画面感，交代背景/氛围/潜在冲突。直接输出设定内容，禁止任何元描述。`;

        const messages: ChatMessage[] = [
            { role: 'user', content: prompt }
        ];

        try {
            return await this.callAPI(messages);
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

        const systemPrompt = buildGameSystemPrompt(config, 'start');

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

            const scene = parseAndValidateGameScene(response);
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

    async makeChoice(optionData: GameOption) {
        // Record the expanded action text in history
        this.sceneHistory.update(history => {
            if (history.length === 0) return history;
            const lastIndex = history.length - 1;
            const updatedLastScene = { ...history[lastIndex], userChoice: optionData.action };
            const newHistory = [...history];
            newHistory[lastIndex] = updatedLastScene;
            return newHistory;
        });

        this.isLoading.set(true);
        this.error.set(null);

        try {
            const userMessage = `[${optionData.label}] ${optionData.action}`;

            const messages: ChatMessage[] = [
                ...this.conversationHistory,
                { role: 'user', content: userMessage }
            ];

            const response = await this.callAPI(messages, true);

            if (!response) throw new Error('No response from AI');

            const nextScene = parseAndValidateGameScene(response);
            this.sceneHistory.update(history => [...history, nextScene]);

            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: response }
            );

        } catch (e: any) {
            console.error('Turn Error', e);
            this.error.set('时间线发生了断裂，请重试该操作。' + (e.message || ''));
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
    restoreSession(sceneHistory: GameScene[], chatContext: ChatMessage[], config?: GameConfig): void {
        this.sceneHistory.set(sceneHistory);

        if (config) {
            const restoreSystemPrompt = buildGameSystemPrompt(config, 'restore');
            const historyWithoutInitialSystem = chatContext.filter((msg, index) => !(index === 0 && msg.role === 'system'));
            this.conversationHistory = [
                { role: 'system', content: restoreSystemPrompt },
                ...historyWithoutInitialSystem
            ];
        } else {
            this.conversationHistory = [...chatContext];
        }

        this.error.set(null);
    }
}
