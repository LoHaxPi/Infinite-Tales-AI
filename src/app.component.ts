import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, GameConfig, GameScene } from './services/gemini.service';
import { OpenAIService } from './services/openai.service';
import { ApiConfigService } from './services/api-config.service';
import { PersistenceService } from './services/persistence.service';
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
    return provider === 'openai-compatible'
      ? this.openaiService.error()
      : this.geminiService.error();
  });

  // Simple local state to switch views
  gameStarted = false;
  currentConfig: GameConfig | null = null;

  private get activeService() {
    return this.apiConfigService.activeProvider() === 'openai-compatible'
      ? this.openaiService
      : this.geminiService;
  }

  onStartGame(config: GameConfig) {
    this.gameStarted = true;
    this.currentConfig = config;
    this.activeService.startGame(config);
  }

  onPlayerAction(actionData: { label: string, action: string }) {
    this.activeService.makeChoice(actionData);
  }

  onQuit() {
    this.gameStarted = false;
    this.currentConfig = null;
    // Reset both services' history to ensure clean state
    this.geminiService.sceneHistory.set([]);
    this.openaiService.sceneHistory.set([]);
  }

  async onSaveGame() {
    if (!this.currentConfig) return;

    try {
      const context = await this.activeService.getContext();
      const slot: SaveSlot = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        summary: this.persistenceService.generateSummary(this.sceneHistory()),
        provider: this.apiConfigService.activeProvider(),
        gameConfig: this.currentConfig,
        sceneHistory: this.sceneHistory(),
        chatContext: context
      };
      this.persistenceService.save(slot);
      // Optional: Add toast notification here
    } catch (err) {
      console.error('Save failed:', err);
    }
  }

  onLoadGame(slotId: string) {
    const slot = this.persistenceService.load(slotId);
    if (!slot) return;

    // Switch provider if needed
    if (slot.provider !== this.apiConfigService.activeProvider()) {
      // NOTE: Ideally we should switch provider here, but that might require UI reflection
      // For now we just warn or try to proceed if compatible (unlikely)
      console.warn('Loading save from different provider:', slot.provider);
      // Force switch? Or just let the user know?
      // For simple implementation, let's assume user manually switched or we just try:
      // this.apiConfigService.activeProvider.set(slot.provider); // If writable
    }

    this.currentConfig = slot.gameConfig;
    this.activeService.restoreSession(slot.sceneHistory, slot.chatContext, slot.gameConfig);
    this.gameStarted = true;
  }

  async onOverwriteGame(slotId: string) {
    if (!this.currentConfig) return;

    try {
      const context = await this.activeService.getContext();
      const slot: SaveSlot = {
        id: slotId, // Reuse the existing slot ID
        timestamp: Date.now(),
        summary: this.persistenceService.generateSummary(this.sceneHistory()),
        provider: this.apiConfigService.activeProvider(),
        gameConfig: this.currentConfig,
        sceneHistory: this.sceneHistory(),
        chatContext: context
      };
      this.persistenceService.save(slot);
    } catch (err) {
      console.error('Overwrite save failed:', err);
    }
  }
}
