import { Injectable, signal, inject } from '@angular/core';
import { ApiConfigService } from './api-config.service';
import { GameScene, GameConfig, GameOption } from './gemini.service';
import { IAIService } from './ai.interface';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const GAME_SCHEMA = {
    type: 'object',
    properties: {
        narrative: { type: 'string', description: '环境描写与剧情推进（不含对话内容）' },
        speakerName: { type: 'string', description: '说话者名字', nullable: true },
        dialogue: { type: 'string', description: '纯口语文字，只要说的话本身', nullable: true },
        options: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    label: { type: 'string', description: '简短按钮文本，2-4字' },
                    action: { type: 'string', description: 'MUST以「我」开头。说话时MUST包含带「」的台词，如：我说道：「...」。NEVER概括性描述说话内容。' }
                },
                required: ['label', 'action']
            },
            minItems: 3,
            maxItems: 3
        },
        isGameOver: { type: 'boolean' },
        backgroundMood: { type: 'string', description: '场景氛围关键词' },
        currencyUnit: { type: 'string', description: '根据世界观设定的货币单位名称', nullable: true },
        currencyAmount: { type: 'number', description: '主角当前持有的货币数量', nullable: true },
        currentLocation: { type: 'string', description: '主角当前所处的具体位置', nullable: true },
        currentTime: { type: 'string', description: '当前位置时间', nullable: true }
    },
    required: ['narrative', 'options', 'isGameOver', 'currentLocation', 'currentTime']
};

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
                    schema: GAME_SCHEMA
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

        const systemPrompt = `你是互动小说引擎。严格遵守以下规则：

【世界配置】
主题: ${config.theme} | 设定: ${config.setting} | 主角: ${config.protagonist} | 风格: ${config.style}

【输出规则】
1. 语言：简体中文
2. narrative：第二人称"你"视角，描写环境和NPC动作
3. dialogue：纯对话文字，禁止引号和动作描写
4. action：第一人称"我"开头

【状态追踪】CRITICAL
- currencyUnit：开场时根据世界观设定合适的货币单位（如"金币"、"灵石"、"银两"），之后保持一致
- currencyAmount：主角当前持有的货币数量，开场时给一个合理初始值，交易/获得/消耗时更新
- currentLocation：始终输出主角当前所处的具体位置
- currentTime：输出当前时间（如"清晨"、"午后"、"深夜"或具体时辰），每5轮对话约前进1分钟游戏时间，重大场景转换可调整

【NPC称呼】MUST
- 身份已知后，NEVER用"男人/女人/老者"等泛称
- ALWAYS用具体身份：码头管理员、老陈、守卫队长

【narrative结构】
- 可在NPC说完话后继续描写其动作/神态
- 例："管理员说完，将信号灯别回腰间，目光扫向远处的货船。"

【action规则】CRITICAL
action要像小说段落，包含动作细节、神态或心理描写。
- 只有当主角需要说话时才包含「」台词，纯动作无需对话
- 不要每个选项都包含对话，可以有沉默的行为选择
× WRONG: "我询问他关于遗迹的事情"（说话了却没有具体台词）
✓ RIGHT: "我追问道：「这附近有什么值得一看的遗迹吗？」"（说话带台词）
✓ RIGHT: "我默默转身离开，不愿在这个话题上多做纠缠。"（不说话，纯动作）

【label规则】
label是按钮文本，需简洁明了（3-6字），让玩家一眼看懂会做什么：
× WRONG: "询问" "离开" "攻击"（太模糊）
✓ RIGHT: "追问遗迹线索" "转身离开酒馆" "拔剑迎战"

【NPC认知】
主角未自我介绍前，NPC不知道主角名字。

【玩家行为处理】CRITICAL
1. NEVER拒绝玩家的操作选择。如果玩家行为与当前时间/地点逻辑冲突，描述操作后的尴尬或意外后果
2. 严格遵守世界观设定。如果玩家的行为违反设定（如在无魔法世界施法），以叙事方式引导玩家失败，NEVER脱离设定顺从玩家
3. 根据当前时间、地点、角色能力评估行为合理性。极端困难的动作应描写失败，或有重大代价的成功
示例：
- 玩家想飞但没翅膀 → 描述跳起后狼狈落地
- 玩家想开锁但无工具 → 描述徒手尝试失败，手指擦伤
- 凡人单挑巨龙 → 描述被轻易击飞，重伤濒死

必须返回有效的JSON对象。`;

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

            const nextScene = JSON.parse(response) as GameScene;
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
    restoreSession(sceneHistory: GameScene[], chatContext: ChatMessage[]): void {
        this.sceneHistory.set(sceneHistory);
        this.conversationHistory = [...chatContext];
        this.error.set(null);
    }
}
