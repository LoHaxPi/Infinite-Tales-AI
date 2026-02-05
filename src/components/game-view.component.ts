import { Component, input, output, signal, computed, effect, ElementRef, ViewChild, HostListener, inject, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameScene, GameOption } from '../services/gemini.service';
import { PersistenceService } from '../services/persistence.service';
import { SaveSlotMeta } from '../models/save-data.model';
import { SaveLoadModalComponent } from './save-load-modal.component';
import { ApiSettingsModalComponent } from './api-settings-modal.component';

@Component({
  selector: 'app-game-view',
  standalone: true,
  imports: [CommonModule, FormsModule, SaveLoadModalComponent, ApiSettingsModalComponent],
  template: `
    <div class="h-full w-full flex flex-col relative overflow-hidden bg-gray-950 text-gray-200" style="font-family: 'Source Han Sans CN', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;">
      
      <!-- Ambient Background -->
      <div class="absolute inset-0 pointer-events-none opacity-20 transition-colors duration-1000 z-0"
           [style.background]="moodGradient()"></div>

      <!-- Header -->
      <header class="flex-none flex items-center justify-between border-b border-white/5 px-6 py-4 bg-gray-950/80 backdrop-blur-md z-40">
        <div class="flex items-center gap-3">
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
          <button (click)="showSettings.set(true)" class="text-xs text-gray-500 hover:text-indigo-400 transition-colors tracking-widest uppercase flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            设置
          </button>
        </div>
      </header>

      <!-- Main Container with Sidebar -->
      <div class="flex-1 flex overflow-hidden">
        
        <!-- Left Status Sidebar -->
        <aside class="flex-none w-[20%] flex flex-col gap-4 p-6 pr-4 z-30 overflow-y-auto border-r border-white/5 bg-gray-900/10">
          
          @if (activeScene()?.currentLocation) {
            <div class="rounded-2xl p-6 bg-gradient-to-br from-indigo-500/40 to-indigo-700/50 border border-indigo-400/30 shadow-lg shadow-indigo-500/10 transition-all hover:scale-[1.02] duration-300">
              <div class="flex items-center gap-2.5 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-300"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span class="text-xs uppercase tracking-widest text-indigo-200/90 font-semibold">位置</span>
              </div>
              <p class="text-lg text-white font-medium leading-relaxed">{{ activeScene()?.currentLocation }}</p>
            </div>
          }
          
          @if (activeScene()?.currentTime) {
            <div class="rounded-2xl p-6 bg-gradient-to-br from-amber-500/35 to-orange-600/45 border border-amber-400/30 shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] duration-300">
              <div class="flex items-center gap-2.5 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-300"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="text-xs uppercase tracking-widest text-amber-200/90 font-semibold">时间</span>
              </div>
              <p class="text-lg text-white font-medium leading-relaxed">{{ activeScene()?.currentTime }}</p>
            </div>
          }
          
          @if (activeScene()?.currencyUnit) {
            <div class="rounded-2xl p-6 bg-gradient-to-br from-yellow-500/35 to-yellow-700/45 border border-yellow-400/30 shadow-lg shadow-yellow-500/10 transition-all hover:scale-[1.02] duration-300">
              <div class="flex items-center gap-2.5 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-300"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                <span class="text-xs uppercase tracking-widest text-yellow-200/90 font-semibold">{{ activeScene()?.currencyUnit }}</span>
              </div>
              <p class="text-3xl text-white font-bold tracking-tight">{{ activeScene()?.currencyAmount ?? 0 }}</p>
            </div>
          }

        </aside>

        <!-- Main History Area -->
        <!-- Removed scroll-smooth class to avoid conflict with JS scrollTo -->
        <main #scrollContainer 
          (scroll)="checkScrollPosition()"
          class="flex-none w-[60%] overflow-y-auto p-8 z-10 custom-scrollbar pb-64 border-r border-white/5">
        <div class="max-w-3xl mx-auto flex flex-col gap-10">
          
          @for (sceneItem of history(); track $index; let isLast = $last) {
            
            <div class="scene-item flex flex-col gap-10">
              <!-- Narrative / AI Output -->
              <div class="flex flex-col gap-2 fade-in">

                <div class="bg-gray-900/60 border border-white/5 rounded-2xl p-8 shadow-xl backdrop-blur-md">
                  <p class="text-base md:text-lg font-light leading-loose text-gray-300 tracking-wide">
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

        <!-- Right Sidebar (Notifications) -->
        <aside class="flex-none w-[20%] p-6 z-30 overflow-hidden flex flex-col gap-4 bg-gray-900/10">
          
          @if (notifications().length > 0) {
             <div class="flex items-center gap-2 mb-2 pb-2 border-b border-white/5 mx-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
               <span class="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Recent Updates</span>
             </div>

             <div class="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
               @for (note of notifications(); track $index) {
                 <div class="group relative pl-4 border-l-2 border-white/10 hover:border-indigo-500/50 transition-colors py-1 animate-in slide-in-from-top-2 fade-in duration-500"
                      [class.border-l-indigo-500]="$index === 0"
                 >
                    <h4 class="text-xs font-semibold text-gray-400 group-hover:text-indigo-300 transition-colors mb-0.5">{{ note.title }}</h4>
                    <p class="text-xs text-gray-500 group-hover:text-gray-400 leading-normal">{{ note.desc }}</p>
                 </div>
               }
             </div>
          }

        </aside>

      </div>

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
        <div class="fixed bottom-0 left-[20%] w-[60%] z-50 pt-24 pb-10 px-8 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent pointer-events-none">
          <div class="max-w-3xl mx-auto space-y-4 pointer-events-auto">
            
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

      @if (showLoadModal()) {
        <app-save-load-modal mode="load" (close)="showLoadModal.set(false)" (load)="onLoad($event)"></app-save-load-modal>
      }

      @if (showSettings()) {
        <app-api-settings-modal (close)="showSettings.set(false)"></app-api-settings-modal>
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
  showSettings = signal(false);
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

  notifications = computed(() => {
    const history = this.history();
    const alerts: { title: string, desc: string, type: 'location' | 'currency' }[] = [];

    // Reverse iterate to show newest first, but we compare i with i-1
    // Actually user wants newest on top. So we iterate forward and unshift?
    // Or just iterate normally and reverse at the end.
    // Let's iterate forward to track state changes, then reverse for display.

    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const prev = history[i - 1];

      // Ensure we are not comparing the same scene due to some re-render issue, though index check prevents this

      // Location Change (Ignore time)
      if (current.currentLocation && prev.currentLocation && current.currentLocation !== prev.currentLocation) {
        alerts.push({
          title: '位置变更',
          desc: `抵达 ${current.currentLocation}`,
          type: 'location'
        });
      }

      // Currency Change
      if (current.currencyAmount !== undefined && prev.currencyAmount !== undefined) {
        const diff = current.currencyAmount - prev.currencyAmount;
        if (diff !== 0) {
          const sign = diff > 0 ? '+' : '';
          alerts.push({
            title: '资金变动',
            desc: `${sign}${diff} ${current.currencyUnit || ''}`,
            type: 'currency'
          });
        }
      }
    }

    return alerts.reverse(); // Newest (latest history index) on top
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