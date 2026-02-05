import { Component, output, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameConfig } from '../models/game.model';
import { ApiConfigService, AIProvider, ModelConfig, HeaderTemplate, StyleTemplate } from '../services/api-config.service';
import { SaveLoadModalComponent } from './save-load-modal.component';
import { ApiSettingsModalComponent } from './api-settings-modal.component';

type SettingsView = 'main' | 'add-model' | 'manage-headers';

@Component({
  selector: 'app-setup-view',
  standalone: true,
  imports: [FormsModule, CommonModule, SaveLoadModalComponent, ApiSettingsModalComponent],
  template: `
    <div class="flex flex-col gap-8 animate-in fade-in zoom-in duration-500">
      
      <!-- Title -->
      <div class="text-center space-y-2 relative">
        <h1 class="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 tracking-tight">
          Infinite Tales
        </h1>
        <p class="text-gray-400 text-sm">由 AI 驱动的无限文字世界</p>
        
        <!-- Settings Button -->
        <button 
          (click)="showSettings.set(true)"
          class="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          title="API 设置"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>

      <!-- Main Card -->
      <div class="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        <!-- Content Area -->
        <div class="p-6 md:p-8 space-y-8">
          
          <!-- World Generation Form -->
          <div class="animate-in slide-in-from-left-2 fade-in duration-300">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <!-- Left Col: World Description (Takes up 2 cols on desktop) -->
              <div class="lg:col-span-2 space-y-4 flex flex-col">
                <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">世界背景描述</label>
                <div class="flex-1 min-h-[160px]">
                  <textarea 
                    [(ngModel)]="aiPrompt"
                    class="w-full h-full bg-black/20 border border-white/10 text-gray-100 p-6 rounded-2xl text-base focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed placeholder-gray-600 custom-scrollbar shadow-inner"
                    placeholder="描述你想要的世界... 例如：一个被海洋淹没的未来世界，人们生活在巨大的浮岛上，通过潜水寻找旧时代的遗物。"
                  ></textarea>
                </div>
              </div>

              <!-- Right Col: Protagonist & Options -->
              <div class="space-y-8">
                <!-- Protagonist Shortcut -->
                <div class="space-y-4">
                  <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">主角代号 (可选)</label>
                  <input 
                    type="text" 
                    [(ngModel)]="protagonistName"
                    placeholder="默认: 旅人"
                    class="w-full bg-black/20 border border-white/10 text-white px-5 py-4 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-600"
                  />
                </div>
                <!-- Style Selection -->
                <div class="space-y-4">
                  <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">叙事风格 (可选)</label>
                  <button 
                    (click)="showStyleModal.set(true)"
                    class="w-full bg-black/20 border border-white/10 text-left px-5 py-4 rounded-xl hover:border-indigo-500/50 transition-all group"
                  >
                    @if (selectedStyle()) {
                      <span class="text-white">{{ selectedStyle()!.name }}</span>
                      <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ selectedStyle()!.content }}</p>
                    } @else {
                      <span class="text-gray-500 group-hover:text-gray-400">点击选择风格...</span>
                      <p class="text-xs text-gray-600 mt-1">留空则由 AI 根据背景自动匹配</p>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-4">
            <button 
              (click)="showLoadModal.set(true)"
              class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl transition-all border border-white/10 hover:border-white/20 hover:text-white"
            >
              读取存档
            </button>

            <button 
              (click)="onStart()"
              [disabled]="!apiConfig.isConfigured()"
              class="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:shadow-none text-base tracking-wide"
            >
              @if(!apiConfig.isConfigured()) {
                请先配置 API
              } @else {
                开始冒险
              }
            </button>
          </div>

          <!-- Load Modal -->
          @if (showLoadModal()) {
            <app-save-load-modal mode="load" (close)="showLoadModal.set(false)" (load)="onLoad($event)"></app-save-load-modal>
          }

        </div>
      </div>

      <!-- Style Selection Modal -->
      @if (showStyleModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" (click)="showStyleModal.set(false)">
          <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col" (click)="$event.stopPropagation()">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-4 border-b border-white/10">
              <h2 class="text-lg font-semibold text-white">选择叙事风格</h2>
              <button (click)="showStyleModal.set(false)" class="p-1 text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3">
              <!-- Clear Selection Option -->
              <button 
                (click)="selectStyle(null)"
                class="w-full p-4 rounded-xl border transition-all text-left"
                [class]="!selectedStyleId() ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-black/30 border-white/10 hover:border-white/20'"
              >
                <div class="flex items-center gap-3">
                  <div class="flex-1">
                    <h3 class="text-base font-semibold text-white">自动匹配</h3>
                    <p class="text-xs text-gray-400 mt-0.5">由 AI 根据世界背景自动推断最合适的叙事风格</p>
                  </div>
                  @if (!selectedStyleId()) {
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400"><polyline points="20 6 9 17 4 12"/></svg>
                  }
                </div>
              </button>

              <!-- Style Templates -->
              @for (style of apiConfig.styleTemplates(); track style.id) {
                <button 
                  (click)="selectStyle(style)"
                  class="w-full p-4 rounded-xl border transition-all text-left group relative"
                  [class]="selectedStyleId() === style.id ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-black/30 border-white/10 hover:border-white/20'"
                >
                  <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                      <h3 class="text-base font-semibold text-white">{{ style.name }}</h3>
                      <p class="text-xs text-gray-400 mt-1 leading-relaxed">{{ style.content }}</p>
                    </div>
                    @if (selectedStyleId() === style.id) {
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    }
                  </div>
                  <!-- Delete button for user-created styles -->
                  @if (!style.isBuiltIn) {
                    <button 
                      (click)="removeStyle(style.id, $event)"
                      class="absolute top-2 right-2 p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除风格"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  }
                </button>
              }
            </div>

            <!-- Add New Style Section -->
            <div class="p-4 border-t border-white/10 space-y-3">
              @if (showAddStyleForm()) {
                <div class="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                  <input 
                    type="text" 
                    [(ngModel)]="newStyleName"
                    placeholder="风格名称"
                    class="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all placeholder-gray-600 text-sm"
                  />
                  <textarea 
                    [(ngModel)]="newStyleContent"
                    placeholder="风格描述（描述这种风格的特点、氛围、叙事特色等）"
                    class="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all placeholder-gray-600 text-sm h-20 resize-none"
                  ></textarea>
                  <div class="flex gap-2">
                    <button 
                      (click)="showAddStyleForm.set(false); newStyleName = ''; newStyleContent = '';"
                      class="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-all"
                    >
                      取消
                    </button>
                    <button 
                      (click)="saveNewStyle()"
                      [disabled]="!newStyleName.trim() || !newStyleContent.trim()"
                      class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
                    >
                      保存
                    </button>
                  </div>
                </div>
              } @else {
                <button 
                  (click)="showAddStyleForm.set(true)"
                  class="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  新建风格
                </button>
              }
            </div>
          </div>
        </div>
      }

      @if (showSettings()) {
        <app-api-settings-modal (close)="showSettings.set(false)"></app-api-settings-modal>
      }
    </div>
  `
})
export class SetupViewComponent {
  private apiConfigService = inject(ApiConfigService);

