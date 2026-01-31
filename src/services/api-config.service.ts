import { Injectable, signal, computed } from '@angular/core';

export type AIProvider = 'openai-compatible' | 'google-genai';

export interface ModelConfig {
    id: string;
    name: string;
    group: string;
    icon?: string;
    capabilities?: string[];
}

export interface HeaderTemplate {
    id: string;
    name: string;
    headers: string;
}

export interface StyleTemplate {
    id: string;
    name: string;
    content: string;
    isBuiltIn?: boolean;
}

export interface ProviderConfig {
    apiKey: string;
    baseUrl?: string;
    models: ModelConfig[];
    selectedModelId?: string;
    temperature: number;
    customHeaders: string;
}

export interface ApiConfig {
    'openai-compatible': ProviderConfig;
    'google-genai': ProviderConfig;
    headerTemplates: HeaderTemplate[];
    styleTemplates: StyleTemplate[];
}

const STORAGE_KEY = 'ai_api_config';
const PROVIDER_KEY = 'ai_active_provider';

const DEFAULT_STYLE_TEMPLATES: StyleTemplate[] = [
    {
        id: 'hardboiled-noir',
        name: '硬汉派 / 黑色电影',
        content: '模仿钱德勒的硬汉派文风。冷峻、充满感官描写（气味、温度、触感），不讲废话。多描写烟味、雨水和金属质感，少描写内心挣扎。适合赛博朋克、侦探、现代都市、末世题材。',
        isBuiltIn: true
    },
    {
        id: 'light-novel-anime',
        name: '轻小说 / 动画分镜',
        content: '节奏轻快，台词要有个性。环境描写要像动画分镜，强调视觉上的动效。对话感极强，画面描写像分镜脚本。适合奇幻冒险、校园、日常、二次元题材。',
        isBuiltIn: true
    },
    {
        id: 'gothic-lovecraftian',
        name: '古典哥特 / 克苏鲁',
        content: '使用压抑、神秘的笔触。侧重描写环境的腐朽感和主角生理上的排斥反应。用大量带有倾向性的词汇（扭曲、腐朽、阴暗）来营造氛围。适合恐怖、密室、中世纪魔幻题材。',
        isBuiltIn: true
    }
];

