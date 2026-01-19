// ============ 主程式邏輯 ============

// 事件監聽
document.getElementById('btn-relation').onclick = () => toggleRelationModal(true);
document.getElementById('btn-timeline').onclick = () => toggleTimelineModal(true);
document.getElementById('btn-log').onclick = async () => {
    if (!currentWorld) return showError("請先開始遊戲");
    toggleLogModal(true);
    document.getElementById('log-body').innerHTML = '🖋️ 正在分析筆記...';
    const res = await aiService.summarizeHistory(currentWorld, historyLog);
    document.getElementById('log-body').innerHTML = res?.content?.replace(/\n/g, '<br>') || '紀錄不足...';
};
document.getElementById('btn-settings').onclick = () => toggleSettingsModal(true);
document.getElementById('btn-sound').onclick = function() {
    isSoundOn = !isSoundOn;
    this.textContent = isSoundOn ? '🔊' : '🔇';
    this.classList.toggle('active', isSoundOn);
};

// Canvas 互動
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});
canvas.addEventListener('click', () => {
    if (currentState === STATE.TYPING) typewriter.skip();
    else buttons.forEach(b => { if (b.hover) b.callback(); });
});
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = t.clientX - rect.left;
    mouseY = t.clientY - rect.top;
    if (currentState === STATE.TYPING) typewriter.skip();
    else buttons.forEach(b => { b.update(); if (b.hover) b.callback(); });
}, {passive: false});

// 初始化
function init() {
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 50; i++) particles.push(new Particle());
    currentState = STATE.INIT;
    createStartButton();
    loadSavePointsFromStorage();
    checkAutoSave();
    loop();
}

function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    isMobile = canvasWidth < 600;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fonts = CONFIG.getFonts(isMobile);
    particles.forEach(p => { p.x = Math.random() * canvasWidth; p.y = Math.random() * canvasHeight; });
    recalcLayout();
}

function recalcLayout() {
    if (currentState === STATE.INIT) createStartButton();
    else if (currentState === STATE.WORLD_SELECT) setupWorldSelectUI();
    else if (currentState === STATE.CHOICE) generateOptionsUI();
}

// 核心迴圈 (已修復載入文字被擋住問題)
function loop() {
    requestAnimationFrame(loop);

    // 1. 背景
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    particles.forEach(p => { p.update(); p.draw(); });
    
    const grad = ctx.createRadialGradient(canvasWidth/2, canvasHeight/2, canvasHeight*0.2, canvasWidth/2, canvasHeight/2, canvasHeight*0.9);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. 遊戲介面 (非載入時)
    if (currentState >= STATE.TYPING && currentState !== STATE.LOADING) {
        const panelH = isMobile ? canvasHeight * 0.42 : canvasHeight * 0.38;
        const panelY = canvasHeight - panelH;
        ctx.fillStyle = CONFIG.colors.panelBg;
        ctx.fillRect(0, panelY, canvasWidth, panelH);
        ctx.strokeStyle = CONFIG.colors.panelBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, panelY, canvasWidth, panelH);
        
        drawFactionHUD();
        typewriter.update();
        typewriter.draw();
        buttons.forEach(b => { b.update(); b.draw(); });
    }

    // 3. 初始/選單介面
    if (currentState === STATE.INIT || currentState === STATE.WORLD_SELECT) {
        buttons.forEach(b => { b.update(); b.draw(); });
    }

    // 4. 載入畫面 (最上層)
    if (currentState === STATE.LOADING) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = '#66a3e0';
        ctx.font = fonts.displayLarge;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const pulse = 1 + Math.sin(Date.now() / 300) * 0.02;
        ctx.save();
        ctx.translate(canvasWidth/2, canvasHeight/2);
        ctx.scale(pulse, pulse);
        ctx.fillText(loadingText, 0, 0);
        ctx.restore();
    }

    // 5. 浮動文字
    floatingTexts = floatingTexts.filter(ft => { const alive = ft.update(); if(alive) ft.draw(); return alive; });
}

// 邏輯流程
function createStartButton() {
    const btnW = isMobile ? canvasWidth * 0.7 : 280;
    const btnH = 55;
    buttons = [new Button("啟動創世引擎", canvasWidth/2 - btnW/2, canvasHeight/2 - btnH/2, btnW, btnH, () => {
        if (!apiKey) toggleSettingsModal(true);
        else startWorldGeneration();
    }, 'start')];
}

async function startWorldGeneration() {
    currentState = STATE.LOADING;
    loadingText = "✧ 編織世界線...";
    const data = await aiService.generateWorlds();
    if (data?.worlds?.length) {
        generatedWorlds = data.worlds;
        setupWorldSelectUI();
    } else {
        currentState = STATE.INIT;
        createStartButton();
    }
}

function setupWorldSelectUI() {
    currentState = STATE.WORLD_SELECT;
    buttons = [];
    const gap = 20, cardH = 100, cardW = Math.min(canvasWidth*0.8, 300);
    const totalH = generatedWorlds.length * (cardH + gap);
    const startY = (canvasHeight - totalH) / 2;
    generatedWorlds.forEach((w, i) => {
        buttons.push(new Button(w.name, (canvasWidth-cardW)/2, startY + i*(cardH+gap), cardW, cardH, () => showWorldIntro(w), 'world'));
    });
}

