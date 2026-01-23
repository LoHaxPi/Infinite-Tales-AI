import { Injectable, signal, computed } from '@angular/core';

export type AIProvider = 'gemini' | 'openai';

export interface ProviderConfig {
    apiKey: string;
    baseUrl?: string;  // For OpenAI compatible endpoints
    model?: string;
}

export interface ApiConfig {
    gemini: ProviderConfig;
    openai: ProviderConfig;
}

const STORAGE_KEY = 'ai_api_config';
const PROVIDER_KEY = 'ai_active_provider';

const DEFAULT_CONFIG: ApiConfig = {
    gemini: {
        apiKey: '',
        model: 'gemini-2.0-flash'
    },
    openai: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o'
    }
};

@Injectable({
    providedIn: 'root'
})
export class ApiConfigService {
    private _config = signal<ApiConfig>(this.loadConfig());
    private _activeProvider = signal<AIProvider>(this.loadProvider());

    readonly config = this._config.asReadonly();
    readonly activeProvider = this._activeProvider.asReadonly();

    readonly activeConfig = computed(() => {
        const provider = this._activeProvider();
        return this._config()[provider];
    });

    readonly isConfigured = computed(() => {
        return !!this.activeConfig().apiKey;
    });

    private loadConfig(): ApiConfig {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...DEFAULT_CONFIG, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load API config:', e);
        }
        return DEFAULT_CONFIG;
    }

    private loadProvider(): AIProvider {
        const stored = localStorage.getItem(PROVIDER_KEY);
        return (stored === 'openai' || stored === 'gemini') ? stored : 'gemini';
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
}
