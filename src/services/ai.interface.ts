import { WritableSignal } from '@angular/core';
import { GameScene, GameConfig, GameOption } from './gemini.service';

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
     */
    generateWorldSetting(theme: string, simpleSetting: string, style: string): Promise<string>;

    /**
     * Start a new game with the given configuration
     */
    startGame(config: GameConfig): Promise<void>;

    /**
     * Make a choice and advance the story
     */
    makeChoice(optionData: GameOption): Promise<void>;

    /**
     * Get current chat context for saving
     */
    getContext(): Promise<any> | any;

    /**
     * Restore session from saved data
     */
    restoreSession(sceneHistory: GameScene[], chatContext: any, config?: GameConfig): void;
}

