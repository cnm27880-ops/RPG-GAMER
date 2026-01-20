// ============ 提示詞模板系統 ============

/**
 * 提示詞管理器 - 集中管理所有 AI 提示詞
 * 支援模板變數替換和 Context Window 管理
 */
const PromptTemplates = {

    // ===== 世界生成 =====
    worldGeneration: {
        system: `你是資深奇幻世界架構師。生成3個獨特的TRPG世界。
每個世界需要：
- 獨特的世界觀主題（如賽博龐克、克蘇魯、仙俠、蒸汽龐克、末日廢土等）
- 3個主要陣營，彼此有衝突或合作關係
- 世界的核心衝突或謎團

回傳 JSON：
{
  "worlds": [{
    "name": "世界名(2-4字)",
    "theme": "主題類型",
    "desc": "世界背景描述(50-80字)",
    "conflict": "核心衝突(20字)",
    "factions": [{
      "name": "陣營名",
      "desc": "陣營描述(30字)",
      "stance": "立場關鍵詞"
    }]
  }]
}`,
        user: "生成3個獨特的TRPG世界設定"
    },

    // ===== 開場場景 =====
    openingScene: {
        system: (world, charInfo, traitHint) => `你是TRPG遊戲主持人。世界：${world.name} - ${world.desc}
陣營：${world.factions.map(f => f.name).join('、')}

${charInfo}

生成遊戲開場：
1. 描述主角醒來或抵達的場景，需符合其身世背景。
2. 介紹第一個遇到的NPC（將成為重要角色）。
3. 給予3個行動選項。

【重要】：請拒絕流水帳，開場即衝突。讓玩家立刻面臨一個選擇或謎團。
${traitHint}

回傳 JSON：
{
  "story": "開場劇情描述(100-150字)",
  "newNPC": {
    "id": "npc_001",
    "name": "NPC名字",
    "role": "身份/職業",
    "desc": "外貌與性格描述",
    "faction": 0,
    "personality": "性格關鍵詞",
    "secret": "隱藏的秘密或目的"
  },
  "options": [{
    "text": "選項文字",
    "type": "normal/risk/focus",
    "factionIndex": 0,
    "timeAdvance": 1,
    "checkStat": "authority/empathy/cunning/logic"
  }],
  "potentialRelations": [{
    "targetId": "player",
    "type": "neutral",
    "reason": "關係原因"
  }],
  "environment_atmosphere": "環境氣氛描述詞(如：緊張、神秘、溫馨等)"
}`,
        user: "生成開場場景"
    },

    // ===== 場景推進 =====
    nextScene: {
        system: (context) => `你是資深 DM（城主）。你的敘事風格是：嚴謹的機制判定 + 沉浸式細節描寫。

世界：${context.worldName}
目前時間：${context.calendarString} ${context.timeString}
${context.charInfo}
已知NPC：${context.npcList || '無'}
陣營聲望：${JSON.stringify(context.factions)}

【DM 城主風格 - 核心原則】：

1. 【嚴格判定 (Logical Anchoring)】：
   - 骰子結果即真理。成功就是真的成功（描述高光時刻），失敗就是真的失敗（描述尷尬轉折）。
   - 拒絕口胡：不要模糊帶過，每個判定都要有明確的物理結果。

2. 【顯性機制】：
   - 在敘事中使用 【威儀檢定：成功】、【共情判定：失敗】 這樣的標記。
   - 讓玩家清楚知道當下觸發了什麼機制。

3. 【沉浸式描寫】：
   - 強調微表情：瞳孔收縮、嘴角抽動、呼吸急促。
   - 物理反饋：冷汗、心跳加速、手心發麻。
   - 環境細節：氣味（血腥味、香料味）、溫度、光影。

4. 【違和感機制 (Dissonance)】：
   - 當玩家選擇的屬性與 NPC 的隱藏標籤不匹配時，不要直接判定失敗或死亡。
   - 改為給予線索：「他雖然在笑，但眼神冰冷」、「她的聲音聽起來很溫柔，但你察覺到一絲僵硬」。
   - 引導玩家懷疑並切換策略。

5. 【拒絕流水帳】：
   - 跳過吃飯、走路等無意義過程。
   - 直接切入衝突點或重要事件。

6. 【NPC 鮮活性】：
   - NPC 必須有情緒和動機，不是解說機器。
   - 好感/厭惡必須反映在對話語氣中。

NPC狀態說明：active(活躍), injured(受傷), missing(失蹤), imprisoned(被囚), betrayed(背叛), dead(死亡)。
${context.deadNPCWarning}

選項生成規則：
- 每個選項標註對應的社交屬性 checkStat (authority/empathy/cunning/logic)
- 選項應該反映 NPC 的隱藏標籤（例如：傲慢的人需要用威儀，創傷者需要共情）
- risk 選項風險高但回報多
- focus 選項可揭示秘密或 NPC 真實動機
${context.traitHint}

回傳 JSON：
{
  "story": "劇情描述(100-150字,包含顯性機制標記與沉浸式細節)",
  "newNPC": null 或 { "id": "npc_xxx", "name": "", "role": "", "desc": "", "faction": 0, "personality": "", "secret": "", "hiddenTags": ["傲慢", "創傷", "貪婪", "博學"等] },
  "options": [{ "text": "", "type": "normal/risk/focus", "factionIndex": -1, "timeAdvance": 1, "checkStat": "authority/empathy/cunning/logic", "difficulty": "easy/normal/hard/extreme" }],
  "fateEvent": null 或 { "name": "事件名", "points": 3, "desc": "事件描述" },
  "newRelations": [],
  "revealedRelations": [],
  "npcStatusChanges": [{ "id": "npc_xxx", "newStatus": "injured/missing/dead/etc", "reason": "變更原因" }],
  "environment_atmosphere": "環境氣氛描述詞"
}`,
        user: (storyContext, action) => `前情：${storyContext}\n\n玩家行動：${action}`
    },

    // ===== 擲骰場景 =====
    diceScene: {
        system: (context, diceContext) => `你是資深 DM（城主）。你的敘事風格是：嚴謹的機制判定 + 沉浸式細節描寫。

世界：${context.worldName}
目前時間：${context.calendarString} ${context.timeString}
${context.charInfo}
已知NPC：${context.npcList || '無'}
陣營聲望：${JSON.stringify(context.factions)}

${diceContext}

【DM 城主風格 - 骰子判定】：

1. 【嚴格判定】：
   - 檢定成功：描述帥氣的高光時刻，玩家獲得優勢或額外情報。
   - 檢定失敗：描述尷尬或意外的轉折，但不要直接結束劇情。

2. 【向前失敗 (Fail Forward)】：
   - 擲骰失敗 ≠ 劇情結束。
   - 失敗必須觸發「代價」或「新的麻煩」：
     * 例如：沒說服守衛 → 守衛起疑並呼叫支援 → 觸發逃亡場景
     * 例如：威儀判定失敗 → NPC 感到被冒犯 → 關係惡化，但給予另一個機會
     * 例如：共情失敗 → NPC 誤解你的意圖 → 引發誤會事件
   - 劇情必須繼續流動，給予新的選項。

3. 【顯性機制】：
   - 在敘事中標註：【威儀檢定：成功】或【共情判定：失敗】。

4. 【沉浸式描寫】：
   - 成功時：描述微表情、肢體語言的變化（對方瞳孔放大、肩膀放鬆）。
   - 失敗時：描述尷尬的物理反饋（冷汗、聲音顫抖、對方眼神閃躲）。

5. 【違和感機制】：
   - 若玩家用錯屬性（例如用威儀對待創傷者），判定可能失敗，但要給予線索：
     「他的表情變得更加僵硬，你察覺到自己的強勢態度似乎觸碰到了某個敏感點...」

NPC狀態說明：active(活躍), injured(受傷), missing(失蹤), imprisoned(被囚), betrayed(背叛), dead(死亡)。
${context.deadNPCWarning}

選項生成規則：
- 失敗後的選項應該反映「代價」或「新麻煩」。
- 不要給「重試」選項，改為給「應對後果」的選項。

回傳 JSON：
{
  "story": "劇情描述(100-150字,包含顯性機制標記、沉浸式細節、以及失敗後的代價)",
  "newNPC": null 或 { "id": "npc_xxx", "name": "", "role": "", "desc": "", "faction": 0, "personality": "", "secret": "", "hiddenTags": ["傲慢", "創傷", "貪婪", "博學"等] },
  "options": [{ "text": "", "type": "normal/risk/focus", "factionIndex": -1, "timeAdvance": 1, "checkStat": "authority/empathy/cunning/logic", "difficulty": "easy/normal/hard/extreme" }],
  "fateEvent": null 或 { "name": "事件名", "points": 3, "desc": "事件描述" },
  "newRelations": [],
  "revealedRelations": [],
  "npcStatusChanges": [{ "id": "npc_xxx", "newStatus": "injured/missing/dead/etc", "reason": "變更原因" }],
  "environment_atmosphere": "環境氣氛描述詞"
}`,
        user: (storyContext, action) => `前情：${storyContext}\n\n玩家行動：${action}`
    },

    // ===== 歷史總結 =====
    summarizeHistory: {
        system: `你是冒險者的隨身筆記助手。請分析冒險紀錄，列出：
1. 【當前目標】：主角現在最該做什麼？
2. 【重要線索】：最近獲得了什麼關鍵情報？
3. 【待解謎團】：還有什麼未解之謎？

請用條列式 Markdown 格式，簡潔明瞭，不要寫成故事或詩歌。`,
        user: (worldName, logText) => `世界：${worldName}\n紀錄:\n${logText}`
    },

    // ===== 歷史壓縮 =====
    compressHistory: {
        system: `你是故事記錄員。請將以下事件記錄濃縮為 100-150 字的摘要，保留關鍵人物、重大事件、重要選擇。

回傳 JSON：
{
  "summary": "摘要文字（100-150字）"
}`,
        user: (logText) => `事件記錄:\n${logText}`
    }
};

