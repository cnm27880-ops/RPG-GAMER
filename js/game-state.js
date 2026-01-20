// ============ 遊戲狀態管理器 ============

/**
 * GameState 類別 - 集中管理所有遊戲狀態
 * 解決全域變數散落問題，支援完整的存檔/讀檔功能
 */
class GameState {
    constructor() {
        this.reset();
    }

    /**
     * 重置所有狀態到初始值
     */
    reset() {
        // 遊戲核心狀態
        this.currentWorld = null;
        this.factionData = [];
        this.storyContext = '';
        this.historyLog = [];
        this.currentOptions = [];
        this.generatedWorlds = [];

        // 玩家角色
        this.playerCharacter = this._createDefaultCharacter();

        // NPC 與關係
        this.npcs = [];
        this.relationships = [];

        // 系統狀態
        this.fatePoints = 0;
        this.currentState = typeof STATE !== 'undefined' ? STATE.INIT : 0;
        this.loadingText = '';

        // 末日鐘系統（Doom Clock）
        this.doomClock = 0;  // 0-100，表示世界危機程度
        this.doomThresholds = [25, 50, 75, 100];  // 節點閾值
        this.lastDoomLevel = 0;  // 上次的末日等級
        this.triggeredThresholds = new Set();  // 已觸發的閾值

        // 日曆狀態
        this.calendar = {
            year: 1,
            season: 0,
            day: 1,
            timeOfDay: 0
        };

        // 存檔相關
        this.savePoints = [];
        this.lastSavePointDay = -1;

        // 設定
        this.settings = {
            apiKey: '',
            provider: 'auto',
            model: '',
            baseUrl: '',
            streamingEnabled: false,
            soundEnabled: false
        };

        // 壓縮的歷史摘要
        this.compressedHistory = '';
    }

    /**
     * 建立預設角色
     */
    _createDefaultCharacter() {
        return {
            id: 'player',
            name: '旅人',
            role: '命運的見證者',
            desc: '你，一個踏入這個世界的旅人。',
            faction: -1,
            x: 0,
            y: 0,
            known: true,
            gender: '不指定',
            stats: { authority: 0, empathy: 0, cunning: 0, logic: 0 },
            background: 'wanderer',
            traits: []
        };
    }

    // ===== 日曆系統 =====

    /**
     * 推進時間（同時增加末日值）
     */
    advanceTime(units = 1) {
        const seasonNames = ['春月', '夏月', '秋月', '冬月'];
        const timeNames = ['清晨', '上午', '午後', '黃昏', '夜晚', '深夜'];

        for (let i = 0; i < units; i++) {
            this.calendar.timeOfDay++;
            if (this.calendar.timeOfDay >= 6) {
                this.calendar.timeOfDay = 0;
                this.calendar.day++;
                if (this.calendar.day > 30) {
                    this.calendar.day = 1;
                    this.calendar.season++;
                    if (this.calendar.season >= 4) {
                        this.calendar.season = 0;
                        this.calendar.year++;
                    }
                }
            }

            // 每次推進時間，增加末日值（基礎值 + 隨機波動）
            this.advanceDoomClock(0.5 + Math.random() * 0.5);
        }
    }

    // ===== 末日鐘系統 =====

    /**
     * 增加末日值
     */
    advanceDoomClock(amount) {
        const oldValue = this.doomClock;
        this.doomClock = Math.min(100, this.doomClock + amount);

        // 檢查是否跨過閾值
        const oldLevel = this.getDoomLevel(oldValue);
        const newLevel = this.getDoomLevel(this.doomClock);

        if (newLevel > oldLevel) {
            this.lastDoomLevel = newLevel;
            // 標記該閾值已觸發
            this.triggeredThresholds.add(this.doomThresholds[newLevel - 1]);
        }

        return this.doomClock;
    }

    /**
     * 取得當前末日等級（0-4）
     * 0: 0-24%, 1: 25-49%, 2: 50-74%, 3: 75-99%, 4: 100%
     */
    getDoomLevel(value = null) {
        const doomValue = value !== null ? value : this.doomClock;

        if (doomValue >= 100) return 4;
        if (doomValue >= 75) return 3;
        if (doomValue >= 50) return 2;
        if (doomValue >= 25) return 1;
        return 0;
    }

