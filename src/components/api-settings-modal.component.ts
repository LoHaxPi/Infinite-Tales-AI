import { Component, output, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiConfigService, HeaderTemplate } from '../services/api-config.service';

type SettingsView = 'main' | 'manage-headers';

@Component({
    selector: 'app-api-settings-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" (click)="close.emit()">
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
              (click)="saveAndClose()"
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
  `,
})
export class ApiSettingsModalComponent implements OnInit {
    private apiConfigService = inject(ApiConfigService);
    apiConfig = this.apiConfigService;

    close = output<void>();

    settingsView = signal<'main' | 'manage-headers'>('main');
    showProviderMenu = signal(false);
    showApiKey = signal(false);
    testing = signal(false);
    testResult = signal<{ success: boolean; message: string } | null>(null);

    // Form fields
    currentApiKey = signal('');
    currentBaseUrl = signal('');
    currentTemperature = signal(1.0);
    currentHeaders = signal('');
    currentModelName = signal('');
    newTemplateName = '';

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
        this.saveCurrentProviderSettings();
        const newProvider = this.apiConfig.activeProvider() === 'google-genai' ? 'openai-compatible' : 'google-genai';
        this.apiConfigService.setProvider(newProvider);
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

    async testConnection() {
        this.testing.set(true);
        this.testResult.set(null);
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

    saveAndClose() {
        this.saveCurrentProviderSettings();
        this.close.emit();
    }
}