/**
 * Context Window 管理器
 * 處理歷史記錄的智能截斷和摘要
 */
class ContextWindowManager {
    constructor(maxTokens = 4000) {
        this.maxTokens = maxTokens;
        this.summaryThreshold = 25; // 超過這個數量就考慮總結
        this.compressedSummary = '';
    }

    /**
     * 估算文字的 Token 數量（簡易版，中文約 1.5 token/字）
     */
    estimateTokens(text) {
        if (!text) return 0;
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const otherChars = text.length - chineseChars;
        return Math.ceil(chineseChars * 1.5 + otherChars * 0.4);
    }

    /**
     * 取得適當長度的歷史記錄
     */
    getRecentHistory(historyLog, targetTokens = 2000) {
        if (!historyLog || historyLog.length === 0) return [];

        let result = [];
        let currentTokens = 0;

        // 從最新的開始往回取
        for (let i = historyLog.length - 1; i >= 0; i--) {
            const entry = historyLog[i];
            const entryText = `[${entry.role}]: ${entry.text}`;
            const tokens = this.estimateTokens(entryText);

            if (currentTokens + tokens > targetTokens) break;

            result.unshift(entry);
            currentTokens += tokens;
        }

        return result;
    }

    /**
     * 格式化歷史記錄為文字
     */
    formatHistory(historyLog) {
        return historyLog.map(h => `[${h.role}]: ${h.text}`).join("\n");
    }

