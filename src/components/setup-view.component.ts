import { Component, output, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameConfig } from '../services/gemini.service';
import { ApiConfigService, AIProvider, ModelConfig, HeaderTemplate, StyleTemplate } from '../services/api-config.service';
import { SaveLoadModalComponent } from './save-load-modal.component';

type TabMode = 'ai-gen' | 'manual-import';
type SettingsView = 'main' | 'add-model' | 'manage-headers';

@Component({
  selector: 'app-setup-view',
  standalone: true,
  imports: [FormsModule, CommonModule, SaveLoadModalComponent],
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
            <div class="animate-in slide-in-from-left-2 fade-in duration-300">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Left Col: World Description (Takes up 2 cols on desktop) -->
                <div class="lg:col-span-2 space-y-3">
                  <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">世界背景描述</label>
                  <div class="relative h-full">
                    <textarea 
                      [(ngModel)]="aiPrompt"
                      class="w-full h-40 lg:h-full min-h-[160px] bg-black/20 border border-white/10 text-gray-100 p-4 rounded-xl text-base focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed placeholder-gray-600"
                      placeholder="描述你想要的世界... 例如：一个被海洋淹没的未来世界，人们生活在巨大的浮岛上，通过潜水寻找旧时代的遗物。"
                    ></textarea>
                  </div>
                </div>

                <!-- Right Col: Protagonist & Options -->
                <div class="space-y-6">
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
                  <!-- Style Selection -->
                  <div class="space-y-3">
                    <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">叙事风格 (可选)</label>
                    <button 
                      (click)="showStyleModal.set(true)"
                      class="w-full bg-black/20 border border-white/10 text-left px-4 py-3 rounded-xl hover:border-indigo-500/50 transition-all group"
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
          } @else {
            <!-- Tab 2: Manual Import -->
            <div class="animate-in slide-in-from-right-2 fade-in duration-300 space-y-5">
              <!-- Import Instructions -->
              <div class="space-y-3">
                <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">世界设定文本</label>
                <textarea 
                  [(ngModel)]="manualSetting"
                  class="w-full h-48 bg-black/20 border border-white/10 text-gray-100 p-4 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed placeholder-gray-600 font-mono"
                  placeholder="粘贴你的世界设定文本... 支持自定义规则、角色描述、背景故事等。"
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">主题</label>
                  <input 
                    type="text" 
                    [(ngModel)]="manualTheme"
                    placeholder="例如：赛博朋克"
                    class="w-full bg-black/20 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder-gray-600"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">主角代号</label>
                  <input 
                    type="text" 
                    [(ngModel)]="protagonistName"
                    placeholder="默认: 旅人"
                    class="w-full bg-black/20 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder-gray-600"
                  />
                </div>
              </div>
            </div>
          }

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

      <!-- Settings Modal -->
      @if (showSettings()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" (click)="showSettings.set(false)">
          <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col" (click)="$event.stopPropagation()">
            
            @if (settingsView() === 'main') {
              <!-- Main Settings View -->
              
              <!-- Modal Header with Provider Toggle -->
              <div class="flex items-center justify-between p-4 border-b border-white/10">
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-300">{{ apiConfig.activeProvider() === 'google-genai' ? 'Google GenAI' : 'OpenAI 兼容' }}</span>
                  <button (click)="showProviderMenu.set(!showProviderMenu())" class="p-1 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                </div>
                
                <!-- Provider Switch Button -->
                <button 
                  (click)="toggleProvider()"
                  class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 border"
                  [class]="apiConfig.activeProvider() === 'google-genai' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4 4 4m6 0v12m0 0 4-4m-4 4-4-4"/></svg>
                  {{ apiConfig.activeProvider() === 'google-genai' ? '切换到 OpenAI 兼容' : '切换到 Google GenAI' }}
                </button>
              </div>

              <!-- Scrollable Content -->
              <div class="flex-1 overflow-y-auto p-4 space-y-5">
                
                <!-- API Key Section -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-300">API 密钥</label>
                    <button class="p-1 text-gray-500 hover:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                  <div class="flex gap-2">
                    <div class="flex-1 relative">
                      <input 
                        [type]="showApiKey() ? 'text' : 'password'" 
                        [ngModel]="currentApiKey()"
                        (ngModelChange)="currentApiKey.set($event)"
                        [placeholder]="apiConfig.activeProvider() === 'google-genai' ? 'AIza...' : 'sk-...'"
                        class="w-full bg-black/40 border border-white/10 text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500/50 transition-all placeholder-gray-600 text-sm pr-10"
                      />
                      <button (click)="showApiKey.set(!showApiKey())" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        @if (showApiKey()) {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                    <button 
                      (click)="testConnection()"
                      [disabled]="testing()"
                      class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm rounded-lg transition-all disabled:opacity-50"
                    >
                      {{ testing() ? '...' : '检测' }}
                    </button>
                  </div>
                  @if (testResult()) {
                    <p class="text-xs" [class]="testResult()!.success ? 'text-green-400' : 'text-red-400'">
                      {{ testResult()!.message }}
                    </p>
                  }
                  <p class="text-xs text-gray-500">多个密钥使用逗号分隔</p>
                </div>

                <!-- Base URL (Only for OpenAI-compatible) -->
                @if (apiConfig.activeProvider() === 'openai-compatible') {
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <label class="text-sm font-medium text-gray-300">API 地址</label>
                      <button class="p-0.5 text-gray-500 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      [ngModel]="currentBaseUrl()"
                      (ngModelChange)="currentBaseUrl.set($event)"
                      placeholder="https://api.openai.com/v1"
                      class="w-full bg-black/40 border border-white/10 text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-green-500/50 transition-all placeholder-gray-600 text-sm"
                    />
                    <p class="text-xs text-gray-500">预览: {{ currentBaseUrl() || 'https://api.openai.com/v1' }}/chat/completions</p>
                  </div>
                }

                <!-- Temperature -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-300">Temperature</label>
                    <span class="text-sm text-gray-400">{{ currentTemperature().toFixed(1) }}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="2" step="0.1"
                    [ngModel]="currentTemperature()"
                    (ngModelChange)="currentTemperature.set($event)"
                    class="w-full accent-indigo-500"
                  />
                </div>

                <!-- Model -->
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-300">模型名称</label>
                  <input 
                    type="text" 
                    [ngModel]="currentModelName()"
                    (ngModelChange)="currentModelName.set($event)"
                    [placeholder]="apiConfig.activeProvider() === 'google-genai' ? 'gemini-2.0-flash' : 'gpt-4o'"
                    class="w-full bg-black/40 border border-white/10 text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all placeholder-gray-600 text-sm"
                  />
                  <p class="text-xs text-gray-500">
                    @if (apiConfig.activeProvider() === 'google-genai') {
                      例如: gemini-2.0-flash, gemini-2.5-pro-preview-05-06
                    } @else {
                      例如: gpt-4o, gpt-4o-mini, claude-3-opus
                    }
                  </p>
                </div>

                <!-- Custom Headers -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-300">自定义请求头</label>
                    <button 
                      (click)="settingsView.set('manage-headers')"
                      class="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      管理模板
                    </button>
                  </div>
                  <textarea 
                    [ngModel]="currentHeaders()"
                    (ngModelChange)="currentHeaders.set($event)"
                    placeholder='{"X-Custom-Header": "value"}'
                    class="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all placeholder-gray-600 text-sm h-20 resize-none font-mono"
                  ></textarea>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="p-4 border-t border-white/10">
                <button 
                  (click)="saveCurrentProviderSettings(); showSettings.set(false)"
                  class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all"
                >
                  保存设置
                </button>
              </div>
            }


            @else if (settingsView() === 'manage-headers') {
              <!-- Manage Headers View -->
              <div class="p-4 border-b border-white/10 flex items-center gap-3">
                <button (click)="settingsView.set('main')" class="p-1 text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <h2 class="text-lg font-semibold text-white">请求头模板</h2>
              </div>
              
              <div class="flex-1 overflow-y-auto p-4 space-y-4">
                <!-- Existing Templates -->
                @if (apiConfig.headerTemplates().length === 0) {
                  <p class="text-sm text-gray-500 text-center py-8">暂无保存的模板</p>
                } @else {
                  @for (template of apiConfig.headerTemplates(); track template.id) {
                    <div class="bg-black/30 rounded-lg p-3 space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-white">{{ template.name }}</span>
                        <div class="flex gap-1">
                          <button 
                            (click)="applyHeaderTemplate(template)"
                            class="px-2 py-1 text-xs bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600/30"
                          >
                            应用
                          </button>
                          <button 
                            (click)="removeHeaderTemplate(template.id)"
                            class="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <pre class="text-xs text-gray-500 font-mono overflow-x-auto">{{ template.headers }}</pre>
                    </div>
                  }
                }

                <!-- Add New Template -->
                <div class="border-t border-white/10 pt-4 space-y-3">
                  <h3 class="text-sm font-medium text-gray-300">保存当前请求头为模板</h3>
                  <input 
                    type="text" 
                    [(ngModel)]="newTemplateName"
                    placeholder="模板名称"
                    class="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all placeholder-gray-600 text-sm"
                  />
                  <button 
                    (click)="saveHeaderTemplate()"
                    [disabled]="!newTemplateName || !currentHeaders()"
                    class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
                  >
                    保存模板
                  </button>
                </div>
              </div>
            }

          </div>
        </div>
      }
    </div>
  `
})
export class SetupViewComponent {
  private apiConfigService = inject(ApiConfigService);

  startGame = output<GameConfig>();
  loadGame = output<string>();

  activeTab = signal<TabMode>('ai-gen');

  // AI Gen Mode Data
  aiPrompt = signal('');

  // Manual Mode Data
  manualTheme = signal('');
  manualStyle = signal('Serious & Dark');
  manualSetting = signal('');

  // Shared Data
  protagonistName = signal('');

  // Settings Modal State
  showSettings = signal(false);
  showLoadModal = signal(false); // Add this
  settingsView = signal<SettingsView>('main');
  showProviderMenu = signal(false);
  showApiKey = signal(false);
  expandedGroups = signal<string[]>([]);

  onLoad(id: string) {
    this.loadGame.emit(id);
    this.showLoadModal.set(false);
  }

  // Testing state
  testing = signal(false);
  testResult = signal<{ success: boolean; message: string } | null>(null);

  // Form fields for current provider
  currentApiKey = signal('');
  currentBaseUrl = signal('');
  currentTemperature = signal(1.0);
  currentHeaders = signal('');
  currentModelName = signal('');

  // Add model form
  newModelId = '';
  newModelName = '';
  newModelGroup = '';

  // Header template form
  newTemplateName = '';

  // Style selection state
  showStyleModal = signal(false);
  showAddStyleForm = signal(false);
  selectedStyleId = signal<string | null>(null);
  newStyleName = '';
  newStyleContent = '';

  // Computed: selected style object
  selectedStyle = computed(() => {
    const styleId = this.selectedStyleId();
    if (!styleId) return null;
    return this.apiConfigService.styleTemplates().find(s => s.id === styleId) || null;
  });

  // Expose apiConfig for template binding
  apiConfig = this.apiConfigService;

  // Computed: current models
  currentModels = computed(() => {
    return this.apiConfigService.activeConfig().models;
  });

  // Computed: model groups
  modelGroups = computed(() => {
    const models = this.currentModels();
    const groups: { name: string; models: ModelConfig[] }[] = [];

    for (const model of models) {
      const groupName = model.group || 'Other';
      let group = groups.find(g => g.name === groupName);
      if (!group) {
        group = { name: groupName, models: [] };
        groups.push(group);
      }
      group.models.push(model);
    }

    return groups;
  });

  constructor() {
    // Initialize form fields when settings open
  }

  ngOnInit() {
    this.loadCurrentProviderSettings();
  }

  loadCurrentProviderSettings() {
    const config = this.apiConfigService.activeConfig();
    this.currentApiKey.set(config.apiKey);
    this.currentBaseUrl.set(config.baseUrl || 'https://api.openai.com/v1');
    this.currentTemperature.set(config.temperature);
    this.currentHeaders.set(config.customHeaders);
    this.currentModelName.set(config.selectedModelId || '');
  }

  toggleProvider() {
    // Save current settings first
    this.saveCurrentProviderSettings();

    // Toggle provider
    const newProvider = this.apiConfig.activeProvider() === 'google-genai' ? 'openai-compatible' : 'google-genai';
    this.apiConfigService.setProvider(newProvider);

    // Load new provider settings
    this.loadCurrentProviderSettings();
    this.testResult.set(null);
  }

  saveCurrentProviderSettings() {
    const provider = this.apiConfig.activeProvider();
    this.apiConfigService.updateConfig(provider, {
      apiKey: this.currentApiKey(),
      baseUrl: this.currentBaseUrl(),
      temperature: this.currentTemperature(),
      customHeaders: this.currentHeaders(),
      selectedModelId: this.currentModelName()
    });
  }

  // Model methods removed - using simple text input now

  async testConnection() {
    this.testing.set(true);
    this.testResult.set(null);

    // Save current settings first
    this.saveCurrentProviderSettings();

    const result = await this.apiConfigService.testConnection();
    this.testResult.set(result);
    this.testing.set(false);
  }

  saveHeaderTemplate() {
    if (!this.newTemplateName || !this.currentHeaders()) return;

    this.apiConfigService.addHeaderTemplate({
      id: Date.now().toString(),
      name: this.newTemplateName,
      headers: this.currentHeaders()
    });

    this.newTemplateName = '';
  }

  applyHeaderTemplate(template: HeaderTemplate) {
    this.currentHeaders.set(template.headers);
    this.settingsView.set('main');
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
    if (!this.newStyleName.trim() || !this.newStyleContent.trim()) return;

    const newStyle: StyleTemplate = {
      id: Date.now().toString(),
      name: this.newStyleName.trim(),
      content: this.newStyleContent.trim(),
      isBuiltIn: false
    };

    this.apiConfigService.addStyleTemplate(newStyle);
    this.newStyleName = '';
    this.newStyleContent = '';
    this.showAddStyleForm.set(false);
  }

  onStart() {
    // Save settings before starting
    this.saveCurrentProviderSettings();

    const pName = this.protagonistName() || '旅人';

    // Get style content - if no style selected, use 'Adaptive' for AI to infer
    const styleContent = this.selectedStyle()?.content || 'Adaptive';

    if (this.activeTab() === 'ai-gen') {
      this.startGame.emit({
        theme: 'AI Generated',
        style: styleContent,
        setting: this.aiPrompt(),
        protagonist: pName
      });
    } else {
      this.startGame.emit({
        theme: this.manualTheme(),
        style: this.manualStyle(),
        setting: this.manualSetting(),
        protagonist: pName
      });
    }
  }
}