import { Component, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { GameConfig, GameScene } from './models/game.model';
import { OpenAIService } from './services/openai.service';
import { ApiConfigService } from './services/api-config.service';
import { PersistenceService, SaveLoadError } from './services/persistence.service';
import { InventoryService } from './services/inventory.service';
import { SaveSlot } from './models/save-data.model';
import { SetupViewComponent } from './components/setup-view.component';
import { GameViewComponent } from './components/game-view.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SetupViewComponent, GameViewComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private openaiService = inject(OpenAIService);
  private apiConfigService = inject(ApiConfigService);
  private persistenceService = inject(PersistenceService);
  private inventoryService = inject(InventoryService);

  private uiError = signal<string | null>(null);

  // Computed signals that react to provider changes
  sceneHistory = computed<GameScene[]>(() => {
    const provider = this.apiConfigService.activeProvider();
    return provider === 'openai-compatible'
      ? this.openaiService.sceneHistory()
      : this.geminiService.sceneHistory();
  });

  isLoading = computed<boolean>(() => {
    const provider = this.apiConfigService.activeProvider();
    return provider === 'openai-compatible'
      ? this.openaiService.isLoading()
      : this.geminiService.isLoading();
  });

  error = computed<string | null>(() => {
    const provider = this.apiConfigService.activeProvider();
    const serviceError = provider === 'openai-compatible'
      ? this.openaiService.error()
      : this.geminiService.error();

    return this.uiError() ?? serviceError;
  });

  // Simple local state to switch views
  gameStarted = false;
  currentConfig: GameConfig | null = null;

  // Track last processed scene index to avoid duplicate processing
  private lastProcessedSceneIndex = -1;

  constructor() {
    // Effect to process grantedItems from LLM responses
    effect(() => {
      const history = this.sceneHistory();
      if (history.length === 0) return;

      const latestIndex = history.length - 1;
      // Only process if this is a new scene
      if (latestIndex <= this.lastProcessedSceneIndex) return;

      const latestScene = history[latestIndex];
      if (latestScene.grantedItems && latestScene.grantedItems.length > 0) {
        for (const itemName of latestScene.grantedItems) {
          const added = this.inventoryService.addItem(itemName);
          if (!added) {
            console.warn('Inventory full, could not add item:', itemName);
          }
        }
      }

      // Also confirm pending discards after LLM response
      if (this.inventoryService.hasPendingDiscards()) {
        this.inventoryService.confirmPendingDiscards();
      }

      this.lastProcessedSceneIndex = latestIndex;
    });
  }

  private get activeService() {
    return this.apiConfigService.activeProvider() === 'openai-compatible'
      ? this.openaiService
      : this.geminiService;
  }

  private setUiError(message: string | null) {
    this.uiError.set(message);
  }

  onStartGame(config: GameConfig) {
    this.setUiError(null);
    this.gameStarted = true;
    this.currentConfig = config;
    this.inventoryService.reset();
    this.lastProcessedSceneIndex = -1;
    this.activeService.startGame(config);
  }

  onPlayerAction(actionData: { label: string, action: string }) {
    // Build inventory context
    const inventoryContext = {
      favorites: this.inventoryService.getFavoriteNames(),
      allItems: this.inventoryService.getAllItemNames(),
      pendingDiscards: this.inventoryService.getPendingDiscardNames(),
      isFull: this.inventoryService.isFull()
    };

    this.activeService.makeChoice(actionData, inventoryContext);
  }

  onQuit() {
    this.setUiError(null);
    this.gameStarted = false;
    this.currentConfig = null;
    this.lastProcessedSceneIndex = -1;
    // Reset both services' history to ensure clean state
    this.geminiService.sceneHistory.set([]);
    this.openaiService.sceneHistory.set([]);
    this.inventoryService.reset();
  }

  async onSaveGame() {
    if (!this.currentConfig) return;

    try {
      this.setUiError(null);
      const context = await this.activeService.getContext();
      const slot: SaveSlot = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        summary: this.persistenceService.generateSummary(this.sceneHistory()),
        provider: this.apiConfigService.activeProvider(),
        gameConfig: this.currentConfig,
        sceneHistory: this.sceneHistory(),
        chatContext: context,
        inventory: this.inventoryService.export()
      };
      this.persistenceService.save(slot);
      // Optional: Add toast notification here
    } catch (err) {
      console.error('Save failed:', err);
      this.setUiError('保存失败，请稍后重试。');
    }
  }

  onLoadGame(slotId: string) {
    this.setUiError(null);

    try {
      const slot = this.persistenceService.load(slotId);

      // Switch provider if needed
      if (slot.provider !== this.apiConfigService.activeProvider()) {
        this.apiConfigService.setProvider(slot.provider);
      }

      const service = slot.provider === 'openai-compatible' ? this.openaiService : this.geminiService;

      this.currentConfig = slot.gameConfig;
      service.restoreSession(slot.sceneHistory, slot.chatContext, slot.gameConfig);

      // Restore inventory
      if (slot.inventory) {
        this.inventoryService.restore(slot.inventory);
      } else {
        this.inventoryService.reset();
      }

      this.lastProcessedSceneIndex = slot.sceneHistory.length - 1;
      this.gameStarted = true;
    } catch (err) {
      if (err instanceof SaveLoadError) {
        this.setUiError(err.message);
        return;
      }

      console.error('Load failed:', err);
      this.setUiError('读取存档失败，请稍后重试。');
    }
  }

  async onOverwriteGame(slotId: string) {
    if (!this.currentConfig) return;

    try {
      this.setUiError(null);
      const context = await this.activeService.getContext();
      const slot: SaveSlot = {
        id: slotId, // Reuse the existing slot ID
        timestamp: Date.now(),
        summary: this.persistenceService.generateSummary(this.sceneHistory()),
        provider: this.apiConfigService.activeProvider(),
        gameConfig: this.currentConfig,
        sceneHistory: this.sceneHistory(),
        chatContext: context,
        inventory: this.inventoryService.export()
      };
      this.persistenceService.save(slot);
    } catch (err) {
      console.error('Overwrite save failed:', err);
      this.setUiError('覆盖存档失败，请稍后重试。');
    }
  }

  onRetry() {
    if (this.activeService.retryLastAction) {
      this.activeService.retryLastAction();
    } else {
      console.warn('Current provider does not support retry');
    }
  }
}