function showWorldIntro(world) {
    currentWorld = world;
    buttons = []; // 清空按鈕，防止點擊
    const factionsHTML = world.factions.map((f, i) => `
        <div class="faction-card" style="border-left: 3px solid ${CONFIG.colors.factions[i]};">
            <h4>${f.name}</h4><p>${f.desc}</p>
        </div>`).join('');
    
    document.getElementById('world-intro-content').innerHTML = `
        <h2>${world.name}</h2>
        <div class="desc">${world.desc}</div>
        <div class="factions">${factionsHTML}</div>
        <div style="margin-top:30px;display:flex;gap:15px;justify-content:center;">
            <button class="start-adventure-btn" style="background:#3a3d4a;color:#aaa;" onclick="toggleWorldIntroModal(false)">← 返回</button>
            <button class="start-adventure-btn" onclick="toggleWorldIntroModal(false);toggleCharacterCreateModal(true);">踏入命運</button>
        </div>
    `;
    toggleWorldIntroModal(true);
}

async function startAdventureWithCharacter() {
    CALENDAR.reset();
    fatePoints = 0;
    npcs = [];
    relationships = [];
    historyLog = [];
    factionData = currentWorld.factions.map(f => ({ name: f.name, rep: 50 }));

    // 應用背景加成
    const bgInfo = BACKGROUND_INFO[playerCharacter.background];
    if(bgInfo.factionBonus >= 0) factionData[bgInfo.factionBonus].rep += 15;

    // 顯示 UI 元素
    document.getElementById('calendar-display').style.display = 'block';
    document.getElementById('fate-display').style.display = 'flex';
    document.getElementById('fate-value').textContent = fatePoints;
    CALENDAR.updateDisplay();

    currentState = STATE.LOADING;
    loadingText = "✧ 命運之輪轉動...";
    storyContext = `${currentWorld.name}：${currentWorld.desc}`;

    const res = await aiService.generateOpeningScene(currentWorld);
    if (res) processSceneResult(res, "冒險開始");
    else { currentState = STATE.INIT; createStartButton(); }
}

async function triggerSceneGeneration(action, timeAdvance = 1) {
    currentState = STATE.LOADING;
    loadingText = "✧ 命運推演中...";
    CALENDAR.advance(timeAdvance);
    historyLog.push({ role: 'Player', text: action });
    
    const res = await aiService.generateNextScene(currentWorld, storyContext, action, factionData, npcs, CALENDAR);
    if (res) processSceneResult(res, action);
    else {
        loadingText = "連線失敗";
        buttons = [new Button("重試", canvasWidth/2-60, canvasHeight/2, 120, 50, () => triggerSceneGeneration(action, timeAdvance))];
    }
}

async function triggerSceneGenerationWithDiceResult(action, timeAdvance, diceResult) {
    currentState = STATE.LOADING;
    loadingText = "✧ 命運推演中...";
    CALENDAR.advance(timeAdvance);
    historyLog.push({ role: 'Player', text: action });
    
    const diceContext = diceResult.success ? 
        `【檢定成功】${STAT_NAMES[diceResult.stat]}檢定通過（${diceResult.result} >= ${diceResult.threshold}），行動順利。` : 
        `【檢定失敗】${STAT_NAMES[diceResult.stat]}檢定失敗（${diceResult.result} < ${diceResult.threshold}），遭遇挫折。`;

    const res = await aiService.generateNextSceneWithDice(currentWorld, storyContext, action, factionData, npcs, CALENDAR, diceContext);
    if (res) processSceneResult(res, action);
    else {
        loadingText = "連線失敗";
        buttons = [new Button("重試", canvasWidth/2-60, canvasHeight/2, 120, 50, () => triggerSceneGenerationWithDiceResult(action, timeAdvance, diceResult))];
    }
}

function processSceneResult(res, action) {
    storyContext = res.story;
    currentOptions = res.options || [];
    historyLog.push({ role: 'GM', text: res.story });
    
    if (res.newNPC) addNPC(res.newNPC);
    if (res.newRelations) res.newRelations.forEach(r => addRelationship(r.from, r.to, r.type, r.revealed));
    if (res.npcStatusChanges) res.npcStatusChanges.forEach(c => updateNPCStatus(c.id, c.newStatus, c.reason));
    if (res.fateEvent) {
        addFatePoints(res.fateEvent.points);
        checkAndCreateSavePoint('fate', res.fateEvent.name);
    }

    currentState = STATE.TYPING;
    typewriter.start(res.story);
    checkAndCreateSavePoint('monthly');
    autoSave();
}

function onTypingComplete() {
    currentState = STATE.CHOICE;
    generateOptionsUI();
}

