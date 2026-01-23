import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameConfig } from '../services/gemini.service';

type TabMode = 'ai-gen' | 'manual-import';

@Component({
  selector: 'app-setup-view',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="flex flex-col gap-8 animate-in fade-in zoom-in duration-500">
      
      <!-- Title -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 tracking-tight">
          Infinite Tales
        </h1>
        <p class="text-gray-400 text-sm">由 Google Gemini 驱动的无限文字世界</p>
      </div>

      <!-- Main Card -->
      <div class="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        <!-- Tabs Header -->
        <div class="flex border-b border-white/5">
          <button 
            (click)="activeTab.set('ai-gen')"
            class="flex-1 py-4 text-sm font-medium transition-all relative"
            [class]="activeTab() === 'ai-gen' ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'"
          >
            文本生成
            @if(activeTab() === 'ai-gen') { 
              <div class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div> 
            }
          </button>
          
          <button 
            (click)="activeTab.set('manual-import')"
            class="flex-1 py-4 text-sm font-medium transition-all relative"
            [class]="activeTab() === 'manual-import' ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'"
          >
            规则导入
            @if(activeTab() === 'manual-import') { 
              <div class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div> 
            }
          </button>
        </div>

        <!-- Content Area -->
        <div class="p-6 md:p-8 space-y-6">
          
          @if (activeTab() === 'ai-gen') {
            <!-- Tab 1: AI Generation -->
            <div class="space-y-6 animate-in slide-in-from-left-2 fade-in duration-300">
              
              <div class="space-y-3">
                <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">世界背景描述</label>
                <div class="relative">
                  <textarea 
                    [(ngModel)]="aiPrompt"
                    class="w-full min-h-[160px] bg-black/20 border border-white/10 text-gray-100 p-4 rounded-xl text-base focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed placeholder-gray-600"
                    placeholder="描述你想要的世界... 例如：一个被海洋淹没的未来世界，人们生活在巨大的浮岛上，通过潜水寻找旧时代的遗物。"
                  ></textarea>
                </div>
              </div>

              <!-- Protagonist Shortcut -->
              <div class="space-y-3">
                <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">主角代号 (可选)</label>
                <input 
                  type="text" 
                  [(ngModel)]="protagonistName"
                  placeholder="默认: 旅人"
                  class="w-full bg-black/20 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-600"
                />
              </div>
            </div>

          } @else {
             <!-- Tab 2: Manual Import -->
             <div class="space-y-6 animate-in slide-in-from-right-2 fade-in duration-300">
                
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">核心主题</label>
                    <input 
                      type="text" 
                      [(ngModel)]="manualTheme" 
                      placeholder="如：废土" 
                      class="w-full bg-black/20 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-600"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">叙事风格</label>
                    <div class="relative">
                      <select 
                        [(ngModel)]="manualStyle" 
                        class="w-full bg-black/20 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Serious & Dark" class="bg-gray-900">严肃黑暗</option>
                        <option value="Humorous & Witty" class="bg-gray-900">幽默风趣</option>
                        <option value="Poetic & Descriptive" class="bg-gray-900">诗意描述</option>
                        <option value="Fast-paced & Action" class="bg-gray-900">快节奏动作</option>
                        <option value="Wuxia / Xianxia" class="bg-gray-900">武侠 / 仙侠</option>
                      </select>
                      <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">完整世界观设定</label>
                  <textarea 
                    [(ngModel)]="manualSetting"
                    class="w-full min-h-[120px] bg-black/20 border border-white/10 text-gray-100 p-4 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed placeholder-gray-600 custom-scrollbar"
                    placeholder="在此详细定义世界规则、势力分布、魔法/科技体系..."
                  ></textarea>
                </div>

                <div class="space-y-2">
                  <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">主角姓名</label>
                  <input 
                    type="text" 
                    [(ngModel)]="protagonistName"
                    placeholder="例如：V"
                    class="w-full bg-black/20 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-gray-600"
                  />
                </div>
             </div>
          }
        </div>

        <!-- Footer / Start Button -->
        <div class="p-6 bg-white/5 border-t border-white/5">
          <button 
            (click)="onStart()"
            [disabled]="activeTab() === 'ai-gen' ? !aiPrompt() : (!manualTheme() || !manualSetting() || !protagonistName())"
            class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 group"
          >
            <span>开始冒险</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
          
          <p class="mt-4 text-center text-xs text-gray-500">
            {{ activeTab() === 'ai-gen' ? 'AI 将根据描述自动生成详细设定' : '将使用您提供的精确设定' }}
          </p>
        </div>

      </div>
    </div>
  `
})
export class SetupViewComponent {
  startGame = output<GameConfig>();

  activeTab = signal<TabMode>('ai-gen');

  // AI Gen Mode Data
  aiPrompt = signal('');
  
  // Manual Mode Data
  manualTheme = signal('');
  manualStyle = signal('Serious & Dark');
  manualSetting = signal('');

  // Shared Data
  protagonistName = signal('');

  onStart() {
    const pName = this.protagonistName() || '旅人';

    if (this.activeTab() === 'ai-gen') {
      // In AI mode, we pass the prompt as the setting and let the AI figure out the theme/style
      this.startGame.emit({
        theme: 'AI Generated', // Will be inferred by context
        style: 'Adaptive',     // Will be inferred
        setting: this.aiPrompt(),
        protagonist: pName
      });
    } else {
      // Manual mode
      this.startGame.emit({
        theme: this.manualTheme(),
        style: this.manualStyle(),
        setting: this.manualSetting(),
        protagonist: pName
      });
    }
  }
}