    /**
     * 檢查是否剛跨過閾值（需要觸發大事件）
     */
    shouldTriggerDoomEvent() {
        const currentLevel = this.getDoomLevel();
        return currentLevel > this.lastDoomLevel;
    }

    /**
     * 重置末日等級標記（事件觸發後調用）
     */
    resetDoomEventFlag() {
        this.lastDoomLevel = this.getDoomLevel();
    }

    /**
     * 取得末日等級描述
     */
    getDoomLevelDescription() {
        const level = this.getDoomLevel();
        const descriptions = [
            '寧靜',      // 0-24%
            '不安',      // 25-49%
            '危機',      // 50-74%
            '崩潰邊緣',  // 75-99%
            '末日降臨'   // 100%
        ];
        return descriptions[level];
    }

    /**
     * 取得末日值的顏色（用於 UI 顯示）
     */
    getDoomColor() {
        const level = this.getDoomLevel();
        const colors = [
            '#80c090',  // 綠色 - 安全
            '#c0a060',  // 黃色 - 警告
            '#c09060',  // 橙色 - 危險
            '#c07070',  // 紅色 - 極度危險
            '#a040a0'   // 紫色 - 末日
        ];
        return colors[level];
    }

    /**
     * 取得日期字串
     */
    getCalendarString() {
        const seasonNames = ['春月', '夏月', '秋月', '冬月'];
        const dayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                         '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                         '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
        return `第${this.calendar.year}年 ${seasonNames[this.calendar.season]} ${dayNames[this.calendar.day - 1]}`;
    }

    /**
     * 取得時間字串
     */
    getTimeString() {
        const timeNames = ['清晨', '上午', '午後', '黃昏', '夜晚', '深夜'];
        return timeNames[this.calendar.timeOfDay];
    }

    /**
     * 重置日曆
     */
    resetCalendar() {
        this.calendar = { year: 1, season: 0, day: 1, timeOfDay: 0 };
    }

    // ===== 命運點系統 =====

    /**
     * 增加命運點
     */
    addFatePoints(amount) {
        this.fatePoints += amount;
        return this.fatePoints;
    }

    /**
     * 消耗命運點
     */
    spendFatePoints(amount) {
        if (this.fatePoints >= amount) {
            this.fatePoints -= amount;
            return true;
        }
        return false;
    }

    // ===== NPC 管理 =====

    /**
     * 新增 NPC
     */
    addNPC(npc) {
        if (!this.npcs.find(n => n.id === npc.id)) {
            npc.known = true;
            npc.status = npc.status || 'active';
            npc.x = Math.random() * 300 - 150;
            npc.y = Math.random() * 300 - 150;
            this.npcs.push(npc);
            return true;
        }
        return false;
    }

    /**
     * 更新 NPC 狀態
     */
    updateNPCStatus(npcId, newStatus, reason) {
        const npc = this.npcs.find(n => n.id === npcId);
        if (npc && npc.status !== newStatus) {
            const oldStatus = npc.status;
            npc.status = newStatus;
            this.historyLog.push({
                role: 'Status',
                text: `【狀態變更】${npc.name}：${oldStatus} → ${newStatus}${reason ? `（${reason}）` : ''}`
            });
            return true;
        }
        return false;
    }

    /**
     * 取得活躍的 NPC
     */
    getActiveNPCs() {
        return this.npcs.filter(n => n.status === 'active' || n.status === 'injured');
    }

    /**
     * 取得死亡的 NPC
     */
    getDeadNPCs() {
        return this.npcs.filter(n => n.status === 'dead');
    }

    // ===== 關係管理 =====

    /**
     * 新增關係
     */
    addRelationship(fromId, toId, type, revealed = false) {
        const exists = this.relationships.find(r =>
            (r.from === fromId && r.to === toId) ||
            (r.from === toId && r.to === fromId)
        );
        if (!exists) {
            this.relationships.push({ from: fromId, to: toId, type, revealed });
            return true;
        }
        return false;
    }