function generateOptionsUI() {
    buttons = [];
    const btnW = Math.min(canvasWidth * 0.9, 500);
    const btnH = 60, gap = 15;
    const totalH = currentOptions.length * (btnH + gap);
    const startY = canvasHeight - totalH - 80;
    
    currentOptions.forEach((opt, i) => {
        const btn = new Button(opt.text, (canvasWidth-btnW)/2, startY + i*(btnH+gap), btnW, btnH, () => {
            if (opt.type === 'risk') {
                checkAndCreateSavePoint('risk');
                const stat = opt.checkStat || 'strength'; // 這裡可優化自動判斷屬性
                performDiceCheck('冒險抉擇', stat, 'hard', (res) => {
                    const txt = `${opt.text}（${res.success?'成功':'失敗'}）`;
                    triggerSceneGenerationWithDiceResult(txt, opt.timeAdvance||1, res);
                });
            } else {
                triggerSceneGeneration(opt.text, opt.timeAdvance||1);
            }
        }, opt.type);
        btn.timeAdvance = opt.timeAdvance;
        buttons.push(btn);
    });
}

function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key && document.getElementById('provider-select').value !== 'ollama') {
        return showError("請輸入 API Key");
    }

    // 儲存 API Key
    apiKey = key;
    localStorage.setItem('gemini_api_key', key);

    // 取得進階設定
    const provider = document.getElementById('provider-select').value;
    const model = document.getElementById('model-input')?.value.trim() || '';
    const baseUrl = document.getElementById('baseurl-input')?.value.trim() || '';
    const streaming = document.getElementById('streaming-toggle')?.checked || false;

    // 更新 CONFIG
    CONFIG.llm.provider = provider;
    CONFIG.llm.model = model;
    CONFIG.llm.baseUrl = baseUrl;
    CONFIG.llm.streaming = streaming;

    // 儲存設定到 localStorage
    localStorage.setItem('rpg_llm_settings', JSON.stringify({
        provider, model, baseUrl, streaming
    }));

    // 如果 llmService 可用，重新初始化 Provider
    if (typeof llmService !== 'undefined' && key) {
        const config = { apiKey: key };
        if (model) config.model = model;
        if (baseUrl) config.baseUrl = baseUrl;

        if (provider === 'auto') {
            llmService.autoDetectProvider(key, config);
        } else {
            llmService.initProvider(provider, config);
        }
        llmService.setStreamingEnabled(streaming);

        // 重置 aiService 的初始化狀態
        if (typeof aiService !== 'undefined') {
            aiService._initialized = false;
        }

        // 顯示 Provider 資訊
        updateProviderInfo();
    }

    toggleSettingsModal(false);
    if (currentState === STATE.INIT) startWorldGeneration();
}

// Provider 選擇變更時的處理
function onProviderChange() {
    const provider = document.getElementById('provider-select').value;
    const modelInput = document.getElementById('model-input');
    const baseUrlInput = document.getElementById('baseurl-input');

    // 根據 Provider 預設值填入提示
    if (provider !== 'auto' && CONFIG.llm.presets[provider]) {
        const preset = CONFIG.llm.presets[provider];
        modelInput.placeholder = `預設：${preset.defaultModel}`;
        if (preset.baseUrl) {
            baseUrlInput.placeholder = `預設：${preset.baseUrl}`;
        } else {
            baseUrlInput.placeholder = '使用官方端點';
        }
    } else {
        modelInput.placeholder = '留空使用預設模型';
        baseUrlInput.placeholder = '例如：https://api.example.com/v1';
    }
}

// 更新 Provider 資訊顯示
function updateProviderInfo() {
    const infoDiv = document.getElementById('provider-info');
    const infoText = document.getElementById('provider-info-text');

    if (!infoDiv || !infoText) return;

    let info = null;
    if (typeof aiService !== 'undefined') {
        info = aiService.getProviderInfo();
    } else if (typeof llmService !== 'undefined' && llmService.currentProvider) {
        info = llmService.getProviderInfo();
    }

    if (info) {
        infoText.textContent = `目前使用：${info.name} / ${info.model}${info.supportsStreaming ? ' (支援流式傳輸)' : ''}`;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
}

// 載入 LLM 設定
function loadLLMSettings() {
    try {
        const settings = localStorage.getItem('rpg_llm_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            CONFIG.llm.provider = parsed.provider || 'auto';
            CONFIG.llm.model = parsed.model || '';
            CONFIG.llm.baseUrl = parsed.baseUrl || '';
            CONFIG.llm.streaming = parsed.streaming || false;

            // 更新 UI
            const providerSelect = document.getElementById('provider-select');
            const modelInput = document.getElementById('model-input');
            const baseUrlInput = document.getElementById('baseurl-input');
            const streamingToggle = document.getElementById('streaming-toggle');

            if (providerSelect) providerSelect.value = CONFIG.llm.provider;
            if (modelInput) modelInput.value = CONFIG.llm.model;
            if (baseUrlInput) baseUrlInput.value = CONFIG.llm.baseUrl;
            if (streamingToggle) streamingToggle.checked = CONFIG.llm.streaming;

            onProviderChange();
        }
    } catch (e) {
        console.warn('載入 LLM 設定失敗:', e);
    }
}

// 初始化時載入設定
document.addEventListener('DOMContentLoaded', () => {
    loadLLMSettings();
});

// 啟動遊戲
init();