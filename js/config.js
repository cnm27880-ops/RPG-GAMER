// ============ 全域變數與設定 ============

// 取得 Canvas 元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 從 localStorage 讀取 API Key
let apiKey = localStorage.getItem('gemini_api_key') || "";

// 畫面相關變數
let canvasWidth = 0;
let canvasHeight = 0;
let isMobile = false;
let fonts = {};
let mouseX = 0;
let mouseY = 0;

// 遊戲狀態列舉
const STATE = {
    INIT: 0,
    LOADING: 1,
    WORLD_SELECT: 2,
    WORLD_INTRO: 3,
    TYPING: 4,
    CHOICE: 5
};

// 【重要修復】補上 currentState 並設定初始值
let currentState = STATE.INIT;

// 其他全域遊戲變數
let currentWorld = null;
let factionData = [];
let storyContext = "";
let historyLog = [];
let currentOptions = [];
let loadingText = "";
let generatedWorlds = [];
let isSoundOn = false;

// 遊戲狀態管理實例（會在遊戲開始時初始化）
let gameState = null;

// 設定檔
const CONFIG = {
    // 顏色設定
    colors: {
        bg: '#15171e',
        textPrimary: '#d8d8d0',
        textDim: '#8f919c',
        textGold: '#deb887',
        panelBg: 'rgba(28, 30, 38, 0.94)',
        panelBorder: '#4a4d5e',
        factions: ['#c76b6b', '#7eb58c', '#6b9bc7'],
        relationColors: {
            love: '#e08090',
            ally: '#80c090',
            neutral: '#909090',
            rival: '#c0a060',
            enemy: '#c07070'
        },
        // 環境氣氛對應色調
        atmosphere: {
            tense: '#3a2020',
            mysterious: '#1a1a2e',
            warm: '#2e2a1a',
            cold: '#1a2a2e',
            dangerous: '#2e1a1a',
            peaceful: '#1a2e1a',
            dark: '#0d0d0d',
            bright: '#2e2e2a'
        }
    },

    // LLM Provider 設定
    llm: {
        // 當前使用的 Provider（auto = 自動偵測）
        provider: 'auto',
        // 模型設定（空白 = 使用預設）
        model: '',
        // 自訂 API 端點（空白 = 使用預設）
        baseUrl: '',
        // 是否啟用流式傳輸
        streaming: false,
        // 各 Provider 的預設設定
        presets: {
            gemini: {
                name: 'Google Gemini',
                defaultModel: 'gemini-2.0-flash',
                models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
            },
            openai: {
                name: 'OpenAI',
                defaultModel: 'gpt-4o',
                models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
            },
            anthropic: {
                name: 'Anthropic Claude',
                defaultModel: 'claude-3-5-sonnet-20241022',
                models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229']
            },
            deepseek: {
                name: 'DeepSeek',
                defaultModel: 'deepseek-chat',
                baseUrl: 'https://api.deepseek.com/v1',
                models: ['deepseek-chat', 'deepseek-coder']
            },
            groq: {
                name: 'Groq',
                defaultModel: 'llama-3.3-70b-versatile',
                baseUrl: 'https://api.groq.com/openai/v1',
                models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768']
            },
            openrouter: {
                name: 'OpenRouter',
                defaultModel: 'anthropic/claude-3.5-sonnet',
                baseUrl: 'https://openrouter.ai/api/v1',
                models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro-1.5']
            },
            ollama: {
                name: 'Ollama (本地)',
                defaultModel: 'llama3.2',
                baseUrl: 'http://localhost:11434',
                models: ['llama3.2', 'mistral', 'codellama']
            }
        }
    },

    // 字體設定
    getFonts: (mobile) => {
        const s = mobile ? 0.85 : 1;
        return {
            display: `900 ${Math.round(36*s)}px "Noto Serif TC"`,
            displayLarge: `900 ${Math.round(44*s)}px "Noto Serif TC"`,
            body: `400 ${Math.round(19*s)}px "Noto Serif TC"`,
            ui: `700 ${Math.round(14*s)}px "Noto Serif TC"`,
            small: `400 ${Math.round(13*s)}px "Noto Serif TC"`
        };
    },

    // 遊戲版本
    version: '2.0.0'
};

// 用於顯示錯誤提示的 Helper 函數
function showError(msg) {
    const toast = document.getElementById('error-toast');
    if (toast) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    } else {
        console.error(msg);
    }
}