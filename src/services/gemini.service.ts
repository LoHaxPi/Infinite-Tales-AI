import { Injectable, signal, inject } from '@angular/core';
import { GoogleGenAI, Type, Chat, HarmCategory, HarmBlockThreshold, ThinkingLevel } from '@google/genai';
import { ApiConfigService } from './api-config.service';
import { IAIService } from './ai.interface';
import { buildSystemPrompt, buildGeminiResponseSchema } from './prompts';

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
  grantedItems?: string[]; // LLM赠送的新物品名称列表
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

    try {
      this.initAI();
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        config: {
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
        },
        contents: prompt,
      });
      console.log('Gemini Raw Response (World Setting):', response);

      const text = response.text || "";

      if (needsProtagonist) {
        // Try to parse JSON response
        try {
          // Extract JSON from possible markdown code blocks
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
      console.error("Setting Generation Error", e);
      throw new Error("世界观生成失败: " + e.message);
    }
  }

  async startGame(config: GameConfig) {
    this.isLoading.set(true);
    this.error.set(null);
    this.sceneHistory.set([]);

    const systemPrompt = buildSystemPrompt(config) + '\n\n生成开场场景。';

    try {
      this.initAI();
      this.chatSession = this.ai.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: buildGeminiResponseSchema(Type),
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

  async makeChoice(optionData: { label: string, action: string }, inventoryContext?: import('./ai.interface').InventoryContext) {
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

    // 2. Build the message with inventory context
    let message = `[${optionData.label}] ${optionData.action}`;

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
        message += '\n\n' + contextParts.join('\n');
      }
    }

    // 3. Process the turn
    await this.processTurn(message);
  }

  async retryLastAction() {
    if (!this.chatSession) return;

    const history = this.sceneHistory();
    if (history.length === 0) return;

    const lastScene = history[history.length - 1];
    if (!lastScene.userChoice) return;

    // Find the label for the user choice from options
    // This is a best-effort match since we stored the full action
    const options = lastScene.options || [];
    const matchedOption = options.find(opt => opt.action === lastScene.userChoice);
    const label = matchedOption ? matchedOption.label : 'Retry'; // Fallback label

    const message = `[${label}] ${lastScene.userChoice}`;
    await this.processTurn(message);
  }

  private async processTurn(message: string) {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const result = await this.chatSession!.sendMessage({ message });
      console.log('Gemini Raw Response (Process Turn):', result);
      const text = result.text;

      if (!text) throw new Error("No response from AI");

      const nextScene = JSON.parse(text) as GameScene;
      this.sceneHistory.update(history => [...history, nextScene]);

    } catch (e: any) {
      console.error("Turn Error", e);
      this.error.set("Failed to fetch"); // Use standardized error message as requested
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

    // 使用与 startGame 相同的系统提示
    const systemPrompt = buildSystemPrompt(config);

    // 使用历史记录创建新的聊天会话
    this.chatSession = this.ai.chats.create({
      model: this.modelName,
      history: chatContext, // 关键：注入保存的对话历史
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: buildGeminiResponseSchema(Type),
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