    /**
     * 揭露關係
     */
    revealRelationship(fromId, toId) {
        const rel = this.relationships.find(r =>
            (r.from === fromId && r.to === toId) ||
            (r.from === toId && r.to === fromId)
        );
        if (rel && !rel.revealed) {
            rel.revealed = true;
            return true;
        }
        return false;
    }

    // ===== 歷史記錄 =====

    /**
     * 新增歷史記錄
     */
    addHistoryEntry(role, text) {
        this.historyLog.push({ role, text });
    }

    /**
     * 取得最近的歷史記錄
     */
    getRecentHistory(count = 25) {
        return this.historyLog.slice(-count);
    }

    /**
     * 設定壓縮歷史摘要
     */
    setCompressedHistory(summary) {
        this.compressedHistory = summary;
    }

    // ===== 存檔系統 =====

    /**
     * 序列化為 JSON（用於存檔）
     */
    serialize() {
        return JSON.stringify({
            currentWorld: this.currentWorld,
            factionData: this.factionData,
            storyContext: this.storyContext,
            historyLog: this.historyLog.slice(-30), // 只保留最近 30 條
            currentOptions: this.currentOptions,
            playerCharacter: this.playerCharacter,
            npcs: this.npcs,
            relationships: this.relationships,
            fatePoints: this.fatePoints,
            currentState: this.currentState,
            calendar: this.calendar,
            doomClock: this.doomClock,
            doomThresholds: this.doomThresholds,
            lastDoomLevel: this.lastDoomLevel,
            triggeredThresholds: Array.from(this.triggeredThresholds),
            compressedHistory: this.compressedHistory,
            settings: {
                provider: this.settings.provider,
                model: this.settings.model,
                baseUrl: this.settings.baseUrl,
                streamingEnabled: this.settings.streamingEnabled,
                soundEnabled: this.settings.soundEnabled
            },
            timestamp: Date.now(),
            version: '2.1'
        });
    }

