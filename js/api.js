// ============ API 服務與 AI 邏輯 ============
// 此檔案現在作為向後相容層，內部使用新的 LLM Provider 系統

// JSON 容錯解析函數（也被 llm-providers.js 使用）
function tryParseJSON(text) {
    if (!text || typeof text !== 'string') return null;
    try { return JSON.parse(text); } catch (e) {}
    try {
        let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        return JSON.parse(cleaned);
    } catch (e) {}
    try {
        let cleaned = text.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
    } catch (e) {}
    try {
        let cleaned = text.replace(/'/g, '"');
        return JSON.parse(cleaned);
    } catch (e) {}
    try {
        const objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) return JSON.parse(objMatch[0].replace(/,\s*([}\]])/g, '$1'));
    } catch (e) {}
    return null;
}

/**
 * GeminiService - 向後相容的 AI 服務類別
 * 內部委託給新的 LLM Provider 系統
 */
class GeminiService {
    constructor() {
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
        this._useNewArchitecture = typeof llmService !== 'undefined';
        this._initialized = false;
    }

    /**
     * 確保 Provider 已初始化
     */
    _ensureInitialized() {
        if (this._initialized) return;

        if (this._useNewArchitecture && apiKey) {
            llmService.autoDetectProvider(apiKey);
            llmService.setStreamingEnabled(
                typeof gameManager !== 'undefined' && gameManager?.state?.settings?.streamingEnabled
            );
            this._initialized = true;
        }
    }

    /**
     * 核心呼叫函數：支援 Gemini、OpenAI、Claude 等格式
     * 自動偵測 API Key 類型
     */
    async call(prompt, systemInstruction, retryCount = 0) {
        const MAX_RETRIES = 2;

        if (!apiKey) {
            showError("請先設定 API Key");
            return null;
        }

        // 嘗試使用新架構
        if (this._useNewArchitecture) {
            this._ensureInitialized();
            try {
                const result = await llmService.generate(prompt, systemInstruction);
                if (result) return result;
            } catch (e) {
                console.error('LLM Provider error:', e);
                // 如果新架構失敗，回退到舊架構
            }
        }

        // 舊架構回退邏輯
        return await this._legacyCall(prompt, systemInstruction, retryCount);
    }