const DEFAULT_CONFIG: ApiConfig = {
    'openai-compatible': {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        models: [
            { id: 'gpt-4o', name: 'gpt-4o', group: 'gpt-4', capabilities: ['vision', 'tools'] },
            { id: 'gpt-4o-mini', name: 'gpt-4o-mini', group: 'gpt-4', capabilities: ['vision', 'tools'] },
        ],
        selectedModelId: 'gpt-4o',
        temperature: 1.0,
        customHeaders: ''
    },
    'google-genai': {
        apiKey: '',
        models: [
            { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash', group: 'gemini-2', capabilities: ['vision', 'thinking'] },
            { id: 'gemini-2.5-flash-preview-05-20', name: 'gemini-2.5-flash-preview', group: 'gemini-2.5', capabilities: ['vision', 'thinking', 'tools'] },
            { id: 'gemini-2.5-pro-preview-05-06', name: 'gemini-2.5-pro-preview', group: 'gemini-2.5', capabilities: ['vision', 'thinking', 'tools'] },
        ],
        selectedModelId: 'gemini-2.0-flash',
        temperature: 1.0,
        customHeaders: ''
    },
    headerTemplates: [],
    styleTemplates: DEFAULT_STYLE_TEMPLATES
};

@Injectable({
    providedIn: 'root'
})
export class ApiConfigService {
    private _config = signal<ApiConfig>(this.loadConfig());
    private _activeProvider = signal<AIProvider>(this.loadProvider());

    config = this._config.asReadonly();
    activeProvider = this._activeProvider.asReadonly();

    activeConfig = computed(() => this._config()[this._activeProvider()]);

    isConfigured = computed(() => {
        const config = this.activeConfig();
        return !!config.apiKey && !!config.selectedModelId;
    });

    selectedModel = computed(() => {
        const config = this.activeConfig();
        return config.models.find(m => m.id === config.selectedModelId);
    });

    headerTemplates = computed(() => this._config().headerTemplates);

    styleTemplates = computed(() => this._config().styleTemplates);

    endpointPreview = computed(() => {
        if (this._activeProvider() === 'openai-compatible') {
            const baseUrl = this.activeConfig().baseUrl || 'https://api.openai.com/v1';
            return baseUrl + '/chat/completions';
        }
        return '';
    });

    private loadConfig(): ApiConfig {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge style templates: keep built-in styles and add user-created ones
                const userStyles = (parsed.styleTemplates || []).filter((s: StyleTemplate) => !s.isBuiltIn);
                const mergedStyleTemplates = [...DEFAULT_STYLE_TEMPLATES, ...userStyles];

                return {
                    ...DEFAULT_CONFIG,
                    ...parsed,
                    'openai-compatible': { ...DEFAULT_CONFIG['openai-compatible'], ...parsed['openai-compatible'] },
                    'google-genai': { ...DEFAULT_CONFIG['google-genai'], ...parsed['google-genai'] },
                    styleTemplates: mergedStyleTemplates
                };
            }
        } catch (e) {
            console.warn('Failed to load API config:', e);
        }
        return DEFAULT_CONFIG;
    }

    private loadProvider(): AIProvider {
        const stored = localStorage.getItem(PROVIDER_KEY);
        return (stored === 'openai-compatible' || stored === 'google-genai') ? stored : 'google-genai';
    }

    setProvider(provider: AIProvider): void {
        this._activeProvider.set(provider);
        localStorage.setItem(PROVIDER_KEY, provider);
    }

    updateConfig(provider: AIProvider, config: Partial<ProviderConfig>): void {
        this._config.update(current => {
            const updated = {
                ...current,
                [provider]: { ...current[provider], ...config }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }

    getProviderConfig(provider: AIProvider): ProviderConfig {
        return this._config()[provider];
    }

    addModel(provider: AIProvider, model: ModelConfig): void {
        this._config.update(current => {
            const providerConfig = current[provider];
            const updated = {
                ...current,
                [provider]: {
                    ...providerConfig,
                    models: [...providerConfig.models, model]
                }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }

    removeModel(provider: AIProvider, modelId: string): void {
        this._config.update(current => {
            const providerConfig = current[provider];
            const updated = {
                ...current,
                [provider]: {
                    ...providerConfig,
                    models: providerConfig.models.filter(m => m.id !== modelId)
                }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }

    selectModel(provider: AIProvider, modelId: string): void {
        this.updateConfig(provider, { selectedModelId: modelId });
    }

    addHeaderTemplate(template: HeaderTemplate): void {
        this._config.update(current => {
            const updated = {
                ...current,
                headerTemplates: [...current.headerTemplates, template]
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }

    removeHeaderTemplate(templateId: string): void {
        this._config.update(current => {
            const updated = {
                ...current,
                headerTemplates: current.headerTemplates.filter(t => t.id !== templateId)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }

    addStyleTemplate(template: StyleTemplate): void {
        this._config.update(current => {
            const updated = {
                ...current,
                styleTemplates: [...current.styleTemplates, template]
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }

    removeStyleTemplate(templateId: string): void {
        this._config.update(current => {
            const updated = {
                ...current,
                styleTemplates: current.styleTemplates.filter(t => t.id !== templateId)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }

    applyHeaderTemplate(provider: AIProvider, template: HeaderTemplate): void {
        this.updateConfig(provider, { customHeaders: template.headers });
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        const provider = this._activeProvider();
        const config = this.activeConfig();

        if (!config.apiKey) {
            return { success: false, message: 'API Key not configured' };
        }

        try {
            if (provider === 'openai-compatible') {
                const response = await fetch(config.baseUrl + '/models', {
                    headers: {
                        'Authorization': 'Bearer ' + config.apiKey,
                        ...this.parseHeaders(config.customHeaders)
                    }
                });
                if (response.ok) {
                    return { success: true, message: 'Connection successful!' };
                }
                return { success: false, message: 'Connection failed: ' + response.status };
            } else {
                const response = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models?key=' + config.apiKey
                );
                if (response.ok) {
                    return { success: true, message: 'Connection successful!' };
                }
                return { success: false, message: 'Connection failed: ' + response.status };
            }
        } catch (e: any) {
            return { success: false, message: 'Connection error: ' + e.message };
        }
    }

    private parseHeaders(headersStr: string): Record<string, string> {
        if (!headersStr.trim()) return {};
        try {
            return JSON.parse(headersStr);
        } catch {
            return {};
        }
    }
}
