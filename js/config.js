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

// 設定檔
const CONFIG = {
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
        }
    },
    getFonts: (mobile) => {
        const s = mobile ? 0.85 : 1;
        return {
            display: `900 ${Math.round(36*s)}px "Noto Serif TC"`,
            displayLarge: `900 ${Math.round(44*s)}px "Noto Serif TC"`,
            body: `400 ${Math.round(19*s)}px "Noto Serif TC"`,
            ui: `700 ${Math.round(14*s)}px "Noto Serif TC"`,
            small: `400 ${Math.round(13*s)}px "Noto Serif TC"`
        };
    }
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