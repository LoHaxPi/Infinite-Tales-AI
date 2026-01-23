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
    const prompt = `
      任务：根据用户提供的简短概念，扩写一个引人入胜的互动小说世界观设定。
      
      输入信息：
      - 主题：${theme}
      - 风格：${style}
      - 初始概念：${simpleSetting || '未指定，请自由发挥'}

      要求：
      1. 使用简体中文。
      2. 长度在 100-200 字之间。
      3. 描述要有画面感，交代背景、氛围和潜在的冲突。
      4. 不要包含游戏机制说明，只描述世界设定。
      5. 直接输出设定内容，不要加“好的，这是设定”之类的废话。
    `;

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

    const systemPrompt = `
      你是一个高级互动小说引擎。你是游戏主持人(Game Master)。
      
      用户提供的世界配置:
      - 主题: ${config.theme}
      - 设定: ${config.setting}
      - 主角: ${config.protagonist}
      - 风格: ${config.style}
      
      注意：如果“主题”或“风格”标记为 AI Generated 或 Adaptive，请完全根据“设定”中的描述自行推断并应用最合适的风格。

      【核心规则】:
      1. **输出格式**：严格输出 JSON。
      2. **人称视角**：叙述(narrative)使用**第二人称“你”**。玩家动作(action)必须使用**第一人称“我”**。
      3. **语言**：简体中文。
      4. **NPC认知限制（重要）**：除非主角主动自我介绍，否则**任何NPC都绝对不知道主角的名字**。即使NPC知道主角是“新来的”，也只能称呼为“陌生人”、“新来的”或“你”。
      
      【JSON字段规范】：
      - narrative: 纯粹的环境描写、动作发生和剧情推进。**不要包含NPC说话的具体内容**（说话内容放dialogue）。
      - speakerName: 说话者的名字（如“守卫”、“神秘老者”）。
      - dialogue: **【重要规则】仅包含说话的纯文本内容。**
         - ❌ 错误: "他低声说道：“快走！”" (包含了动作描写和引号)
         - ❌ 错误: "“快走！”" (包含了引号)
         - ✅ 正确: 快走！ (只包含口语文字)
      - options: 3个选项。
         - label: 按钮简短文本（如“拔剑”）。
         - action: 扩写后的动作描述。**必须使用“我”开头**。如果涉及说话，必须包含带双引号的台词（例如：我大喊：“住手！”）。

      【开场逻辑】：
      - 模式A (新访客)：主角刚抵达某地。NPC会上前引导，但**不知道主角名字**。
      - 模式B (苏醒/穿越)：主角突然醒来/穿越。周围人对主角感到陌生或困惑，**不知道主角名字/身份**。

      请生成开场。
    `;

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
                    action: { type: Type.STRING, description: "Expanded action starting with '我...'. MUST include spoken quotes (e.g. '我说道：“...”') if responding verbally." }
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
      // Send both the label and the expanded action to the AI for context
      const message = `玩家选择: [${optionData.label}]。详细动作描述: "${optionData.action}"。请根据此动作推进剧情。`;

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