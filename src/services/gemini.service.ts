import { Injectable, signal, inject } from '@angular/core';
import { GoogleGenAI, Type, Chat, HarmCategory, HarmBlockThreshold, ThinkingLevel } from '@google/genai';
import { ApiConfigService } from './api-config.service';
import { IAIService } from './ai.interface';

export interface GameOption {
  label: string; // The text on the button (e.g., "Nod")
  action: string; // The expanded text shown in history (e.g., "You nod silently and approach him.")
}

export interface GameScene {
  narrative: string;
  speakerName?: string;
  dialogue?: string;
  options: GameOption[]; // Updated to allow structured options
  isGameOver: boolean;
  backgroundMood?: string;
  userChoice?: string; // Stores the expanded 'action' text
}

export interface GameConfig {
  theme: string;
  setting: string;
  protagonist: string;
  style: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService implements IAIService {
  private apiConfigService = inject(ApiConfigService);
  private ai!: GoogleGenAI;
  private chatSession: Chat | null = null;

  isLoading = signal<boolean>(false);
  sceneHistory = signal<GameScene[]>([]);
  error = signal<string | null>(null);

  private get config() {
    return this.apiConfigService.getProviderConfig('google-genai');
  }

  private get apiKey(): string {
    return this.config.apiKey;
  }

  private get modelName(): string {
    return this.config.selectedModelId || 'gemini-2.0-flash';
  }

  private initAI() {
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async generateWorldSetting(theme: string, simpleSetting: string, style: string): Promise<string> {
    const prompt = `根据以下信息扩写一个互动小说世界观（100-200字）：

主题：${theme}
风格：${style}
初始概念：${simpleSetting || '自由发挥'}

要求：简体中文，有画面感，交代背景/氛围/潜在冲突。直接输出设定内容，禁止任何元描述。`;

    try {
      this.initAI();
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        config: {
          thinkingConfig: {
            includeThoughts: false, // Optional: set to true if you want to see thoughts
            thinkingLevel: ThinkingLevel.MEDIUM
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            }
          ]
        },
        contents: prompt,
      });
      console.log('Gemini Raw Response (World Setting):', response);
      return response.text || "无法生成设定，请重试。";
    } catch (e: any) {
      console.error("Setting Generation Error", e);
      throw new Error("世界观生成失败: " + e.message);
    }
  }

  async startGame(config: GameConfig) {
    this.isLoading.set(true);
    this.error.set(null);
    this.sceneHistory.set([]);

    const systemPrompt = `你是互动小说引擎。严格遵守以下规则：

【世界配置】
主题: ${config.theme} | 设定: ${config.setting} | 主角: ${config.protagonist} | 风格: ${config.style}

【输出规则】
1. 语言：简体中文
2. narrative：第二人称"你"视角，描写环境和NPC动作
3. dialogue：纯对话文字，禁止引号和动作描写
4. action：第一人称"我"开头

【NPC称呼】MUST
- 身份已知后，NEVER用"男人/女人/老者"等泛称
- ALWAYS用具体身份：码头管理员、老陈、守卫队长

【narrative结构】
- 可在NPC说完话后继续描写其动作/神态
- 例："管理员说完，将信号灯别回腰间，目光扫向远处的货船。"

【action规则】CRITICAL
action要像小说段落，包含动作细节、神态或心理描写，避免干巴巴的陈述。
说话时MUST包含带「」的完整台词：
× WRONG: "我点头，说我是旅人"（太短太干）
× WRONG: "我询问他关于遗迹的事情"（缺台词）
✓ RIGHT: "我轻轻颔首，目光掠过他饱经风霜的面庞，语气平和地说道：「我是刚到这里的旅人，初来乍到，还请前辈多多指教。」"
✓ RIGHT: "我按捺住心中的好奇，故作漫不经心地追问道：「这附近有什么值得一看的遗迹吗？」"
✓ RIGHT: "我没有答话，只是沉默地点了点头，心中暗自盘算着下一步该怎么走。"

【NPC认知】
主角未自我介绍前，NPC不知道主角名字。

生成开场场景。`;

    try {
      this.initAI();
      this.chatSession = this.ai.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              narrative: { type: Type.STRING },
              speakerName: { type: Type.STRING, nullable: true },
              dialogue: { type: Type.STRING, nullable: true, description: "Pure spoken words only. NO quotes, NO action descriptions." },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: "Short button text, 2-4 chars" },
                    action: { type: Type.STRING, description: "MUST start with 我. If speaking, MUST include quoted dialogue like 我说：「...」. NEVER summarize speech without quotes." }
                  },
                  required: ['label', 'action']
                },
                minItems: 3,
                maxItems: 3
              },
              isGameOver: { type: Type.BOOLEAN },
              backgroundMood: { type: Type.STRING }
            },
            required: ['narrative', 'options', 'isGameOver']
          },
          thinkingConfig: {
            includeThoughts: false,
            thinkingLevel: ThinkingLevel.MEDIUM
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            }
          ]
        }
      });

      const result = await this.chatSession.sendMessage({ message: "开始游戏" });
      console.log('Gemini Raw Response (Start Game):', result);
      const text = result.text;

      if (!text) throw new Error("No response from AI");

      const scene = JSON.parse(text) as GameScene;
      this.sceneHistory.set([scene]);

    } catch (e: any) {
      console.error("Game Start Error", e);
      this.error.set("故事启动失败，请重试。" + (e.message || ''));
    } finally {
      this.isLoading.set(false);
    }
  }

  async makeChoice(optionData: { label: string, action: string }) {
    if (!this.chatSession) return;

    // 1. Record the expanded action text in history
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
      // Send concise action to AI - no need for verbose instruction
      const message = `[${optionData.label}] ${optionData.action}`;

      const result = await this.chatSession.sendMessage({ message });
      console.log('Gemini Raw Response (Make Choice):', result);
      const text = result.text;

      if (!text) throw new Error("No response from AI");

      const nextScene = JSON.parse(text) as GameScene;
      this.sceneHistory.update(history => [...history, nextScene]);

    } catch (e: any) {
      console.error("Turn Error", e);
      this.error.set("时间线发生了断裂，请重试该操作。" + (e.message || ''));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * 导出当前对话上下文（用于存档）
   */
  async getContext(): Promise<any[]> {
    if (!this.chatSession) return [];
    try {
      return await this.chatSession.getHistory();
    } catch (e) {
      console.error('Failed to get chat history:', e);
      return [];
    }
  }

  /**
   * 从存档恢复会话
   */
  restoreSession(sceneHistory: GameScene[], chatContext: any[], config: GameConfig): void {
    this.initAI();
    this.sceneHistory.set(sceneHistory);
    this.error.set(null);

    // 重建系统提示（与startGame保持一致）
    const systemPrompt = `# 角色
你是互动小说引擎/游戏主持人(GM)。

# 世界配置
- 主题: ${config.theme}
- 设定: ${config.setting}
- 主角: ${config.protagonist}
- 风格: ${config.style}${config.theme.includes('AI') || config.style.includes('Adaptive') ? '\n（风格标记为AI/Adaptive时，根据设定自行推断最合适的风格）' : ''}

# 核心规则
1. 语言：简体中文
2. 视角：narrative用第二人称"你"，action用第一人称"我"
3. NPC认知限制：主角未自我介绍前，NPC绝不知道主角名字，只能称"陌生人/新来的/你"

# JSON字段规范
- narrative: 环境描写与剧情推进（不含对话内容）
- speakerName: 说话者名字
- dialogue: 纯口语文字（❌ 禁止引号/动作描写，✅ 只要说的话本身）
- options[3]: { label: 简短按钮文本, action: 详见下方规则 }
- backgroundMood: 场景氛围关键词

# action字段规则（重要）
action必须以"我"开头，描述主角的完整动作。**如果涉及说话，必须包含带中文引号的具体台词**：
- ❌ 错误: "我询问他的名字" （没有具体台词）
- ❌ 错误: "我向他打招呼" （没有具体台词）
- ✅ 正确: "我看向他，开口问道："你叫什么名字？""
- ✅ 正确: "我挥了挥手，朝他喊道："嘿，早上好！""
- ✅ 正确: "我沉默地点了点头。" （不涉及说话，无需台词）`;

    // 使用历史记录创建新的聊天会话
    this.chatSession = this.ai.chats.create({
      model: this.modelName,
      history: chatContext, // 关键：注入保存的对话历史
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            speakerName: { type: Type.STRING, nullable: true },
            dialogue: { type: Type.STRING, nullable: true, description: "ONLY the spoken words. NO quotes, NO 'he said'." },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Short button text" },
                  action: { type: Type.STRING, description: "Expanded action starting with '我...'. MUST include spoken quotes if responding verbally." }
                },
                required: ['label', 'action']
              },
              minItems: 3,
              maxItems: 3
            },
            isGameOver: { type: Type.BOOLEAN },
            backgroundMood: { type: Type.STRING }
          },
          required: ['narrative', 'options', 'isGameOver']
        },
        thinkingConfig: {
          includeThoughts: false,
          thinkingLevel: ThinkingLevel.MEDIUM
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          }
        ]
      }
    });
  }
}