  startGame = output<GameConfig>();
  loadGame = output<string>();

  // AI Gen Mode Data
  aiPrompt = signal('');

  // Shared Data
  protagonistName = signal('');

  // Settings Modal State
  showSettings = signal(false);
  showLoadModal = signal(false);

  // Style selection state
  showStyleModal = signal(false);
  showAddStyleForm = signal(false);
  selectedStyleId = signal<string | null>(null);
  newStyleName = signal('');
  newStyleContent = signal('');

  // Computed: selected style object
  selectedStyle = computed(() => {
    const styleId = this.selectedStyleId();
    if (!styleId) return null;
    return this.apiConfigService.styleTemplates().find(s => s.id === styleId) || null;
  });

  // Expose apiConfig for template binding
  apiConfig = this.apiConfigService;

  onLoad(id: string) {
    this.loadGame.emit(id);
    this.showLoadModal.set(false);
  }

  removeHeaderTemplate(templateId: string) {
    this.apiConfigService.removeHeaderTemplate(templateId);
  }

  // Style selection methods
  selectStyle(style: StyleTemplate | null) {
    this.selectedStyleId.set(style?.id || null);
    this.showStyleModal.set(false);
  }

  removeStyle(styleId: string, event: Event) {
    event.stopPropagation();
    this.apiConfigService.removeStyleTemplate(styleId);
    // Clear selection if currently selected style was removed
    if (this.selectedStyleId() === styleId) {
      this.selectedStyleId.set(null);
    }
  }

  saveNewStyle() {
    if (!this.newStyleName().trim() || !this.newStyleContent().trim()) return;

    const newStyle: StyleTemplate = {
      id: Date.now().toString(),
      name: this.newStyleName().trim(),
      content: this.newStyleContent().trim(),
      isBuiltIn: false
    };

    this.apiConfigService.addStyleTemplate(newStyle);
    this.newStyleName.set('');
    this.newStyleContent.set('');
    this.showAddStyleForm.set(false);
  }

  onStart() {
    // Get style content - if no style selected, use 'Adaptive' for AI to infer
    const styleContent = this.selectedStyle()?.content || 'Adaptive';

    this.startGame.emit({
      theme: 'AI Generated',
      style: styleContent,
      setting: this.aiPrompt(),
      protagonist: this.protagonistName().trim() // 空则由AI生成
    });
  }
}