// ============ 通用 LLM 適配器（策略模式）============

/**
 * LLM Provider 基礎類別
 * 定義標準介面，所有 Provider 都必須實作這些方法
 */
class LLMProvider {
    constructor(config = {}) {
        this.config = config;
        this.name = 'base';
    }

    /**
     * 核心生成方法 - 必須由子類別實作
     * @param {string} prompt - 使用者提示詞
     * @param {string} systemInstruction - 系統指令
     * @param {Object} options - 額外選項（如 temperature, maxTokens）
     * @returns {Promise<Object|null>} - 解析後的 JSON 物件或 null
     */
    async generate(prompt, systemInstruction, options = {}) {
        throw new Error('generate() 必須由子類別實作');
    }

    /**
     * 流式生成方法 - 可選實作
     * @param {string} prompt - 使用者提示詞
     * @param {string} systemInstruction - 系統指令
     * @param {Function} onChunk - 每次收到資料時的回呼
     * @param {Object} options - 額外選項
     * @returns {Promise<string>} - 完整的回應文字
     */
    async generateStream(prompt, systemInstruction, onChunk, options = {}) {
        // 預設不支援流式傳輸，回退到一般生成
        const result = await this.generate(prompt, systemInstruction, options);
        if (result && onChunk) {
            onChunk(JSON.stringify(result), true);
        }
        return result;
    }

    /**
     * 驗證 API Key 是否有效
     * @returns {Promise<boolean>}
     */
    async validateKey() {
        return !!this.config.apiKey;
    }

    /**
     * 取得 Provider 資訊
     */
    getInfo() {
        return {
            name: this.name,
            supportsStreaming: false,
            supportsJSON: true
        };
    }
}

/**
 * Gemini Provider - Google Generative AI
 */
class GeminiProvider extends LLMProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'gemini';
        this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models/';
        this.model = config.model || 'gemini-2.0-flash';
    }

    async generate(prompt, systemInstruction, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('Gemini API Key 未設定');
        }

        const url = `${this.baseUrl}${this.model}:generateContent?key=${this.config.apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                responseMimeType: "application/json",
                temperature: options.temperature || 0.9,
                maxOutputTokens: options.maxTokens || 4096
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return text ? tryParseJSON(text) : null;
    }

    async generateStream(prompt, systemInstruction, onChunk, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('Gemini API Key 未設定');
        }

        const url = `${this.baseUrl}${this.model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                temperature: options.temperature || 0.9,
                maxOutputTokens: options.maxTokens || 4096
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Gemini Stream Error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
                try {
                    const json = JSON.parse(line.slice(6));
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                        fullText += text;
                        if (onChunk) onChunk(text, false);
                    }
                } catch (e) {
                    // 忽略解析錯誤
                }
            }
        }

        if (onChunk) onChunk('', true);
        return tryParseJSON(fullText);
    }

    getInfo() {
        return {
            name: 'Google Gemini',
            model: this.model,
            supportsStreaming: true,
            supportsJSON: true
        };
    }
}

/**
 * OpenAI Provider - 支援 OpenAI、DeepSeek、Groq、OpenRouter 等相容 API
 */