    /**
     * 舊版 API 呼叫邏輯（回退用）
     */
    async _legacyCall(prompt, systemInstruction, retryCount = 0) {
        const MAX_RETRIES = 2;

        // 自動判斷 API 類型
        const isGemini = apiKey.startsWith('AIza') ||
                         (!apiKey.startsWith('sk-') && !apiKey.startsWith('gsk_'));

        try {
            let text;

            if (isGemini) {
                // --- Gemini API 邏輯 ---
                const url = `${this.baseUrl}gemini-2.0-flash:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    generationConfig: { responseMimeType: "application/json" }
                };
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error(`Gemini API Error: ${res.status}`);
                const data = await res.json();
                text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            } else {
                // --- OpenAI 兼容格式 ---
                let baseUrl = "https://api.openai.com/v1/chat/completions";
                let model = "gpt-4o";

                // 自動偵測其他 Provider
                if (apiKey.startsWith('gsk_')) {
                    baseUrl = "https://api.groq.com/openai/v1/chat/completions";
                    model = "llama-3.3-70b-versatile";
                } else if (apiKey.startsWith('sk-or-')) {
                    baseUrl = "https://openrouter.ai/api/v1/chat/completions";
                    model = "anthropic/claude-3.5-sonnet";
                }

                const payload = {
                    model: model,
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                };
                const res = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error(`OpenAI API Error: ${res.status}`);
                const data = await res.json();
                text = data.choices?.[0]?.message?.content;
            }

            if (!text) {
                showError("AI 回應異常");
                return null;
            }

            // 使用容錯解析
            const parsed = tryParseJSON(text);
            if (parsed) return parsed;

            // 解析失敗，嘗試重試
            if (retryCount < MAX_RETRIES) {
                console.warn(`JSON 解析失敗，正在重試... (${retryCount + 1}/${MAX_RETRIES})`);
                if(typeof showFloatingText !== 'undefined') {
                    showFloatingText("格式異常，重試中...", canvasWidth/2, canvasHeight/2, '#c07070');
                }
                return await this._legacyCall(prompt, systemInstruction, retryCount + 1);
            }
            return null;
        } catch (e) {
            console.error(e);
            showError("連線失敗: " + e.message);
            return null;
        }
    }

    /**
     * 流式生成（新功能）
     */
    async callStream(prompt, systemInstruction, onChunk) {
        if (!this._useNewArchitecture) {
            // 不支援流式傳輸，回退到普通呼叫
            const result = await this.call(prompt, systemInstruction);
            if (result && onChunk) {
                onChunk(JSON.stringify(result), true);
            }
            return result;
        }

        this._ensureInitialized();

        try {
            return await llmService.generate(prompt, systemInstruction, { onChunk });
        } catch (e) {
            console.error('Stream error:', e);
            return await this.call(prompt, systemInstruction);
        }
    }

    // ===== 遊戲專用 API 方法 =====

    async generateWorlds() {
        // 優先使用 promptBuilder
        if (typeof promptBuilder !== 'undefined') {
            const { system, user } = promptBuilder.buildWorldGeneration();
            return await this.call(user, system);
        }

        // 回退到內建 prompt
        const sys = `你是資深奇幻世界架構師。生成3個獨特的TRPG世界。
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
}`;
        return await this.call("生成3個獨特的TRPG世界設定", sys);
    }

    async generateOpeningScene(world) {
        // 優先使用 promptBuilder
        if (typeof promptBuilder !== 'undefined') {
            const { system, user } = promptBuilder.buildOpeningScene(world, playerCharacter);
            return await this.call(user, system);
        }

        // 回退到內建 prompt
        const charInfo = typeof getCharacterPromptString === 'function' ? getCharacterPromptString() : "主角：無名旅人";
        const traitMods = typeof getTraitOptionModifiers === 'function' ? getTraitOptionModifiers() : {risk:1, focus:1, normal:1};
        const traitHint = playerCharacter?.traits?.length > 0 ?
            `根據角色性格，選項比例建議：risk權重${traitMods.risk.toFixed(1)}、focus權重${traitMods.focus.toFixed(1)}、normal權重${traitMods.normal.toFixed(1)}` : '';

        const sys = `你是TRPG遊戲主持人。世界：${world.name} - ${world.desc}
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
    "timeAdvance": 1
  }],
  "potentialRelations": [{
    "targetId": "player",
    "type": "neutral",
    "reason": "關係原因"
  }],
  "environment_atmosphere": "環境氣氛(如：緊張、神秘)"
}`;
        return await this.call("生成開場場景", sys);
    }

    async generateNextScene(world, context, action, factions, npcs, calendar) {
        // 優先使用 promptBuilder
        if (typeof promptBuilder !== 'undefined') {
            const { system, user } = promptBuilder.buildNextScene(
                world, context, action, factions, npcs, calendar, playerCharacter
            );
            return await this.call(user, system);
        }

        // 回退到內建 prompt
        const npcList = npcs.map(n => {
            const statusName = (typeof NPC_STATUS_INFO !== 'undefined' && NPC_STATUS_INFO[n.status])
                ? NPC_STATUS_INFO[n.status].name
                : '未知';
            return `${n.name}(${n.role},狀態:${statusName})`;
        }).join('、');

        const deadNPCs = npcs.filter(n => n.status === 'dead');

        const charInfo = typeof getCharacterPromptString === 'function' ? getCharacterPromptString() : "";
        const traitMods = typeof getTraitOptionModifiers === 'function' ? getTraitOptionModifiers() : {risk:1, focus:1, normal:1};
        const traitHint = playerCharacter?.traits?.length > 0 ?
            `根據角色性格，選項比例建議：risk權重${traitMods.risk.toFixed(1)}、focus權重${traitMods.focus.toFixed(1)}、normal權重${traitMods.normal.toFixed(1)}` : '';

        const sys = `你是TRPG遊戲主持人。
世界：${world.name}
目前時間：${calendar.getString()} ${calendar.getTimeString()}
${charInfo}
已知NPC：${npcList || '無'}
陣營聲望：${JSON.stringify(factions)}

【核心指令 - 拒絕流水帳】：
1. 劇情必須緊湊：請直接跳過「吃飯、走路、睡覺」等無意義過程，直接切入下一個「衝突點」或「重要事件」。
2. 增加回饋感：玩家的每一個選擇都必須帶來明顯的後果（獲得情報、得罪人、發現秘密）。
3. NPC 必須鮮活：NPC 不應該是解說機器。請為在場 NPC 設定當下的「情緒」和「動機」。若 NPC 對玩家有好感或厭惡，必須反映在對話語氣中。
4. 推進謎團：每次回應至少要提供一個關於世界觀或主線的具體線索。

