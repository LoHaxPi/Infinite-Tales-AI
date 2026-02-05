import { GameConfig, GameScene } from '../services/gemini.service';
import { InventoryItem } from './inventory.model';

/**
 * 存档槽元数据（用于列表显示）
 */
export interface SaveSlotMeta {
    id: string;
    timestamp: number;
    summary: string;
    provider: 'google-genai' | 'openai-compatible';
}

/**
 * 完整存档数据
 */
export interface SaveSlot extends SaveSlotMeta {
    gameConfig: GameConfig;        // 开局配置
    sceneHistory: GameScene[];     // UI历史（玩家看到的卡片列表）
    chatContext: any;              // AI上下文（Gemini: Content[], OpenAI: ChatMessage[]）
    inventory?: InventoryItem[];   // 物品栏数据
}
