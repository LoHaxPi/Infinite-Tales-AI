import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type, Chat } from '@google/genai';

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
export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;

  isLoading = signal<boolean>(false);
  sceneHistory = signal<GameScene[]>([]);
  error = signal<string | null>(null);

  constructor() {
    const apiKey = process.env['API_KEY'] || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateWorldSetting(theme: string, simpleSetting: string, style: string): Promise<string> {
    const prompt = `根据以下信息扩写一个互动小说世界观（100-200字）：

主题：${theme}
风格：${style}
初始概念：${simpleSetting || '自由发挥'}

要求：简体中文，有画面感，交代背景/氛围/潜在冲突。直接输出设定内容，禁止任何元描述。`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
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
- options[3]: { label: 简短按钮文本, action: "我..."开头的动作描述，说话时包含带引号的台词 }
- backgroundMood: 场景氛围关键词

# 开场模式
- 新访客型：主角刚抵达，NPC引导但不知其名
- 苏醒/穿越型：主角突然出现，周围人感到陌生

生成开场。`;

    try {
      this.chatSession = this.ai.chats.create({
        model: 'gemini-3-flash-preview',
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
                    action: { type: Type.STRING, description: "Expanded action starting with '我...'. MUST include spoken quotes (e.g. '我说道："..."') if responding verbally." }
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
          }
        }
      });

      const result = await this.chatSession.sendMessage({ message: "开始游戏" });
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
}