    /**
     * 從 JSON 還原（用於讀檔）
     */
    deserialize(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            this.currentWorld = data.currentWorld;
            this.factionData = data.factionData || [];
            this.storyContext = data.storyContext || '';
            this.historyLog = data.historyLog || [];
            this.currentOptions = data.currentOptions || [];
            this.playerCharacter = data.playerCharacter || this._createDefaultCharacter();
            this.npcs = data.npcs || [];
            this.relationships = data.relationships || [];
            this.fatePoints = data.fatePoints || 0;
            this.currentState = data.currentState;
            this.compressedHistory = data.compressedHistory || '';

            // 還原末日鐘狀態
            this.doomClock = data.doomClock || 0;
            this.doomThresholds = data.doomThresholds || [25, 50, 75, 100];
            this.lastDoomLevel = data.lastDoomLevel || 0;
            this.triggeredThresholds = new Set(data.triggeredThresholds || []);

            if (data.calendar) {
                this.calendar = data.calendar;
            }

            if (data.settings) {
                Object.assign(this.settings, data.settings);
            }

            return true;
        } catch (e) {
            console.error('GameState deserialize error:', e);
            return false;
        }
    }

    /**
     * 自動存檔到 localStorage
     */
    autoSave() {
        try {
            localStorage.setItem('rpg_autosave', this.serialize());
            return true;
        } catch (e) {
            console.warn('自動存檔失敗:', e);
            return false;
        }
    }

    /**
     * 從 localStorage 讀取自動存檔
     */
    loadAutoSave() {
        try {
            const saveStr = localStorage.getItem('rpg_autosave');
            if (!saveStr) return false;
            return this.deserialize(saveStr);
        } catch (e) {
            console.error('讀取存檔失敗:', e);
            return false;
        }
    }

    /**
     * 清除自動存檔
     */
    clearAutoSave() {
        localStorage.removeItem('rpg_autosave');
    }

    /**
     * 檢查是否有自動存檔
     */
    hasAutoSave() {
        return !!localStorage.getItem('rpg_autosave');
    }

    /**
     * 取得自動存檔資訊（不完整讀取）
     */
    getAutoSaveInfo() {
        try {
            const saveStr = localStorage.getItem('rpg_autosave');
            if (!saveStr) return null;
            const data = JSON.parse(saveStr);
            return {
                worldName: data.currentWorld?.name || '未知世界',
                timestamp: new Date(data.timestamp),
                fatePoints: data.fatePoints,
                npcCount: data.npcs?.length || 0
            };
        } catch (e) {
            return null;
        }
    }

    // ===== 存檔點系統 =====

    /**
     * 建立存檔點快照
     */
    createSavePoint(name, isMajor = false) {
        const snapshot = {
            currentWorld: JSON.parse(JSON.stringify(this.currentWorld)),
            factionData: JSON.parse(JSON.stringify(this.factionData)),
            npcs: JSON.parse(JSON.stringify(this.npcs)),
            relationships: JSON.parse(JSON.stringify(this.relationships)),
            historyLog: JSON.parse(JSON.stringify(this.historyLog)),
            calendar: { ...this.calendar },
            fatePoints: this.fatePoints,
            doomClock: this.doomClock,
            doomThresholds: [...this.doomThresholds],
            lastDoomLevel: this.lastDoomLevel,
            triggeredThresholds: new Set(this.triggeredThresholds),
            storyContext: this.storyContext,
            playerCharacter: JSON.parse(JSON.stringify(this.playerCharacter)),
            currentOptions: JSON.parse(JSON.stringify(this.currentOptions))
        };

        const savePoint = {
            id: `sp_${Date.now()}`,
            name: name || `${this.getCalendarString()} - ${this.storyContext.slice(0, 10)}...`,
            timestamp: Date.now(),
            calendarString: `${this.getCalendarString()} ${this.getTimeString()}`,
            snapshot,
            isMajor
        };

        this.savePoints.push(savePoint);

        // 限制存檔點數量
        const MAX_SAVE_POINTS = 50;
        while (this.savePoints.length > MAX_SAVE_POINTS) {
            const idx = this.savePoints.findIndex(sp => !sp.isMajor);
            if (idx >= 0) {
                this.savePoints.splice(idx, 1);
            } else {
                this.savePoints.shift();
            }
        }

        // 持久化存檔點
        this.persistSavePoints();

        return savePoint;
    }

    /**
     * 回溯到存檔點
     */
    revertToSavePoint(savePointId) {
        const savePoint = this.savePoints.find(sp => sp.id === savePointId);
        if (!savePoint) return { success: false, error: '存檔點不存在' };

        const cost = savePoint.isMajor ? 8 : 5;
        if (this.fatePoints < cost) {
            return { success: false, error: `命運點不足（需要 ${cost} 點）` };
        }

        // 消耗命運點
        this.spendFatePoints(cost);

        // 還原狀態
        const s = savePoint.snapshot;
        this.currentWorld = s.currentWorld;
        this.factionData = s.factionData;
        this.npcs = s.npcs;
        this.relationships = s.relationships;
        this.historyLog = s.historyLog;
        Object.assign(this.calendar, s.calendar);
        this.fatePoints = s.fatePoints;
        this.doomClock = s.doomClock || 0;
        this.doomThresholds = s.doomThresholds || [25, 50, 75, 100];
        this.lastDoomLevel = s.lastDoomLevel || 0;
        this.triggeredThresholds = s.triggeredThresholds || new Set();
        this.storyContext = s.storyContext;
        this.playerCharacter = s.playerCharacter;
        this.currentOptions = s.currentOptions;

        // 移除此存檔點之後的所有存檔點
        const index = this.savePoints.findIndex(sp => sp.id === savePointId);
        if (index >= 0) {
            this.savePoints = this.savePoints.slice(0, index + 1);
        }

        // 記錄回溯事件
        this.historyLog.push({
            role: 'Fate',
            text: `【命運回溯】時間倒流至「${savePoint.name}」`
        });

        this.persistSavePoints();

        return { success: true, savePoint };
    }

    /**
     * 持久化存檔點到 localStorage
     */
    persistSavePoints() {
        try {
            localStorage.setItem('rpg_savepoints', JSON.stringify(this.savePoints));
        } catch (e) {
            console.warn('存檔點持久化失敗:', e);
        }
    }

    /**
     * 從 localStorage 讀取存檔點
     */
    loadSavePoints() {
        try {
            const data = localStorage.getItem('rpg_savepoints');
            if (data) {
                this.savePoints = JSON.parse(data);
            }
        } catch (e) {
            this.savePoints = [];
        }
    }

    /**
     * 檢查並建立存檔點
     */
    checkAndCreateSavePoint(triggerType, eventName = '') {
        let isMajor = false;
        let name = '';

        switch (triggerType) {
            case 'risk':
                name = `${this.getCalendarString()} - 冒險抉擇`;
                break;
            case 'fate':
                name = `${this.getCalendarString()} - ${eventName || '命運事件'}`;
                isMajor = true;
                break;
            case 'newNPC':
                name = `${this.getCalendarString()} - 遇見${eventName}`;
                break;
            case 'monthly':
                const totalDays = (this.calendar.year - 1) * 120 + this.calendar.season * 30 + this.calendar.day;
                if (Math.floor(totalDays / 30) !== Math.floor(this.lastSavePointDay / 30)) {
                    name = `${this.getCalendarString()} - 月末紀錄`;
                    this.lastSavePointDay = totalDays;
                } else {
                    return null;
                }
                break;
            default:
                return null;
        }

        if (name) {
            return this.createSavePoint(name, isMajor);
        }
        return null;
    }

    // ===== 設定管理 =====

    /**
     * 設定 API Key 並自動偵測 Provider
     */
    setApiKey(key) {
        this.settings.apiKey = key;
        localStorage.setItem('gemini_api_key', key);

        // 自動偵測 Provider
        if (key.startsWith('sk-ant-')) {
            this.settings.provider = 'anthropic';
        } else if (key.startsWith('sk-')) {
            this.settings.provider = 'openai';
        } else if (key.startsWith('gsk_')) {
            this.settings.provider = 'groq';
            this.settings.baseUrl = 'https://api.groq.com/openai/v1';
        } else if (key.startsWith('sk-or-')) {
            this.settings.provider = 'openrouter';
            this.settings.baseUrl = 'https://openrouter.ai/api/v1';
        } else if (key === 'ollama' || key.startsWith('ollama:')) {
            this.settings.provider = 'ollama';
        } else {
            this.settings.provider = 'gemini';
        }
    }

    /**
     * 載入 API Key
     */
    loadApiKey() {
        const key = localStorage.getItem('gemini_api_key') || '';
        if (key) {
            this.setApiKey(key);
        }
        return key;
    }

    /**
     * 設定 LLM Provider
     */
    setProvider(providerName, model = '', baseUrl = '') {
        this.settings.provider = providerName;
        this.settings.model = model;
        this.settings.baseUrl = baseUrl;
    }

    /**
     * 啟用/停用流式傳輸
     */
    setStreamingEnabled(enabled) {
        this.settings.streamingEnabled = enabled;
    }
}

