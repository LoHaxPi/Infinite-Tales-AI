import { WritableSignal } from '@angular/core';
import { GameScene, GameConfig, GameOption } from '../models/game.model';

/**
 * Inventory context for AI requests
 */
export interface InventoryContext {
    favorites: string[];       // 收藏物品名称列表
    allItems?: string[];       // 全部物品（当物品栏满或有待丢弃时）
    pendingDiscards?: string[]; // 待丢弃物品名称列表
    isFull: boolean;           // 物品栏是否已满
}

/**
 * Result from world setting generation
 */
export interface WorldSettingResult {
    setting: string;           // 生成的世界观描述
    protagonist?: string;      // 生成的主角代号（仅当未提供时）
}

/**
 * Unified AI Service Interface
 * Both GeminiService and OpenAIService implement this interface
 */
export interface IAIService {
    /** Loading state signal */
    isLoading: WritableSignal<boolean>;

    /** Scene history signal */
    sceneHistory: WritableSignal<GameScene[]>;

    /** Error state signal */
    error: WritableSignal<string | null>;

    /**
     * Generate an expanded world setting from a simple description
     * @param theme Theme of the story
     * @param simpleSetting Simple description to expand
     * @param style Narrative style
     * @param protagonist Optional protagonist name - if empty, will generate one
     */
    generateWorldSetting(theme: string, simpleSetting: string, style: string, protagonist?: string): Promise<WorldSettingResult>;

    /**
     * Start a new game with the given configuration
     */
    startGame(config: GameConfig): Promise<void>;

    /**
     * Make a choice and advance the story
     * @param optionData The player's choice
     * @param inventoryContext Optional inventory context to include in the request
     */
    makeChoice(optionData: GameOption, inventoryContext?: InventoryContext): Promise<void>;

    /**
     * Retries the last action if it failed or needs to be re-evaluated.
     */
    retryLastAction?(): Promise<void>;

    /**
     * Get current chat context for saving
     */
    getContext(): Promise<any> | any;

    /**
     * Restore session from saved data
     */
    restoreSession(sceneHistory: GameScene[], chatContext: any, config?: GameConfig): void;
}