class OpenAIProvider extends LLMProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'openai';
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        this.model = config.model || 'gpt-4o';
    }

    async generate(prompt, systemInstruction, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('OpenAI API Key 未設定');
        }

        const url = `${this.baseUrl}/chat/completions`;

        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: options.temperature || 0.9,
            max_tokens: options.maxTokens || 4096
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        return text ? tryParseJSON(text) : null;
    }

    async generateStream(prompt, systemInstruction, onChunk, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('OpenAI API Key 未設定');
        }

        const url = `${this.baseUrl}/chat/completions`;

        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
            ],
            stream: true,
            temperature: options.temperature || 0.9,
            max_tokens: options.maxTokens || 4096
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`OpenAI Stream Error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.startsWith('data: ') && !line.includes('[DONE]'));

            for (const line of lines) {
                try {
                    const json = JSON.parse(line.slice(6));
                    const text = json.choices?.[0]?.delta?.content || '';
                    if (text) {
                        fullText += text;
                        if (onChunk) onChunk(text, false);
                    }
                } catch (e) {
                    // 忽略解析錯誤
                }
            }
        }

        if (onChunk) onChunk('', true);
        return tryParseJSON(fullText);
    }

    getInfo() {
        return {
            name: 'OpenAI Compatible',
            model: this.model,
            baseUrl: this.baseUrl,
            supportsStreaming: true,
            supportsJSON: true
        };
    }
}

/**
 * Anthropic Provider - Claude 系列模型
 */
class AnthropicProvider extends LLMProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'anthropic';
        this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
        this.model = config.model || 'claude-3-5-sonnet-20241022';
    }

    async generate(prompt, systemInstruction, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('Anthropic API Key 未設定');
        }

        const url = `${this.baseUrl}/messages`;

        // Claude 要求回傳 JSON 時需要在 prompt 中明確說明
        const jsonPrompt = `${prompt}\n\n請以 JSON 格式回應，確保回應是有效的 JSON。`;

        const payload = {
            model: this.model,
            max_tokens: options.maxTokens || 4096,
            system: systemInstruction,
            messages: [
                { role: 'user', content: jsonPrompt }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text;

        return text ? tryParseJSON(text) : null;
    }

    async generateStream(prompt, systemInstruction, onChunk, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('Anthropic API Key 未設定');
        }

        const url = `${this.baseUrl}/messages`;
        const jsonPrompt = `${prompt}\n\n請以 JSON 格式回應。`;

        const payload = {
            model: this.model,
            max_tokens: options.maxTokens || 4096,
            system: systemInstruction,
            messages: [
                { role: 'user', content: jsonPrompt }
            ],
            stream: true
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Anthropic Stream Error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
                try {
                    const json = JSON.parse(line.slice(6));
                    if (json.type === 'content_block_delta') {
                        const text = json.delta?.text || '';
                        if (text) {
                            fullText += text;
                            if (onChunk) onChunk(text, false);
                        }
                    }
                } catch (e) {
                    // 忽略解析錯誤
                }
            }
        }

        if (onChunk) onChunk('', true);
        return tryParseJSON(fullText);
    }

    getInfo() {
        return {
            name: 'Anthropic Claude',
            model: this.model,
            supportsStreaming: true,
            supportsJSON: true
        };
    }
}

/**
 * Ollama Provider - 本地模型支援
 */
class OllamaProvider extends LLMProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'ollama';
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.model = config.model || 'llama3.2';
    }

    async generate(prompt, systemInstruction, options = {}) {
        const url = `${this.baseUrl}/api/generate`;

        const payload = {
            model: this.model,
            prompt: prompt,
            system: systemInstruction,
            format: 'json',
            stream: false,
            options: {
                temperature: options.temperature || 0.9,
                num_predict: options.maxTokens || 4096
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.response ? tryParseJSON(data.response) : null;
    }

    async generateStream(prompt, systemInstruction, onChunk, options = {}) {
        const url = `${this.baseUrl}/api/generate`;

        const payload = {
            model: this.model,
            prompt: prompt,
            system: systemInstruction,
            stream: true,
            options: {
                temperature: options.temperature || 0.9,
                num_predict: options.maxTokens || 4096
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama Stream Error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    const text = json.response || '';
                    if (text) {
                        fullText += text;
                        if (onChunk) onChunk(text, false);
                    }
                } catch (e) {
                    // 忽略解析錯誤
                }
            }
        }

        if (onChunk) onChunk('', true);
        return tryParseJSON(fullText);
    }

    async validateKey() {
        // Ollama 不需要 API Key，但要檢查服務是否可用
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }

    getInfo() {
        return {
            name: 'Ollama (Local)',
            model: this.model,
            baseUrl: this.baseUrl,
            supportsStreaming: true,
            supportsJSON: true
        };
    }
}

/**
 * LLM 服務管理器 - 統一介面
 */
class LLMServiceManager {
    constructor() {
        this.providers = new Map();
        this.currentProvider = null;
        this.streamingEnabled = false;

        // 註冊預設 Providers
        this.registerProvider('gemini', GeminiProvider);
        this.registerProvider('openai', OpenAIProvider);
        this.registerProvider('anthropic', AnthropicProvider);
        this.registerProvider('ollama', OllamaProvider);
    }

    /**
     * 註冊新的 Provider 類別
     */
    registerProvider(name, ProviderClass) {
        this.providers.set(name, ProviderClass);
    }

    /**
     * 根據設定初始化 Provider
     */
    initProvider(providerName, config = {}) {
        const ProviderClass = this.providers.get(providerName);
        if (!ProviderClass) {
            throw new Error(`未知的 Provider: ${providerName}`);
        }
        this.currentProvider = new ProviderClass(config);
        return this.currentProvider;
    }

    /**
     * 自動偵測 API Key 類型並初始化對應 Provider
     */
    autoDetectProvider(apiKey, customConfig = {}) {
        let providerName = 'gemini';
        let config = { apiKey, ...customConfig };

        if (apiKey.startsWith('sk-')) {
            providerName = 'openai';
        } else if (apiKey.startsWith('sk-ant-')) {
            providerName = 'anthropic';
        } else if (apiKey === 'ollama' || apiKey.startsWith('ollama:')) {
            providerName = 'ollama';
            if (apiKey.includes(':')) {
                config.model = apiKey.split(':')[1];
            }
            config.apiKey = null;
        }

        // 支援自訂端點（如 DeepSeek、Groq）
        if (customConfig.baseUrl) {
            providerName = customConfig.provider || 'openai';
        }

        return this.initProvider(providerName, config);
    }

    /**
     * 設定是否啟用流式傳輸
     */
    setStreamingEnabled(enabled) {
        this.streamingEnabled = enabled;
    }

    /**
     * 統一生成方法
     */
    async generate(prompt, systemInstruction, options = {}) {
        if (!this.currentProvider) {
            throw new Error('Provider 尚未初始化');
        }

        if (this.streamingEnabled && options.onChunk) {
            return this.currentProvider.generateStream(prompt, systemInstruction, options.onChunk, options);
        }

        return this.currentProvider.generate(prompt, systemInstruction, options);
    }

    /**
     * 取得當前 Provider 資訊
     */
    getProviderInfo() {
        return this.currentProvider?.getInfo() || null;
    }

    /**
     * 取得所有可用的 Provider 名稱
     */
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
}

// 建立全域 LLM 服務管理器實例
const llmService = new LLMServiceManager();

// 預設 Provider 設定（相容舊版 apiKey 變數）
const LLM_PRESETS = {
    gemini: {
        name: 'Google Gemini',
        models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        defaultModel: 'gemini-2.0-flash',
        keyPrefix: 'AIza'
    },
    openai: {
        name: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        defaultModel: 'gpt-4o',
        keyPrefix: 'sk-'
    },
    anthropic: {
        name: 'Anthropic Claude',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
        defaultModel: 'claude-3-5-sonnet-20241022',
        keyPrefix: 'sk-ant-'
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-coder'],
        defaultModel: 'deepseek-chat',
        keyPrefix: 'sk-'
    },
    groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
        defaultModel: 'llama-3.3-70b-versatile',
        keyPrefix: 'gsk_'
    },
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro-1.5'],
        defaultModel: 'anthropic/claude-3.5-sonnet',
        keyPrefix: 'sk-or-'
    },
    ollama: {
        name: 'Ollama (本地)',
        baseUrl: 'http://localhost:11434',
        models: ['llama3.2', 'mistral', 'codellama'],
        defaultModel: 'llama3.2',
        keyPrefix: null
    }
};