/**
 * GameManager - 遊戲管理器（單例模式）
 * 整合 GameState、LLM 服務、提示詞建構
 */
class GameManager {
    constructor() {
        this.state = new GameState();
        this.llm = null;
        this.promptBuilder = null;

        // 初始化
        this._init();
    }

    _init() {
        // 載入 API Key
        this.state.loadApiKey();
        this.state.loadSavePoints();

        // 初始化 LLM 服務（如果 llmService 可用）
        if (typeof llmService !== 'undefined') {
            this.llm = llmService;
            if (this.state.settings.apiKey) {
                this.llm.autoDetectProvider(this.state.settings.apiKey, {
                    model: this.state.settings.model,
                    baseUrl: this.state.settings.baseUrl
                });
            }
        }

        // 初始化提示詞建構器（如果 promptBuilder 可用）
        if (typeof promptBuilder !== 'undefined') {
            this.promptBuilder = promptBuilder;
        }
    }

    /**
     * 設定 API Key 並初始化 Provider
     */
    setApiKey(key) {
        this.state.setApiKey(key);

        if (this.llm) {
            this.llm.autoDetectProvider(key, {
                model: this.state.settings.model,
                baseUrl: this.state.settings.baseUrl
            });
            this.llm.setStreamingEnabled(this.state.settings.streamingEnabled);
        }
    }