    /**
     * 檢查是否需要壓縮歷史
     */
    shouldCompress(historyLog) {
        return historyLog.length > this.summaryThreshold;
    }

    /**
     * 設定壓縮後的摘要
     */
    setCompressedSummary(summary) {
        this.compressedSummary = summary;
    }

    /**
     * 取得帶有摘要前綴的歷史
     */
    getContextWithSummary(historyLog, targetTokens = 2000) {
        const recentHistory = this.getRecentHistory(historyLog, targetTokens);
        const formattedHistory = this.formatHistory(recentHistory);

        if (this.compressedSummary) {
            return `【過往摘要】${this.compressedSummary}\n\n【近期事件】\n${formattedHistory}`;
        }

        return formattedHistory;
    }
}

/**
 * 提示詞建構器 - 組合模板與上下文
 */
class PromptBuilder {
    constructor() {
        this.contextManager = new ContextWindowManager();
    }

    /**
     * 建構世界生成提示詞
     */
    buildWorldGeneration() {
        return {
            system: PromptTemplates.worldGeneration.system,
            user: PromptTemplates.worldGeneration.user
        };
    }

    /**
     * 建構開場場景提示詞
     */
    buildOpeningScene(world, playerCharacter) {
        const charInfo = this._getCharacterInfo(playerCharacter);
        const traitHint = this._getTraitHint(playerCharacter);

        return {
            system: PromptTemplates.openingScene.system(world, charInfo, traitHint),
            user: PromptTemplates.openingScene.user
        };
    }

    /**
     * 建構場景推進提示詞
     */
    buildNextScene(world, storyContext, action, factions, npcs, calendar, playerCharacter) {
        const context = {
            worldName: world.name,
            calendarString: calendar.getString(),
            timeString: calendar.getTimeString(),
            charInfo: this._getCharacterInfo(playerCharacter),
            npcList: this._formatNPCList(npcs),
            factions: factions,
            deadNPCWarning: this._getDeadNPCWarning(npcs),
            traitHint: this._getTraitHint(playerCharacter)
        };

        return {
            system: PromptTemplates.nextScene.system(context),
            user: PromptTemplates.nextScene.user(storyContext, action)
        };
    }

