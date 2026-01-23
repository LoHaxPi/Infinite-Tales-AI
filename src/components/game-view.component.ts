import { Component, input, output, signal, computed, effect, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameScene, GameOption } from '../services/gemini.service';

@Component({
  selector: 'app-game-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col max-w-4xl mx-auto relative">
      
      <!-- Background Mood/Ambience -->
      <div class="absolute inset-0 pointer-events-none opacity-20 transition-colors duration-1000 z-0"
           [style.background]="moodGradient()"></div>

      <!-- Header -->
      <header class="flex-none p-4 flex justify-between items-center z-10 border-b border-white/5 bg-gray-950/80 backdrop-blur-sm">
        <h2 class="text-sm font-bold tracking-widest text-gray-400 uppercase">互动故事</h2>
        <button (click)="onQuit()" class="text-xs text-red-400 hover:text-red-300 transition-colors">结束游戏</button>
      </header>

      <!-- Main Content Area (Scrollable History) -->
      <main #scrollContainer class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 z-10 scroll-smooth overscroll-contain">
        
        @for (sceneItem of history(); track $index; let isLast = $last) {
          <div class="scene-item space-y-6 fade-in scroll-mt-24">
            
            <!-- Narrative Text -->
            <div class="prose prose-invert prose-lg max-w-none">
              <p class="leading-relaxed text-gray-200 text-lg md:text-xl font-light">
                {{ sceneItem.narrative }}
              </p>
            </div>

            <!-- Character Dialogue Box -->
            @if (sceneItem.dialogue) {
              <div class="flex flex-col items-start gap-2 max-w-2xl mr-auto">
                 @if (sceneItem.speakerName) {
                   <span class="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30 uppercase tracking-wider">
                     {{ sceneItem.speakerName }}
                   </span>
                 }
                 <div class="relative bg-gray-800/80 border-l-4 border-indigo-500 p-6 rounded-r-xl rounded-bl-xl shadow-lg w-full">
                   <!-- Removed manual quotes around sceneItem.dialogue -->
                   <p class="text-white italic">{{ sceneItem.dialogue }}</p>
                 </div>
              </div>
            }

            <!-- User Choice Record (Bubble Style) -->
            @if (sceneItem.userChoice) {
              <div class="flex justify-end pl-12">
                <div class="bg-indigo-600/90 text-white px-6 py-4 rounded-2xl rounded-tr-none shadow-lg max-w-xl backdrop-blur-sm border border-indigo-500/30">
                  <p class="text-base md:text-lg font-light leading-relaxed">{{ sceneItem.userChoice }}</p>
                </div>
              </div>
            }

            <!-- Game Over -->
            @if (isLast && sceneItem.isGameOver) {
              <div class="py-12 text-center space-y-4 animate-in zoom-in duration-700">
                <h3 class="text-4xl font-black text-white tracking-widest uppercase">剧终</h3>
                <div class="h-1 w-20 bg-red-500 mx-auto rounded-full"></div>
                <button (click)="onQuit()" class="mt-8 px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  重新开始
                </button>
              </div>
            }
          </div>
        }
        
        <div class="h-16 md:h-24"></div>
      </main>

      <!-- Footer Controls -->
      <footer class="flex-none p-4 md:p-6 bg-gray-950/90 border-t border-white/10 z-20 backdrop-blur-xl">
        
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-8 space-y-4">
            <div class="flex gap-1">
              <div class="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
            <p class="text-xs text-gray-500 animate-pulse">命运编织中...</p>
          </div>
        } @else if (activeScene() && !activeScene()?.isGameOver) {
          <div class="space-y-4 max-w-3xl mx-auto">
            
            <!-- AI Options -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              @for (opt of activeScene()?.options; track $index) {
                <button 
                  (click)="handleChoice(opt)"
                  class="text-left p-4 rounded-xl bg-gray-800/50 hover:bg-indigo-600/20 border border-gray-700 hover:border-indigo-500/50 text-sm text-gray-200 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group h-full flex items-center"
                >
                  <!-- Display Label (Short) -->
                  <span class="group-hover:text-white transition-colors font-medium">
                    {{ opt.label }}
                  </span>
                </button>
              }
            </div>

            <!-- Custom Input -->
            <div class="relative group">
              <input 
                type="text" 
                [(ngModel)]="customAction" 
                (keydown.enter)="handleCustomAction()"
                placeholder="或者输入你的行动..." 
                class="w-full bg-gray-900 border border-gray-700 rounded-full px-6 py-3 pr-12 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
              />
              <button 
                (click)="handleCustomAction()"
                [disabled]="!customAction()"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              </button>
            </div>

          </div>
        }

      </footer>
    </div>
  `
})
export class GameViewComponent {
  history = input<GameScene[]>([]);
  loading = input<boolean>(false);
  
  choiceMade = output<string>(); // Emits a simple string for compatibility
  choiceMadeStructured = output<{label: string, action: string}>(); // Emits structured data to parent

  quitGame = output<void>();
  customAction = signal('');

  activeScene = computed(() => {
    const h = this.history();
    return h.length > 0 ? h[h.length - 1] : null;
  });

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor() {
    effect(() => {
      const len = this.history().length;
      setTimeout(() => {
        if (!this.scrollContainer?.nativeElement) return;
        const container = this.scrollContainer.nativeElement as HTMLElement;
        const sceneItems = container.querySelectorAll('.scene-item');
        if (sceneItems.length > 0) {
          sceneItems[sceneItems.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    });
  }

  moodGradient = computed(() => {
    const s = this.activeScene();
    if (!s || !s.backgroundMood) return 'radial-gradient(circle at center, #312e81 0%, transparent 70%)';
    return `radial-gradient(circle at top, ${s.backgroundMood} 0%, transparent 60%)`;
  });

  handleChoice(option: GameOption) {
    this.choiceMadeStructured.emit(option);
  }

  handleCustomAction() {
    const txt = this.customAction().trim();
    if (txt) {
      // For custom input, label and action are the same (or we could prefix '试图...')
      this.choiceMadeStructured.emit({ 
        label: txt, 
        action: `我决定：${txt}` 
      });
      this.customAction.set('');
    }
  }

  onQuit() {
    this.quitGame.emit();
  }
}