    /**
     * 生成世界
     */
    async generateWorlds() {
        if (!this.llm || !this.promptBuilder) {
            throw new Error('LLM 服務或提示詞建構器未初始化');
        }

        const { system, user } = this.promptBuilder.buildWorldGeneration();
        return await this.llm.generate(user, system);
    }

    /**
     * 生成開場場景
     */
    async generateOpeningScene() {
        if (!this.llm || !this.promptBuilder) {
            throw new Error('LLM 服務或提示詞建構器未初始化');
        }

        const { system, user } = this.promptBuilder.buildOpeningScene(
            this.state.currentWorld,
            this.state.playerCharacter
        );
        return await this.llm.generate(user, system);
    }

    /**
     * 生成下一個場景
     */
    async generateNextScene(action) {
        if (!this.llm || !this.promptBuilder) {
            throw new Error('LLM 服務或提示詞建構器未初始化');
        }

        const { system, user } = this.promptBuilder.buildNextScene(
            this.state.currentWorld,
            this.state.storyContext,
            action,
            this.state.factionData,
            this.state.npcs,
            {
                getString: () => this.state.getCalendarString(),
                getTimeString: () => this.state.getTimeString()
            },
            this.state.playerCharacter
        );
        return await this.llm.generate(user, system);
    }

    /**
     * 生成帶骰子結果的場景
     */
    async generateDiceScene(action, diceResult) {
        if (!this.llm || !this.promptBuilder) {
            throw new Error('LLM 服務或提示詞建構器未初始化');
        }

        const { system, user } = this.promptBuilder.buildDiceScene(
            this.state.currentWorld,
            this.state.storyContext,
            action,
            this.state.factionData,
            this.state.npcs,
            {
                getString: () => this.state.getCalendarString(),
                getTimeString: () => this.state.getTimeString()
            },
            this.state.playerCharacter,
            diceResult
        );
        return await this.llm.generate(user, system);
    }

    /**
     * 總結歷史
     */
    async summarizeHistory() {
        if (!this.llm || !this.promptBuilder) {
            throw new Error('LLM 服務或提示詞建構器未初始化');
        }

        const { system, user } = this.promptBuilder.buildSummarizeHistory(
            this.state.currentWorld?.name || '未知',
            this.state.historyLog
        );
        return await this.llm.generate(user, system);
    }

    /**
     * 壓縮歷史記錄
     */
    async compressHistory() {
        if (!this.llm || !this.promptBuilder) {
            throw new Error('LLM 服務或提示詞建構器未初始化');
        }

        const { system, user } = this.promptBuilder.buildCompressHistory(
            this.state.historyLog
        );
        const result = await this.llm.generate(user, system);

        if (result?.summary) {
            this.state.setCompressedHistory(result.summary);
            // 清空舊的歷史記錄，只保留最近 5 條
            this.state.historyLog = this.state.historyLog.slice(-5);
        }

        return result;
    }

    /**
     * 取得 Provider 資訊
     */
    getProviderInfo() {
        return this.llm?.getProviderInfo() || null;
    }

    /**
     * 開始新遊戲
     */
    startNewGame() {
        this.state.reset();
        this.state.loadApiKey();
    }
}

// 建立全域 GameManager 實例（延遲初始化，等待其他模組載入）
let gameManager = null;

function initGameManager() {
    if (!gameManager) {
        gameManager = new GameManager();
    }
    return gameManager;
}

// 為了向後相容，暴露一些全域函數
function getGameState() {
    return gameManager?.state || null;
}

function getGameManager() {
    return gameManager;
}
