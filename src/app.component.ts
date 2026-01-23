import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, GameConfig } from './services/gemini.service';
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

  // Expose signals to template
  sceneHistory = this.geminiService.sceneHistory; 
  isLoading = this.geminiService.isLoading;
  error = this.geminiService.error;

  // Simple local state to switch views
  gameStarted = false;

  onStartGame(config: GameConfig) {
    this.gameStarted = true;
    this.geminiService.startGame(config);
  }

  onPlayerAction(actionData: {label: string, action: string}) {
    this.geminiService.makeChoice(actionData);
  }

  onQuit() {
    this.gameStarted = false;
    this.geminiService.sceneHistory.set([]);
  }
}