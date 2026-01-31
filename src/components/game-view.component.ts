import { Component, input, output, signal, computed, effect, ElementRef, ViewChild, HostListener, inject, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameScene, GameOption } from '../services/gemini.service';
import { PersistenceService } from '../services/persistence.service';
import { SaveSlotMeta } from '../models/save-data.model';
import { SaveLoadModalComponent } from './save-load-modal.component';

@Component({
  selector: 'app-game-view',
  standalone: true,
  imports: [CommonModule, FormsModule, SaveLoadModalComponent],
  template: `
    <div class="h-full w-full flex flex-col relative overflow-hidden bg-gray-950 text-gray-200 font-sans">
      
      <!-- Ambient Background -->
      <div class="absolute inset-0 pointer-events-none opacity-20 transition-colors duration-1000 z-0"
           [style.background]="moodGradient()"></div>

      <!-- Header -->
      <header class="flex-none flex items-center justify-between border-b border-white/5 px-6 py-4 bg-gray-950/80 backdrop-blur-md z-40">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <h1 class="text-xs font-medium tracking-[0.2em] uppercase text-gray-400">Infinite Tales</h1>
        </div>
        <div class="flex items-center gap-4">
          <button (click)="onSave()" class="text-xs text-gray-500 hover:text-indigo-400 transition-colors tracking-widest uppercase flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            保存
          </button>
          <button (click)="showLoadModal.set(true)" class="text-xs text-gray-500 hover:text-indigo-400 transition-colors tracking-widest uppercase flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            读档
          </button>
          <button (click)="onQuit()" class="text-xs text-gray-500 hover:text-red-400 transition-colors tracking-widest uppercase">
            结束
          </button>
        </div>
      </header>

      <!-- Main History Area -->
      <!-- Removed scroll-smooth class to avoid conflict with JS scrollTo -->
      <main #scrollContainer 
        (scroll)="checkScrollPosition()"
        class="flex-1 overflow-y-auto p-6 z-10 custom-scrollbar pb-32">
        <div class="max-w-3xl mx-auto flex flex-col gap-10">
          
          @for (sceneItem of history(); track $index; let isLast = $last) {
            
            <div class="scene-item flex flex-col gap-10">
              <!-- Narrative / AI Output -->
              <div class="flex flex-col gap-2 fade-in">

                <div class="bg-gray-900/60 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                  <p class="text-lg md:text-xl font-light leading-relaxed text-gray-200">
                    {{ sceneItem.narrative }}
                  </p>
                  @if (sceneItem.dialogue) {
                    <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-indigo-400/60 ml-1 block mt-4">
                      {{ sceneItem.speakerName || 'The Universe' }}
                    </span>
                    <p class="text-indigo-200 italic border-l-2 border-indigo-500 pl-4 py-1">
                      "{{ sceneItem.dialogue }}"
                    </p>
                  }
                </div>
              </div>

              <!-- User Choice Record (If made) -->
              @if (sceneItem.userChoice) {
                <div class="flex flex-col gap-2 items-end fade-in">
                  <div class="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-[90%] md:max-w-[80%] text-right">
                    <p class="text-base font-light text-gray-300">
                      {{ extractNarrative(sceneItem.userChoice) }}
                    </p>
                    @if (extractDialogue(sceneItem.userChoice)) {
                      <p class="text-pink-200 italic border-r-2 border-pink-500 pr-4 py-1 mt-4 text-right">
                        "{{ extractDialogue(sceneItem.userChoice) }}"
                      </p>
                    }
                  </div>
                </div>
              }

              <!-- Game Over State -->
              @if (isLast && sceneItem.isGameOver) {
                 <div class="py-12 text-center space-y-4 animate-in zoom-in duration-700">
                   <h3 class="text-3xl font-thin text-white tracking-[0.5em] uppercase">Fate Sealed</h3>
                   <button (click)="onQuit()" class="mt-8 px-6 py-2 border border-white/20 hover:bg-white/10 rounded-full text-sm text-gray-300 transition-all">
                     Begin Anew
                   </button>
                 </div>
              }
            </div>
          }
           <!-- Spacer for footer -->
           <div class="h-32"></div>
        </div>
      </main>

      <!-- Scroll to Bottom Button -->
      <!-- Only show if history has length and we are not near bottom -->
      @if (showScrollButton()) {
        <button 
          (click)="scrollToBottom(true)"
          class="fixed bottom-24 right-8 z-40 p-3 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-full shadow-lg backdrop-blur transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group border border-indigo-400/30 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-y-0.5 transition-transform"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        </button>
      }

      <!-- Fixed Footer Interaction Area -->
      @if (loading()) {
        <div class="fixed bottom-0 left-0 w-full z-50 p-6 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
           <div class="max-w-3xl mx-auto text-center">
             <span class="text-xs text-indigo-400/50 animate-pulse tracking-widest">WEAVING DESTINY...</span>
           </div>
        </div>
      } @else if (activeScene() && !activeScene()?.isGameOver) {
        <div class="fixed bottom-0 left-0 w-full z-50 pt-20 pb-8 px-6 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pointer-events-none">
          <div class="max-w-2xl mx-auto space-y-3 pointer-events-auto">
            
            <!-- Choices List -->
            @for (opt of activeScene()?.options; track $index) {
              <button 
                (click)="handleChoice(opt)"
                class="group flex w-full items-center justify-between p-4 rounded-xl border border-white/10 bg-gray-900/90 hover:bg-gray-800 hover:border-indigo-500/30 transition-all duration-200 backdrop-blur-xl shadow-lg"
              >
                <div class="flex items-center gap-5">
                  <span class="text-[10px] font-mono font-bold text-gray-600 group-hover:text-indigo-400 transition-colors border border-gray-700/50 rounded px-1.5 py-0.5">
                    {{ $index + 1 }}
                  </span>
                  <span class="text-sm md:text-base font-medium tracking-wide text-gray-300 group-hover:text-white text-left">
                    {{ opt.label }}
                  </span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            }

            <!-- Custom Input -->
            <div class="pt-2 flex items-center gap-3">
              <input 
                type="text" 
                [(ngModel)]="customAction" 
                (keydown.enter)="handleCustomAction()"
                placeholder="Make your own path..." 
                class="flex-1 h-11 bg-white/5 border border-white/10 rounded-full px-6 text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600 focus:outline-none"
              />
              <button 
                (click)="handleCustomAction()"
                [disabled]="!customAction()"
                class="flex size-11 items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- Save Modal -->
      @if (showSaveModal()) {
        <app-save-load-modal mode="save" (close)="showSaveModal.set(false)" (save)="onSaveConfirm()" (overwrite)="onOverwriteConfirm($event)"></app-save-load-modal>
      }

      <!-- Load Modal -->
      @if (showLoadModal()) {
        <app-save-load-modal mode="load" (close)="showLoadModal.set(false)" (load)="onLoad($event)"></app-save-load-modal>
      }

    </div>
  `,
})
export class GameViewComponent {
  history = input<GameScene[]>([]);
  loading = input<boolean>(false);