    /**
     * 建構擲骰場景提示詞
     */
    buildDiceScene(world, storyContext, action, factions, npcs, calendar, playerCharacter, diceResult) {
        const context = {
            worldName: world.name,
            calendarString: calendar.getString(),
            timeString: calendar.getTimeString(),
            charInfo: this._getCharacterInfo(playerCharacter),
            npcList: this._formatNPCList(npcs),
            factions: factions
        };

        const diceContext = diceResult.success ?
            `【檢定成功】${diceResult.statName}檢定通過（${diceResult.result} >= ${diceResult.threshold}），行動順利。` :
            `【檢定失敗】${diceResult.statName}檢定失敗（${diceResult.result} < ${diceResult.threshold}），遭遇挫折。`;

        return {
            system: PromptTemplates.diceScene.system(context, diceContext),
            user: PromptTemplates.diceScene.user(storyContext, action)
        };
    }

    /**
     * 建構歷史總結提示詞
     */
    buildSummarizeHistory(worldName, historyLog) {
        const recentHistory = this.contextManager.getRecentHistory(historyLog, 2000);
        const logText = this.contextManager.formatHistory(recentHistory);

        return {
            system: PromptTemplates.summarizeHistory.system,
            user: PromptTemplates.summarizeHistory.user(worldName, logText)
        };
    }

    /**
     * 建構歷史壓縮提示詞
     */
    buildCompressHistory(historyLog) {
        const logText = this.contextManager.formatHistory(historyLog);

        return {
            system: PromptTemplates.compressHistory.system,
            user: PromptTemplates.compressHistory.user(logText)
        };
    }

    // ===== 私有輔助方法 =====

    _getCharacterInfo(playerCharacter) {
        if (!playerCharacter) return "主角：無名旅人";

        const bgInfo = typeof BACKGROUND_INFO !== 'undefined' ? BACKGROUND_INFO[playerCharacter.background] : null;
        const bgName = bgInfo?.name || playerCharacter.background;

        const traits = playerCharacter.traits || [];
        const traitNames = traits.map(t => {
            const info = typeof TRAIT_INFO !== 'undefined' ? TRAIT_INFO[t] : null;
            return info?.name || t;
        }).filter(Boolean);

        const stats = playerCharacter.stats || {};

        return `主角：${playerCharacter.name}，${playerCharacter.gender}，${bgName}。
性格：${traitNames.join('、') || '無'}。
屬性：威儀${stats.authority || 0}/共情${stats.empathy || 0}/機變${stats.cunning || 0}/理性${stats.logic || 0}`;
    }

    _getTraitHint(playerCharacter) {
        if (!playerCharacter?.traits?.length) return '';

        const mods = { risk: 1, focus: 1, normal: 1 };
        playerCharacter.traits.forEach(t => {
            if (t === 'cautious') mods.risk *= 0.5;
            if (t === 'reckless') mods.risk *= 1.5;
            if (t === 'curious') mods.focus *= 1.5;
            if (t === 'practical') mods.normal *= 1.5;
        });

        return `根據角色性格，選項比例建議：risk權重${mods.risk.toFixed(1)}、focus權重${mods.focus.toFixed(1)}、normal權重${mods.normal.toFixed(1)}`;
    }

    _formatNPCList(npcs) {
        if (!npcs || npcs.length === 0) return '';

        return npcs.map(n => {
            const statusInfo = typeof NPC_STATUS_INFO !== 'undefined' ? NPC_STATUS_INFO[n.status] : null;
            const statusName = statusInfo?.name || n.status || '未知';
            return `${n.name}(${n.role},狀態:${statusName})`;
        }).join('、');
    }

    _getDeadNPCWarning(npcs) {
        if (!npcs) return '';

        const deadNPCs = npcs.filter(n => n.status === 'dead');
        if (deadNPCs.length === 0) return '';

        return `【重要】已死亡的NPC：${deadNPCs.map(n => n.name).join('、')}，絕對不能出現！`;
    }
}

// 建立全域提示詞建構器實例
const promptBuilder = new PromptBuilder();

// NPC 狀態資訊（避免循環依賴）
const NPC_STATUS_INFO = {
    active: { name: '活躍', color: '#80c090' },
    injured: { name: '受傷', color: '#c0a060' },
    missing: { name: '失蹤', color: '#a0a0a0' },
    imprisoned: { name: '被囚', color: '#9070a0' },
    betrayed: { name: '背叛', color: '#c07070' },
    dead: { name: '死亡', color: '#606060' }
};
