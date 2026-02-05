import { Injectable, signal, inject } from '@angular/core';
import { GoogleGenAI, Type, Chat, HarmCategory, HarmBlockThreshold, ThinkingLevel } from '@google/genai';
import { ApiConfigService } from './api-config.service';
import { IAIService } from './ai.interface';
import { buildGameSchemaForGemini, buildGameSystemPrompt, parseAndValidateGameScene } from './prompt-builder';

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
  currencyUnit?: string; // 货币单位（如"金币"、"灵石"）
  currencyAmount?: number; // 货币数量
  currentLocation?: string; // 主角当前位置
  currentTime?: string; // 当前位置时间
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

    const systemPrompt = buildGameSystemPrompt(config, 'start');

    try {
      this.initAI();
      this.chatSession = this.ai.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: buildGameSchemaForGemini(Type),
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

      const scene = parseAndValidateGameScene(text);
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

      const nextScene = parseAndValidateGameScene(text);
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
    const systemPrompt = buildGameSystemPrompt(config, 'restore');

    // 使用历史记录创建新的聊天会话
    this.chatSession = this.ai.chats.create({
      model: this.modelName,
      history: chatContext, // 关键：注入保存的对话历史
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: buildGameSchemaForGemini(Type),
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