  choiceMade = output<string>(); // Emits a simple string for compatibility
  choiceMadeStructured = output<{ label: string, action: string }>(); // Emits structured data to parent

  quitGame = output<void>();
  saveGame = output<void>();
  loadGame = output<string>();
  overwriteGame = output<string>();

  persistenceService = inject(PersistenceService);
  showLoadModal = signal(false);
  showSaveModal = signal(false);
  customAction = signal('');
  showScrollButton = signal(false);

  // Track if we should auto-scroll
  private isNearBottom = true;

  activeScene = computed(() => {
    const h = this.history();
    return h.length > 0 ? h[h.length - 1] : null;
  });

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor() {
    effect(() => {
      // Trigger when history changes
      const len = this.history().length;

      // We use a timeout to let the DOM update first
      setTimeout(() => {
        // Only scroll if we were near bottom logic says so
        if (this.isNearBottom) {
          this.scrollToBottom(false);
        }
      }, 100);
    });
  }

  checkScrollPosition() {
    if (!this.scrollContainer?.nativeElement) return;
    const element = this.scrollContainer.nativeElement as HTMLElement;

    // Calculate distance from bottom
    const threshold = 150; // pixels from bottom to consider "near"
    const position = element.scrollTop + element.clientHeight;
    const height = element.scrollHeight;

    // Check if we are near bottom
    // We allow a small error margin for float calculation diffs
    this.isNearBottom = position >= height - threshold;

    // Show button if NOT near bottom
    this.showScrollButton.set(!this.isNearBottom && this.history().length > 1);
  }

  scrollToBottom(smooth: boolean = true) {
    if (!this.scrollContainer?.nativeElement) return;
    const element = this.scrollContainer.nativeElement as HTMLElement;

    try {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } catch (err) {
      // Fallback
      element.scrollTop = element.scrollHeight;
    }
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

  onSave() {
    this.showSaveModal.set(true);
  }

  onSaveConfirm() {
    this.saveGame.emit();
    this.showSaveModal.set(false);
  }

  onOverwriteConfirm(slotId: string) {
    this.overwriteGame.emit(slotId);
    this.showSaveModal.set(false);
  }

  onLoad(slotId: string) {
    this.loadGame.emit(slotId);
    this.showLoadModal.set(false);
  }

  onDeleteSave(slotId: string) {
    this.persistenceService.delete(slotId);
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.loading()) return;

    // Ignore if typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = event.key;
    const num = parseInt(key);

    // Handle 1-9 for choices
    if (!isNaN(num) && num >= 1 && num <= 9) {
      const scene = this.activeScene();
      if (scene && scene.options && scene.options.length >= num) {
        this.handleChoice(scene.options[num - 1]);
      }
    }
  }

  /**
   * Extract dialogue content (text inside quotes) from user choice.
   * Supports Chinese quotes「」and regular quotes ""
   */
  extractDialogue(text: string): string {
    // Match Chinese quotes「...」or "..." or "..."
    const chineseQuoteMatch = text.match(/「([^」]+)」/);
    if (chineseQuoteMatch) return chineseQuoteMatch[1];

    const smartQuoteMatch = text.match(/"([^"]+)"/);
    if (smartQuoteMatch) return smartQuoteMatch[1];

    const regularQuoteMatch = text.match(/"([^"]+)"/);
    if (regularQuoteMatch) return regularQuoteMatch[1];

    return '';
  }

  /**
   * Extract narrative content (text outside quotes) from user choice.
   */
  extractNarrative(text: string): string {
    // Remove dialogue parts (content in quotes including the quotes)
    return text
      .replace(/「[^」]+」/g, '')
      .replace(/"[^"]+"/g, '')
      .replace(/"[^"]+"/g, '')
      .trim();
  }
}