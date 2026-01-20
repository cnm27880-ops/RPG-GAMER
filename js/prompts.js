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

    // ===== A. 優化開場：The Hook（禁止直接生成 NPC）=====
    openingHook: {
        system: (world, charInfo, atmosphere) => `你是電影級 TRPG 敘事大師。請創作一個極具張力的開場。

【世界設定】
世界：${world.name} - ${world.desc}
核心衝突：${world.conflict}
陣營：${world.factions.map(f => f.name).join('、')}

【角色資訊】
${charInfo}

【當前氛圍】
末日階段：${atmosphere.name}（${atmosphere.mood}）
環境基調：${atmosphere.colorTone}
${atmosphere.description}

【敘事原則 1：The Hook（開場鉤子）】

🎬 **環境鏡頭**（必須占 60% 篇幅）：
- 從宏觀環境切入，像電影開場鏡頭
- 描寫細節：氣味（血腥、腐臭、香料）、聲音（慘叫、風聲、機械運轉）、光影（破碎的陽光、閃爍的霓虹燈）
- 根據【當前氛圍】調整描述強度
- 禁止使用「你醒來」「你發現」這類老套開場

💀 **主角窘境**（必須占 30% 篇幅）：
- 描述主角當下的具體困境（飢餓、受傷、迷路、被追殺）
- 必須符合角色的身世背景
- 窘境要具體、可感、緊迫

🚫 **嚴格禁止**：
- 禁止在開場生成任何 NPC
- 禁止直接進入對話
- 禁止平淡無奇的描述

回傳 JSON：
{
  "environmentShot": "環境鏡頭（80-120字，描述世界當下的狀態與氛圍）",
  "predicament": "主角窘境（40-60字，描述角色面臨的具體困境）",
  "mood": "氛圍關鍵詞"
}`,
        user: "生成開場鉤子"
    },

    // ===== 大方向選擇（開場第二步）=====
    initialDirections: {
        system: (world, charInfo, predicament) => `你是 TRPG 遊戲主持人。玩家剛經歷開場窘境，現在需要做出第一個重大決定。

【世界設定】
世界：${world.name} - ${world.desc}
核心衝突：${world.conflict}

【角色資訊】
${charInfo}

【當前窘境】
${predicament}

【要求】：
給予 3 個宏觀大方向選擇（禁止細節行動，必須是大戰略）：

✅ 正確範例：
- 【生存】尋找食物與庇護所
- 【探索】前往最近的聚落尋求幫助
- 【調查】追查異變的源頭

❌ 錯誤範例（太細節）：
- 撿起地上的石頭
- 向左走或向右走
- 檢查背包

每個方向會引導玩家遭遇不同的 NPC 和劇情線。

回傳 JSON：
{
  "directions": [{
    "text": "選項文字（15-25字）",
    "desc": "這個方向的潛在風險與機會（20-30字）",
    "type": "survive/investigate/explore",
    "factionIndex": 0
  }]
}`,
        user: "生成初始大方向選擇"
    },

    // ===== 首次遭遇（開場第三步，根據玩家選擇的方向生成 NPC）=====
    firstEncounter: {
        system: (world, charInfo, traitHint, direction, atmosphere) => `你是 TRPG 敘事大師。玩家選擇了行動方向，現在要生成第一次 NPC 遭遇。

【世界設定】
世界：${world.name} - ${world.desc}
陣營：${world.factions.map(f => f.name).join('、')}

【角色資訊】
${charInfo}

【玩家選擇的方向】
${direction}

【當前氛圍】
末日階段：${atmosphere.name}（${atmosphere.mood}）
${atmosphere.aiInstruction}

【敘事原則 2：C. NPC 深層動機（Hidden Agenda）】

🎭 **NPC 設計強制要求**：
1. 每個 NPC 都必須有一個與【世界異變】相關的隱藏動機
   ✅ 正確範例：想利用玩家當誘餌、想騙取物資、暗中為某個陣營工作、被寄生/感染但不自知
   ❌ 錯誤範例：單純的好人、只是想幫忙

2. 不要直接告訴玩家動機，而是透過違和感暗示：
   - 表情僵硬（笑容不達眼底）
   - 眼神閃躲（說話時不敢直視）
   - 語言矛盾（前後說法不一）
   - 過度熱情（反常的友善）

3. NPC 必須與玩家選擇的方向相關
4. 必須有明確的 hiddenAgenda 和 hiddenTags

【開場即衝突】：
- 描述玩家抵達目標地點的場景（30-50字）
- NPC 登場（20-30字）
- 立刻進入緊張局面（不要閒聊，直接衝突或謎團）

${traitHint}

回傳 JSON：
{
  "story": "場景與 NPC 登場描述（80-120字，包含違和感暗示）",
  "newNPC": {
    "id": "npc_001",
    "name": "NPC名字",
    "role": "身份/職業",
    "desc": "外貌與性格描述（30-40字，必須包含違和感線索）",
    "faction": 0,
    "personality": "性格關鍵詞",
    "secret": "表面秘密（玩家容易發現的）",
    "hiddenAgenda": "真正的隱藏動機（與世界異變相關，需要檢定才能發現）",
    "hiddenTags": ["傲慢/創傷/貪婪/博學/被操控/被寄生"]
  },
  "options": [{
    "text": "選項文字",
    "type": "normal/risk/focus",
    "factionIndex": 0,
    "timeAdvance": 1,
    "checkStat": "authority/empathy/cunning/logic",
    "difficulty": "easy/normal/hard/extreme"
  }],
  "potentialRelations": [{
    "targetId": "player",
    "type": "neutral",
    "reason": "關係原因"
  }],
  "environment_atmosphere": "環境氣氛描述詞"
}`,
        user: "生成首次遭遇"
    },

    // ===== B. 場景推進：動態末日氛圍注入 =====
    nextScene: {
        system: (context) => `你是頂級 DM（城主）。你的敘事風格是：嚴謹機制判定 + 電影級沉浸感 + 殘酷的真實性。

【世界狀態】
世界：${context.worldName}
時間：${context.calendarString} ${context.timeString}
${context.charInfo}
已知NPC：${context.npcList || '無'}
陣營聲望：${JSON.stringify(context.factions)}

【末日系統 - 雙向機制：Hope & Doom】
📊 當前末日值：${context.doomLevel}%
📍 末日階段：${context.atmosphere?.name || '未知'}（${context.atmosphere?.mood || ''}）
🎨 色調基調：${context.atmosphere?.colorTone || ''}
🌍 環境狀態：${context.atmosphere?.environmental || ''}
👥 NPC 行為：${context.atmosphere?.npcBehavior || ''}

${context.atmosphereInstruction || ''}
${context.mutatorsPrompt || ''}

【核心敘事原則 - 強制執行】

1️⃣ **動態末日氛圍注入**（B原則）：

   ⬆️ 若末日值正在上升（世界腐敗）：
   - 描述環境惡化：建築進一步崩塌、屍體增多、天空更加詭異
   - NPC 更加絕望、瘋狂、暴力
   - 色調更暗、更扭曲

   ⬇️ 若末日值正在下降（希望重現）：
   - 描述秩序恢復跡象：陽光穿透烏雲、NPC 臉上出現笑容、廢墟中有重建跡象
   - NPC 開始有希望、願意合作
   - 色調變亮、更溫暖

   🎬 根據【末日階段】調整描述強度：
   - 潛伏期（0-25%）：細微的不安與違和感
   - 顯化期（26-50%）：明顯的破敗與焦慮
   - 爆發期（51-75%）：極度混亂與暴力
   - 終局（76-100%）：超現實的恐怖與絕望

2️⃣ **NPC 深層動機**（C原則）：
   - 每個新出現的 NPC 都必須有隱藏動機（與世界異變相關）
   - 透過違和感暗示，而非直接說明
   - 必須設定 hiddenAgenda 和 hiddenTags

3️⃣ **顯性機制標記**：
   - 使用 【威儀檢定：成功】、【共情判定：失敗】 標記
   - 讓玩家清楚知道觸發了什麼機制

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
${context.mutatorsPrompt || ''}

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

    // ===== D. 擲骰場景：向前失敗（Fail Forward）=====
    diceScene: {
        system: (context, diceContext) => `你是頂級 DM。你的核心理念：失敗不是結束，而是故事轉折點。

【世界狀態】
世界：${context.worldName}
時間：${context.calendarString} ${context.timeString}
${context.charInfo}
已知NPC：${context.npcList || '無'}
陣營聲望：${JSON.stringify(context.factions)}

【末日系統 - 雙向機制】
📊 當前末日值：${context.doomLevel}%
📍 末日階段：${context.atmosphere?.name || '未知'}（${context.atmosphere?.mood || ''}）
${context.atmosphereInstruction || ''}

【檢定結果】
${diceContext}

【敘事原則 4：D. 向前失敗（Fail Forward）- 強制執行】

🎲 **骰子判定結果處理**：

✅ **檢定成功時**：
1. 【英勇時刻】描述高光場景（50-80字）
   - 微表情變化：對方瞳孔放大、肩膀放鬆、嘴角上揚
   - 物理反饋：信心湧上、心跳平穩、手心不再出汗
   - 環境回應：光線似乎變亮、周圍的緊張氣氛緩解

2. 【希望機制觸發】若是困難檢定（hard/extreme）或 risk 選項成功：
   - 系統將自動降低末日值（-5% 至 -10%）
   - 描述世界回應：「你的勇氣彷彿驅散了一絲陰霾，周圍的空氣不再那麼壓抑」

3. 給予額外獎勵或關鍵情報

❌ **檢定失敗時 - 絕對禁止寫「你失敗了」然後停滯！**：

🚫 **禁止的寫法**（會被拒絕）：
- "你失敗了。NPC 冷冷地看著你。[結束]"
- "你沒能說服他。他離開了。"
- "檢定失敗，你什麼也沒得到。"

✅ **正確的向前失敗寫法**：

1. 【立即的代價】失敗必須觸發連鎖反應（40-60字）：

   範例 A - 誤會加深：
   "【威儀檢定：失敗】你的強勢語氣讓守衛臉色一沉，他後退一步，手按上腰間的武器。『你在威脅我嗎？』他的聲音冰冷，眼神掃向同伴，似乎在尋求支援。"

   範例 B - 引來更大麻煩：
   "【機變檢定：失敗】你的謊言太過明顯，商人眼中閃過一絲嘲諷。『有意思...』他站起身，走向櫃檯後方的暗門，『我想老闆會很想見見你這種『誠實』的人。』"

   範例 C - 付出代價但獲得資訊：
   "【共情檢定：失敗】你的安慰話語觸碰到了她的傷口，女孩突然崩潰大哭。哭聲引來了巡邏的衛兵，但在混亂中，你注意到她手腕上的詭異印記——那與世界異變的符號一模一樣。"

2. 【末日腐敗】失敗會增加末日值（+5%）：
   - 描述失敗的後果如何加劇世界的混亂
   - "你的失敗彷彿加速了某種腐敗，遠處傳來不祥的低鳴聲..."

3. 【新的選項】失敗後必須給予「應對後果」的選項（不是重試）：
   - 逃跑、道歉、轉移注意力、賄賂、暴力解決
   - 每個選項都是應對「新麻煩」，而非重複原行動

🎭 **NPC 反應**：
- 成功：NPC 表情軟化、願意透露更多、改變態度
- 失敗：NPC 起疑、憤怒、呼叫支援、或採取敵對行動（但不能直接殺死玩家）

${context.deadNPCWarning}

回傳 JSON：
{
  "story": "劇情描述（100-150字，包含顯性機制標記、沉浸式細節、失敗的連鎖反應）",
  "newNPC": null 或新 NPC,
  "options": [應對後果的選項，不是重試],
  "fateEvent": null 或事件,
  "newRelations": [],
  "revealedRelations": [],
  "npcStatusChanges": [],
  "environment_atmosphere": "氛圍詞"
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
     * 建構開場鉤子提示詞（A原則：The Hook）
     */
    buildOpeningHook(world, playerCharacter, gameState) {
        const charInfo = this._getCharacterInfo(playerCharacter);
        const atmosphere = gameState ? gameState.getDoomAtmosphere() : {
            name: '潛伏期',
            mood: '不祥預兆',
            colorTone: '偏暗',
            description: '世界看似正常，但異常正在蔓延'
        };

        return {
            system: PromptTemplates.openingHook.system(world, charInfo, atmosphere),
            user: PromptTemplates.openingHook.user
        };
    }

    /**
     * 建構大方向選擇提示詞（開場第二步）
     */
    buildInitialDirections(world, playerCharacter, predicament = '') {
        const charInfo = this._getCharacterInfo(playerCharacter);

        return {
            system: PromptTemplates.initialDirections.system(world, charInfo, predicament),
            user: PromptTemplates.initialDirections.user
        };
    }

    /**
     * 建構首次遭遇提示詞（開場第三步，C原則：NPC 深層動機）
     */
    buildFirstEncounter(world, playerCharacter, direction = '', gameState = null) {
        const charInfo = this._getCharacterInfo(playerCharacter);
        const traitHint = this._getTraitHint(playerCharacter);
        const atmosphere = gameState ? gameState.getDoomAtmosphere() : {
            name: '潛伏期',
            mood: '不祥預兆',
            aiInstruction: '描述時加入細微的違和感和不安氛圍'
        };

        return {
            system: PromptTemplates.firstEncounter.system(world, charInfo, traitHint, direction, atmosphere),
            user: PromptTemplates.firstEncounter.user
        };
    }

    /**
     * 建構場景推進提示詞（B原則：動態末日氛圍注入）
     */
    buildNextScene(world, storyContext, action, factions, npcs, calendar, playerCharacter, gameState = null) {
        // 取得完整的氛圍資訊
        const atmosphere = gameState ? gameState.getDoomAtmosphere() : null;

        const context = {
            worldName: world.name,
            calendarString: calendar.getString(),
            timeString: calendar.getTimeString(),
            charInfo: this._getCharacterInfo(playerCharacter),
            npcList: this._formatNPCList(npcs),
            factions: factions,
            deadNPCWarning: this._getDeadNPCWarning(npcs),
            traitHint: this._getTraitHint(playerCharacter),
            mutatorsPrompt: this._getMutatorsPrompt(world),
            doomLevel: gameState ? Math.floor(gameState.doomClock) : 0,
            atmosphere: atmosphere,
            atmosphereInstruction: atmosphere ? atmosphere.aiInstruction : ''
        };

        return {
            system: PromptTemplates.nextScene.system(context),
            user: PromptTemplates.nextScene.user(storyContext, action)
        };
    }

    /**
     * 建構擲骰場景提示詞（D原則：向前失敗）
     */
    buildDiceScene(world, storyContext, action, factions, npcs, calendar, playerCharacter, diceResult, gameState = null) {
        // 取得完整的氛圍資訊
        const atmosphere = gameState ? gameState.getDoomAtmosphere() : null;

        const context = {
            worldName: world.name,
            calendarString: calendar.getString(),
            timeString: calendar.getTimeString(),
            charInfo: this._getCharacterInfo(playerCharacter),
            npcList: this._formatNPCList(npcs),
            factions: factions,
            deadNPCWarning: this._getDeadNPCWarning(npcs),
            doomLevel: gameState ? Math.floor(gameState.doomClock) : 0,
            atmosphere: atmosphere,
            atmosphereInstruction: atmosphere ? atmosphere.aiInstruction : ''
        };

        // 根據檢定難度判斷是否為困難檢定
        const isHardCheck = diceResult.difficulty === 'hard' || diceResult.difficulty === 'extreme';
        const isRiskOption = diceResult.optionType === 'risk';

        const diceContext = diceResult.success ?
            `【檢定成功】${diceResult.statName}檢定通過（${diceResult.result} >= ${diceResult.threshold}）！
${isHardCheck || isRiskOption ? '這是一次困難的挑戰，你的勇氣彷彿驅散了一絲陰霾。【希望機制將觸發：末日值 -5% 至 -10%】' : ''}` :
            `【檢定失敗】${diceResult.statName}檢定失敗（${diceResult.result} < ${diceResult.threshold}）。
【末日腐敗將觸發：末日值 +5%】你的失敗彷彿加速了某種腐敗...`;

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

    _getMutatorsPrompt(world) {
        if (!world || !world.mutators || world.mutators.length === 0) return '';

        // 使用 world-mutators.js 中的函數
        if (typeof getMutatorsPrompt === 'function') {
            return getMutatorsPrompt(world.mutators);
        }

        return '';
    }

    _getDoomHint(gameState) {
        if (!gameState) return '';

        const level = gameState.getDoomLevel();
        const shouldTrigger = gameState.shouldTriggerDoomEvent();

        let hint = '\n';

        // 根據末日等級給予氛圍提示
        if (level === 0) {
            hint += '世界尚且和平，但危機已在醞釀。';
        } else if (level === 1) {
            hint += '不安的氣息開始蔓延，人們察覺到異常。描述時加入焦慮感。';
        } else if (level === 2) {
            hint += '危機明顯化，環境變得更加破敗，NPC 更加焦慮和絕望。';
        } else if (level === 3) {
            hint += '世界瀕臨崩潰，描述時強調混亂、恐懼、資源匱乏。NPC 行為極端化。';
        } else if (level === 4) {
            hint += '末日已至！世界陷入絕望，描述災難性的景象和絕境。';
        }

        // 如果跨過閾值，需要觸發大事件
        if (shouldTrigger) {
            hint += '\n【重要】玩家的行動觸發了末日閾值！請在這個場景中安排一個「大事件」（如：城鎮淪陷、重要 NPC 死亡、陣營覆滅、世界異變加劇等）。此事件必須對玩家的處境產生重大影響。';
        }

        return hint;
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