NPC狀態說明：active(活躍), injured(受傷), missing(失蹤), imprisoned(被囚), betrayed(背叛), dead(死亡)。
${deadNPCs.length > 0 ? `【重要】已死亡的NPC：${deadNPCs.map(n => n.name).join('、')}，絕對不能出現！` : ''}

規則：
1. 可能遇到新NPC（機率30%）
2. 可能觸發命運事件（機率20%）
3. 選項需標註時間消耗
4. risk 選項風險更高但回報更多
5. focus 選項可揭示秘密
6. 若 NPC 狀態改變務必標註
${traitHint}

回傳 JSON：
{
  "story": "劇情描述(100-150字)",
  "newNPC": null 或 { "id": "npc_xxx", "name": "", "role": "", "desc": "", "faction": 0, "personality": "", "secret": "" },
  "options": [{ "text": "", "type": "normal/risk/focus", "factionIndex": -1, "timeAdvance": 1 }],
  "fateEvent": null 或 { "name": "事件名", "points": 3, "desc": "事件描述" },
  "newRelations": [],
  "revealedRelations": [],
  "npcStatusChanges": [{ "id": "npc_xxx", "newStatus": "injured/missing/dead/etc", "reason": "變更原因" }],
  "environment_atmosphere": "環境氣氛"
}`;
        const prompt = `前情：${context}\n\n玩家行動：${action}`;
        return await this.call(prompt, sys);
    }

    async generateNextSceneWithDice(world, context, action, factions, npcs, calendar, diceContext) {
        const npcList = npcs.map(n => `${n.name}(${n.role})`).join('、');
        const charInfo = typeof getCharacterPromptString === 'function' ? getCharacterPromptString() : "";

        const sys = `你是TRPG遊戲主持人。
世界：${world.name}
目前時間：${calendar.getString()} ${calendar.getTimeString()}
${charInfo}
已知NPC：${npcList || '無'}
陣營聲望：${JSON.stringify(factions)}

${diceContext}

【重要】請根據上述檢定結果來描述場景：
- 如果是「檢定成功」，描述玩家行動順利的場景，可能獲得額外收穫。
- 如果是「檢定失敗」，描述玩家遭遇困難的場景，可能有負面後果。

規則與核心指令同上（拒絕流水帳、衝突導向）。

回傳 JSON (格式同上)`;

        const prompt = `前情：${context}\n\n玩家行動：${action}`;
        return await this.call(prompt, sys);
    }

    async summarizeHistory(world, log) {
        // 優先使用 promptBuilder
        if (typeof promptBuilder !== 'undefined') {
            const { system, user } = promptBuilder.buildSummarizeHistory(world.name, log);
            return await this.call(user, system);
        }

        const sys = `你是冒險者的隨身筆記助手。請分析冒險紀錄，列出：
1. 【當前目標】：主角現在最該做什麼？
2. 【重要線索】：最近獲得了什麼關鍵情報？
3. 【待解謎團】：還有什麼未解之謎？

請用條列式 Markdown 格式，簡潔明瞭，不要寫成故事或詩歌。`;

        const logText = log.slice(-25).map(h => `[${h.role}]: ${h.text}`).join("\n");
        return await this.call(`世界：${world.name}\n紀錄:\n${logText}`, sys);
    }

    async compressHistoryLog(log) {
        // 優先使用 promptBuilder
        if (typeof promptBuilder !== 'undefined') {
            const { system, user } = promptBuilder.buildCompressHistory(log);
            return await this.call(user, system);
        }

        const sys = `你是故事記錄員。請將以下事件記錄濃縮為 100-150 字的摘要，保留關鍵人物、重大事件、重要選擇。

回傳 JSON：
{
  "summary": "摘要文字（100-150字）"
}`;
        const logText = log.map(h => `[${h.role}]: ${h.text}`).join("\n");
        return await this.call(`事件記錄:\n${logText}`, sys);
    }

    /**
     * 取得當前使用的 Provider 資訊
     */
    getProviderInfo() {
        if (this._useNewArchitecture && llmService.currentProvider) {
            return llmService.getProviderInfo();
        }

        // 回退到基本資訊
        const isGemini = !apiKey || apiKey.startsWith('AIza') ||
                         (!apiKey.startsWith('sk-') && !apiKey.startsWith('gsk_'));

        return {
            name: isGemini ? 'Google Gemini' : 'OpenAI Compatible',
            model: isGemini ? 'gemini-2.0-flash' : 'gpt-4o',
            supportsStreaming: this._useNewArchitecture
        };
    }
}

// 建立全域 AI 服務實例
const aiService = new GeminiService();
