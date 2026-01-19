// ============ 遊戲系統模組 ============

// --- 1. 日曆系統 ---
const CALENDAR = {
    year: 1,
    season: 0,
    day: 1,
    timeOfDay: 0,
    seasonNames: ['春月', '夏月', '秋月', '冬月'],
    dayNames: ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
               '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
               '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'],
    timeNames: ['清晨', '上午', '午後', '黃昏', '夜晚', '深夜'],

    advance(units = 1) {
        for (let i = 0; i < units; i++) {
            this.timeOfDay++;
            if (this.timeOfDay >= 6) {
                this.timeOfDay = 0;
                this.day++;
                if (this.day > 30) {
                    this.day = 1;
                    this.season++;
                    if (this.season >= 4) {
                        this.season = 0;
                        this.year++;
                    }
                }
            }
        }
        this.updateDisplay();
    },

    getString() {
        return `第${this.year}年 ${this.seasonNames[this.season]} ${this.dayNames[this.day-1]}`;
    },

    getTimeString() {
        return this.timeNames[this.timeOfDay];
    },

    updateDisplay() {
        document.getElementById('calendar-date').textContent = this.getString();
        document.getElementById('calendar-time').textContent = this.getTimeString();
    },

    reset() {
        this.year = 1;
        this.season = 0;
        this.day = 1;
        this.timeOfDay = 0;
    }
};

// --- 2. 命運點系統 ---
let fatePoints = 0;

function addFatePoints(amount) {
    fatePoints += amount;
    document.getElementById('fate-value').textContent = fatePoints;
    if (amount > 0 && typeof showFloatingText !== 'undefined') {
        showFloatingText(`+${amount} 命運點`, canvasWidth/2, canvasHeight/2, '#c0a0e0');
    }
}

function spendFatePoints(amount) {
    if (fatePoints >= amount) {
        fatePoints -= amount;
        document.getElementById('fate-value').textContent = fatePoints;
        return true;
    }
    return false;
}

// --- 3. 存檔與讀檔系統 ---
let savePoints = [];
const MAX_SAVE_POINTS = 50;
let lastSavePointDay = -1;

function autoSave() {
    try {
        const saveData = {
            currentWorld,
            factionData,
            npcs,
            relationships,
            historyLog: historyLog.slice(-30),
            calendar: {
                year: CALENDAR.year,
                season: CALENDAR.season,
                day: CALENDAR.day,
                timeOfDay: CALENDAR.timeOfDay
            },
            fatePoints,
            storyContext,
            playerCharacter,
            currentState,
            currentOptions,
            timestamp: Date.now()
        };
        localStorage.setItem('rpg_autosave', JSON.stringify(saveData));
    } catch (e) {
        console.warn('自動存檔失敗:', e);
    }
}

function loadAutoSave() {
    try {
        const saveStr = localStorage.getItem('rpg_autosave');
        if (!saveStr) return false;
        const saveData = JSON.parse(saveStr);

        // 還原全域變數
        currentWorld = saveData.currentWorld;
        factionData = saveData.factionData || [];
        npcs = saveData.npcs || [];
        relationships = saveData.relationships || [];
        historyLog = saveData.historyLog || [];
        fatePoints = saveData.fatePoints || 0;
        storyContext = saveData.storyContext || '';
        playerCharacter = saveData.playerCharacter;
        currentOptions = saveData.currentOptions || [];

        if (saveData.calendar) Object.assign(CALENDAR, saveData.calendar);

        // 更新 UI
        document.getElementById('calendar-display').style.display = 'block';
        document.getElementById('fate-display').style.display = 'flex';
        document.getElementById('fate-value').textContent = fatePoints;
        CALENDAR.updateDisplay();
        updateNPCBadge();

        currentState = saveData.currentState;
        if (currentState === STATE.TYPING || currentState === STATE.CHOICE) {
            currentState = STATE.CHOICE;
            generateOptionsUI();
            // 【修復】這裡不能用 window.typewriter
            if(typeof typewriter !== 'undefined') {
                typewriter.text = storyContext;
                typewriter.idx = storyContext.length;
                typewriter.done = true;
            }
        }
        if(typeof showFloatingText !== 'undefined') showFloatingText('讀取存檔成功', canvasWidth/2, canvasHeight/2, '#80c090');
        return true;
    } catch (e) {
        console.error('讀取存檔失敗:', e);
        return false;
    }
}

function checkAutoSave() {
    const saveStr = localStorage.getItem('rpg_autosave');
    if (!saveStr) return;
    try {
        const saveData = JSON.parse(saveStr);
        const timestamp = new Date(saveData.timestamp);
        const worldName = saveData.currentWorld?.name || '未知世界';
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay show';
        overlay.id = 'autosave-modal';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:450px;text-align:center;">
                <div class="modal-title">發 現 未 完 成 的 冒 險</div>
                <div style="color:#a0a5b0;margin-bottom:20px;line-height:1.8;">
                    <p>世界：<span style="color:#deb887;">${worldName}</span></p>
                    <p>存檔時間：${timestamp.toLocaleString()}</p>
                </div>
                <div style="display:flex;gap:15px;justify-content:center;flex-wrap:wrap;">
                    <button class="start-adventure-btn" onclick="continueAutoSave()">繼續冒險</button>
                    <button class="start-adventure-btn" style="background:linear-gradient(135deg,#4a4a4a,#3a3a3a);color:#d0d0d0;" onclick="startNewGame()">重新開始</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    } catch (e) {}
}

function continueAutoSave() {
    document.getElementById('autosave-modal')?.remove();
    loadAutoSave();
}

function startNewGame() {
    document.getElementById('autosave-modal')?.remove();
    clearAutoSave();
    clearSavePoints();  // 清空命運長河（存檔點）
    if (!apiKey) toggleSettingsModal(true);
    else startWorldGeneration();
}

function clearAutoSave() {
    localStorage.removeItem('rpg_autosave');
    if(typeof showFloatingText !== 'undefined') showFloatingText('存檔已清除', canvasWidth/2, canvasHeight/2, '#c07070');
}

// 清空存檔點（命運長河）
function clearSavePoints() {
    savePoints = [];
    lastSavePointDay = -1;
    localStorage.removeItem('rpg_savepoints');
}

// 存檔點與回溯系統
function createSavePoint(name, isMajor = false) {
    const snapshot = {
        currentWorld: JSON.parse(JSON.stringify(currentWorld)),
        factionData: JSON.parse(JSON.stringify(factionData)),
        npcs: JSON.parse(JSON.stringify(npcs)),
        relationships: JSON.parse(JSON.stringify(relationships)),
        historyLog: JSON.parse(JSON.stringify(historyLog)),
        calendar: { ...CALENDAR },
        fatePoints,
        storyContext,
        playerCharacter: JSON.parse(JSON.stringify(playerCharacter)),
        currentOptions: JSON.parse(JSON.stringify(currentOptions))
    };
    const savePoint = {
        id: `sp_${Date.now()}`,
        name: name || `${CALENDAR.getString()} - ${storyContext.slice(0, 10)}...`,
        timestamp: Date.now(),
        calendarString: `${CALENDAR.getString()} ${CALENDAR.getTimeString()}`,
        snapshot,
        isMajor
    };
    savePoints.push(savePoint);
    while (savePoints.length > MAX_SAVE_POINTS) {
        const idx = savePoints.findIndex(sp => !sp.isMajor);
        if (idx >= 0) savePoints.splice(idx, 1);
        else savePoints.shift();
    }
    localStorage.setItem('rpg_savepoints', JSON.stringify(savePoints));
}

function loadSavePointsFromStorage() {
    try {
        const data = localStorage.getItem('rpg_savepoints');
        if (data) savePoints = JSON.parse(data);
    } catch (e) { savePoints = []; }
}

function checkAndCreateSavePoint(triggerType, eventName = '') {
    let isMajor = false, name = '';
    switch (triggerType) {
        case 'risk': name = `${CALENDAR.getString()} - 冒險抉擇`; break;
        case 'fate': name = `${CALENDAR.getString()} - ${eventName || '命運事件'}`; isMajor = true; break;
        case 'newNPC': name = `${CALENDAR.getString()} - 遇見${eventName}`; break;
        case 'monthly':
            const totalDays = (CALENDAR.year - 1) * 120 + CALENDAR.season * 30 + CALENDAR.day;
            if (Math.floor(totalDays / 30) !== Math.floor(lastSavePointDay / 30)) {
                name = `${CALENDAR.getString()} - 月末紀錄`;
                lastSavePointDay = totalDays;
            } else return;
            break;
    }
    if (name) createSavePoint(name, isMajor);
}

function revertToSavePoint(savePointId) {
    const savePoint = savePoints.find(sp => sp.id === savePointId);
    if (!savePoint) return showError('存檔點不存在');
    const cost = savePoint.isMajor ? 8 : 5;
    if (fatePoints < cost) return showError(`命運點不足（需要 ${cost} 點）`);
    if (!confirm(`回溯將抹除此節點之後的所有記憶，消耗 ${cost} 命運點。是否確定？`)) return;

    spendFatePoints(cost);
    const s = savePoint.snapshot;
    currentWorld = s.currentWorld;
    factionData = s.factionData;
    npcs = s.npcs;
    relationships = s.relationships;
    historyLog = s.historyLog;
    Object.assign(CALENDAR, s.calendar);
    fatePoints = s.fatePoints;
    storyContext = s.storyContext;
    playerCharacter = s.playerCharacter;
    currentOptions = s.currentOptions;

    const index = savePoints.findIndex(sp => sp.id === savePointId);
    if (index >= 0) savePoints = savePoints.slice(0, index + 1);

    historyLog.push({ role: 'Fate', text: `【命運回溯】時間倒流至「${savePoint.name}」` });
    CALENDAR.updateDisplay();
    document.getElementById('fate-value').textContent = fatePoints;
    updateNPCBadge();
    localStorage.setItem('rpg_savepoints', JSON.stringify(savePoints));
    toggleTimelineModal(false);
    if(typeof showFloatingText !== 'undefined') showFloatingText('命運之輪逆轉...', canvasWidth/2, canvasHeight/2, '#c0a0e0');

    currentState = STATE.CHOICE;
    generateOptionsUI();
    if(typeof typewriter !== 'undefined') {
        typewriter.text = storyContext;
        typewriter.idx = storyContext.length;
        typewriter.done = true;
    }
}

// --- 4. 擲骰系統 ---
const DICE_REROLL_COST = 3;
let currentDiceCheck = null;
let diceCheckCallback = null;
const STAT_NAMES = { strength: '力量', wisdom: '智慧', charisma: '魅力', luck: '運氣' };

function calculateDiceThreshold(difficulty, statValue) {
    const baseDifficulty = { easy: 6, normal: 8, hard: 10, extreme: 12 };
    const threshold = (baseDifficulty[difficulty] || 8) - Math.floor(statValue / 2);
    return Math.max(2, Math.min(12, threshold));
}

function rollD12() { return Math.floor(Math.random() * 12) + 1; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function performDiceCheck(title, stat, difficulty, onComplete) {
    const statValue = playerCharacter.stats[stat] || 0;
    const threshold = calculateDiceThreshold(difficulty, statValue);
    currentDiceCheck = { title, stat, difficulty, threshold, statValue, result: null, success: false, rerolled: false };
    diceCheckCallback = onComplete;

    document.getElementById('dice-title').textContent = title;
    document.getElementById('dice-attribute').textContent = `${STAT_NAMES[stat] || stat} 檢定`;
    document.getElementById('dice-threshold').textContent = `目標：${threshold} 以上`;
    document.getElementById('dice-stat-bonus').textContent = statValue > 0 ? `(${STAT_NAMES[stat]} ${statValue} → 難度 -${Math.floor(statValue/2)})` : '';
    document.getElementById('dice-result-text').className = 'dice-result-text';
    document.getElementById('dice-reroll-section').className = 'dice-reroll-section';
    document.getElementById('dice-display').textContent = '?';
    document.getElementById('dice-display').className = 'dice-display';
    document.getElementById('dice-overlay').classList.add('show');
    await animateDiceRoll();
}

async function animateDiceRoll() {
    const display = document.getElementById('dice-display');
    display.classList.add('rolling');
    for (let i = 0; i < 15; i++) {
        display.textContent = rollD12();
        await sleep(80 + i * 10);
    }
    display.classList.remove('rolling');
    const finalResult = rollD12();
    display.textContent = finalResult;
    currentDiceCheck.result = finalResult;
    currentDiceCheck.success = finalResult >= currentDiceCheck.threshold;
    await sleep(300);

    const resultText = document.getElementById('dice-result-text');
    if (currentDiceCheck.success) {
        display.classList.add('success');
        resultText.textContent = '成功！';
        resultText.classList.add('success');
    } else {
        display.classList.add('failure');
        resultText.textContent = '失敗...';
        resultText.classList.add('failure');
    }
    resultText.classList.add('show');
    await sleep(500);

    const rerollBtn = document.getElementById('dice-reroll-btn');
    const canReroll = !currentDiceCheck.success && fatePoints >= DICE_REROLL_COST && !currentDiceCheck.rerolled;
    rerollBtn.disabled = !canReroll;
    rerollBtn.textContent = canReroll ? `✧ 命運介入 (${DICE_REROLL_COST}點)` : (currentDiceCheck.rerolled ? '已使用命運介入' : `命運點不足 (${DICE_REROLL_COST}點)`);
    document.getElementById('dice-reroll-section').classList.add('show');
}

async function rerollDice() {
    if (!currentDiceCheck || currentDiceCheck.rerolled || fatePoints < DICE_REROLL_COST) return;
    spendFatePoints(DICE_REROLL_COST);
    currentDiceCheck.rerolled = true;
    
    document.getElementById('dice-display').className = 'dice-display';
    document.getElementById('dice-result-text').className = 'dice-result-text';
    document.getElementById('dice-reroll-section').className = 'dice-reroll-section';
    if(typeof showFloatingText !== 'undefined') showFloatingText('命運之輪轉動...', canvasWidth/2, canvasHeight/2, '#c0a0e0');

    const luckBonus = playerCharacter.stats.luck || 0;
    const adjustedThreshold = Math.max(2, currentDiceCheck.threshold - Math.floor(luckBonus / 3));
    currentDiceCheck.threshold = adjustedThreshold;
    document.getElementById('dice-threshold').textContent = `目標：${adjustedThreshold} 以上`;
    if (luckBonus > 0) document.getElementById('dice-stat-bonus').textContent += ` (運氣介入)`;

    await sleep(500);
    await animateDiceRoll();
}

function continueDiceResult() {
    document.getElementById('dice-overlay').classList.remove('show');
    if (diceCheckCallback) {
        diceCheckCallback(currentDiceCheck);
        diceCheckCallback = null;
    }
    currentDiceCheck = null;
}

// --- 5. 角色與 NPC 系統 ---
let npcs = [];
let relationships = [];
let playerCharacter = {
    id: 'player', name: '旅人', role: '命運的見證者', desc: '你，一個踏入這個世界的旅人。',
    faction: -1, x: 0, y: 0, known: true,
    gender: '不指定', stats: { strength: 0, wisdom: 0, charisma: 0, luck: 0 },
    background: 'wanderer', traits: []
};

// 角色創建變數
let tempStats = { strength: 0, wisdom: 0, charisma: 0, luck: 0 };
let statPointsRemaining = 10;
const BACKGROUND_INFO = {
    wanderer: { name: '流浪者', desc: '無初始陣營傾向', factionBonus: -1 },
    noble: { name: '沒落貴族', desc: '第一陣營 +15', factionBonus: 0 },
    merchant: { name: '商人之子', desc: '第二陣營 +15', factionBonus: 1 },
    temple: { name: '神殿孤兒', desc: '第三陣營 +15', factionBonus: 2 },
    mystery: { name: '神秘來歷', desc: '隨機屬性 +3', factionBonus: -1 }
};
const TRAIT_INFO = {
    cautious: { name: '謹慎', effect: 'risk選項較少' },
    reckless: { name: '魯莽', effect: 'risk選項較多' },
    curious: { name: '好奇', effect: 'focus選項較多' },
    practical: { name: '務實', effect: 'normal選項較多' }
};

function adjustStat(stat, delta) {
    const newValue = tempStats[stat] + delta;
    if (newValue < 0 || (delta > 0 && statPointsRemaining <= 0) || newValue > 10) return;
    tempStats[stat] = newValue;
    statPointsRemaining -= delta;
    document.getElementById(`stat-${stat}`).textContent = newValue;
    document.getElementById('stat-points-remaining').textContent = `(剩餘點數: ${statPointsRemaining})`;
}

function resetCharacterForm() {
    tempStats = { strength: 0, wisdom: 0, charisma: 0, luck: 0 };
    statPointsRemaining = 10;
    document.getElementById('char-name').value = '';
    document.querySelectorAll('input[name="gender"]')[0].checked = true;
    document.getElementById('char-background').value = 'wanderer';
    document.querySelectorAll('input[name="trait"]').forEach(cb => cb.checked = false);
    ['strength', 'wisdom', 'charisma', 'luck'].forEach(s => document.getElementById(`stat-${s}`).textContent = '0');
    document.getElementById('stat-points-remaining').textContent = '(剩餘點數: 10)';
}

function confirmCharacterCreation() {
    const name = document.getElementById('char-name').value.trim() || '無名旅人';
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const background = document.getElementById('char-background').value;
    const traits = Array.from(document.querySelectorAll('input[name="trait"]:checked')).slice(0, 2).map(cb => cb.value);

    let finalStats = { ...tempStats };
    if (background === 'mystery') {
        const keys = ['strength', 'wisdom', 'charisma', 'luck'];
        const rnd = keys[Math.floor(Math.random() * keys.length)];
        finalStats[rnd] += 3;
    }

    playerCharacter.name = name;
    playerCharacter.gender = gender;
    playerCharacter.stats = finalStats;
    playerCharacter.background = background;
    playerCharacter.traits = traits;
    playerCharacter.desc = `${name}，${gender}，${BACKGROUND_INFO[background].name}出身。`;

    if(typeof toggleCharacterCreateModal !== 'undefined') toggleCharacterCreateModal(false);
    if(typeof startAdventureWithCharacter !== 'undefined') startAdventureWithCharacter();
}

function getCharacterPromptString() {
    const bg = BACKGROUND_INFO[playerCharacter.background];
    const traitsStr = playerCharacter.traits.map(t => TRAIT_INFO[t]?.name).filter(Boolean).join('、') || '無';
    return `主角：${playerCharacter.name}，${playerCharacter.gender}，${bg.name}。性格：${traitsStr}。屬性：力${playerCharacter.stats.strength}/智${playerCharacter.stats.wisdom}/魅${playerCharacter.stats.charisma}/運${playerCharacter.stats.luck}`;
}

function getTraitOptionModifiers() {
    const m = { risk: 1, focus: 1, normal: 1 };
    playerCharacter.traits.forEach(t => {
        if(t==='cautious') m.risk*=0.5;
        if(t==='reckless') m.risk*=1.5;
        if(t==='curious') m.focus*=1.5;
        if(t==='practical') m.normal*=1.5;
    });
    return m;
}

// NPC 管理函數
function addNPC(npc) {
    if (!npcs.find(n => n.id === npc.id)) {
        npc.known = true;
        npc.status = npc.status || 'active';
        npc.x = Math.random() * 300 - 150;
        npc.y = Math.random() * 300 - 150;
        npcs.push(npc);
        updateNPCBadge();
        if(typeof showFloatingText !== 'undefined') showFloatingText(`遇見了 ${npc.name}`, canvasWidth/2, 100, '#d4c4a0');
    }
}

function updateNPCStatus(npcId, newStatus, reason) {
    const npc = npcs.find(n => n.id === npcId);
    if (npc && npc.status !== newStatus) {
        const oldStatus = npc.status;
        npc.status = newStatus;
        historyLog.push({ role: 'Status', text: `【狀態變更】${npc.name}：${oldStatus} → ${newStatus}${reason ? `（${reason}）` : ''}` });
    }
}

function addRelationship(fromId, toId, type, revealed = false) {
    if(!relationships.find(r => (r.from===fromId && r.to===toId) || (r.from===toId && r.to===fromId))) {
        relationships.push({ from: fromId, to: toId, type, revealed });
    }
}

function revealRelationship(fromId, toId) {
    const rel = relationships.find(r => (r.from===fromId && r.to===toId) || (r.from===toId && r.to===fromId));
    if (rel && !rel.revealed) { rel.revealed = true; return true; }
    return false;
}

function updateNPCBadge() {
    const badge = document.getElementById('npc-count');
    if (npcs.length > 0) { badge.textContent = npcs.length; badge.style.display = 'flex'; }
    else badge.style.display = 'none';
}

// 關係網視覺化 (Canvas繪製) - 增強網狀視覺效果
let relationCanvas, relationCtx;
let selectedNPC = null;
let relationDragging = null;
let relationOffset = { x: 0, y: 0 };
let relationAnimFrame = null;
let relationTime = 0;

function initRelationCanvas() {
    relationCanvas = document.getElementById('relationCanvas');
    if (!relationCanvas) return;

    relationCtx = relationCanvas.getContext('2d');
    const rect = relationCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    relationCanvas.width = rect.width * dpr;
    relationCanvas.height = rect.height * dpr;
    relationCtx.scale(dpr, dpr);

    // 初始化節點位置（圓形佈局）
    initNodePositions();

    // 移除舊的事件監聽器（避免重複綁定）
    relationCanvas.onmousedown = null;
    relationCanvas.onmousemove = null;
    relationCanvas.onmouseup = null;
    relationCanvas.onclick = null;

    // 綁定新的事件監聽器
    relationCanvas.onmousedown = onRelationMouseDown;
    relationCanvas.onmousemove = onRelationMouseMove;
    relationCanvas.onmouseup = onRelationMouseUp;

    // 觸控事件處理
    relationCanvas.ontouchstart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) {
            const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
            onRelationMouseDown(fakeEvent);
        }
    };
    relationCanvas.ontouchmove = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) {
            const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
            onRelationMouseMove(fakeEvent);
        }
    };
    relationCanvas.ontouchend = (e) => {
        e.preventDefault();
        onRelationMouseUp(e);
    };

    // 啟動動畫循環
    if (relationAnimFrame) cancelAnimationFrame(relationAnimFrame);
    animateRelationNetwork();
}

// 初始化節點位置 - 使用圓形佈局
function initNodePositions() {
    const nodes = npcs.filter(n => n.known !== false);
    const count = nodes.length;

    // 玩家固定在中心
    playerCharacter.x = 0;
    playerCharacter.y = 0;

    if (count === 0) return;

    // NPC 圍繞玩家呈圓形分佈
    const baseRadius = Math.min(150, 80 + count * 15);
    nodes.forEach((node, i) => {
        // 如果節點已有有效位置，保留它
        if (node.x !== undefined && node.y !== undefined &&
            (Math.abs(node.x) > 10 || Math.abs(node.y) > 10)) return;

        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        node.x = Math.cos(angle) * baseRadius;
        node.y = Math.sin(angle) * baseRadius;
    });
}

// 動畫循環
function animateRelationNetwork() {
    relationTime += 0.016;
    drawRelationNetwork();
    relationAnimFrame = requestAnimationFrame(animateRelationNetwork);
}

// 停止動畫（當 modal 關閉時調用）
function stopRelationAnimation() {
    if (relationAnimFrame) {
        cancelAnimationFrame(relationAnimFrame);
        relationAnimFrame = null;
    }
}

function getRelationCanvasCoords(e) {
    const rect = relationCanvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    return { x, y };
}

let relationStartPos = { x: 0, y: 0 };

function onRelationMouseDown(e) {
    const { x, y } = getRelationCanvasCoords(e);
    relationStartPos = { x, y };

    const centerX = relationCanvas.width / (window.devicePixelRatio || 1) / 2;
    const centerY = relationCanvas.height / (window.devicePixelRatio || 1) / 2;

    // 檢查節點點擊
    let nodes = [playerCharacter, ...npcs];
    for(let n of nodes) {
        let nx = centerX + n.x, ny = centerY + n.y;
        if(Math.hypot(x - nx, y - ny) < 35) {
            relationDragging = n;
            relationOffset = { x: x - nx, y: y - ny };
            return;
        }
    }
}

function onRelationMouseMove(e) {
    if(relationDragging) {
        const { x, y } = getRelationCanvasCoords(e);
        const centerX = relationCanvas.width / (window.devicePixelRatio || 1) / 2;
        const centerY = relationCanvas.height / (window.devicePixelRatio || 1) / 2;
        relationDragging.x = x - centerX - relationOffset.x;
        relationDragging.y = y - centerY - relationOffset.y;
        drawRelationNetwork();
    }
}

function onRelationMouseUp(e) {
    if(relationDragging) {
        // 計算拖曳距離（使用起始位置比較）
        const currentPos = e.clientX !== undefined ? getRelationCanvasCoords(e) : relationStartPos;
        const dist = Math.hypot(currentPos.x - relationStartPos.x, currentPos.y - relationStartPos.y);

        if(dist < 10) { // 移動距離小於10px視為點擊
            selectedNPC = relationDragging;
            showNPCDetail(selectedNPC);
            drawRelationNetwork(); // 重繪以顯示選中狀態
        }
        relationDragging = null;
    }
}

function drawRelationNetwork() {
    if (!relationCtx) return;
    const w = relationCanvas.width / (window.devicePixelRatio || 1);
    const h = relationCanvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2, cy = h / 2;

    // 繪製背景漸層
    const bgGrad = relationCtx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
    bgGrad.addColorStop(0, '#1a1c24');
    bgGrad.addColorStop(0.5, '#12141a');
    bgGrad.addColorStop(1, '#0a0c10');
    relationCtx.fillStyle = bgGrad;
    relationCtx.fillRect(0, 0, w, h);

    // 繪製背景網格線（增加網狀感）
    drawWebBackground(cx, cy, w, h);

    // 繪製關係連線（帶動畫效果）
    relationships.forEach(rel => {
        if (!rel.revealed) return;
        let f = rel.from === 'player' ? playerCharacter : npcs.find(n => n.id === rel.from);
        let t = rel.to === 'player' ? playerCharacter : npcs.find(n => n.id === rel.to);
        if (f && t) {
            drawRelationLine(cx + f.x, cy + f.y, cx + t.x, cy + t.y, rel.type);
        }
    });

    // 繪製從玩家到所有 NPC 的潛在連線（淡色虛線）
    npcs.forEach(npc => {
        if (npc.known === false) return;
        const hasRelation = relationships.some(r =>
            r.revealed && ((r.from === 'player' && r.to === npc.id) || (r.to === 'player' && r.from === npc.id))
        );
        if (!hasRelation) {
            drawPotentialLine(cx, cy, cx + npc.x, cy + npc.y);
        }
    });

    // 繪製節點
    const allNodes = [playerCharacter, ...npcs.filter(n => n.known !== false)];
    allNodes.forEach(n => {
        const x = cx + n.x, y = cy + n.y;
        const isPlayer = n.id === 'player';
        const isSelected = n === selectedNPC;
        drawNode(x, y, n, isPlayer, isSelected);
    });
}

// 繪製背景網格（蜘蛛網效果）
function drawWebBackground(cx, cy, w, h) {
    relationCtx.save();
    relationCtx.globalAlpha = 0.08;
    relationCtx.strokeStyle = '#4a5568';
    relationCtx.lineWidth = 1;

    // 繪製同心圓
    for (let r = 50; r < Math.max(w, h); r += 60) {
        relationCtx.beginPath();
        relationCtx.arc(cx, cy, r, 0, Math.PI * 2);
        relationCtx.stroke();
    }

    // 繪製放射線
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        relationCtx.beginPath();
        relationCtx.moveTo(cx, cy);
        relationCtx.lineTo(cx + Math.cos(angle) * Math.max(w, h), cy + Math.sin(angle) * Math.max(w, h));
        relationCtx.stroke();
    }

    relationCtx.restore();
}

// 繪製關係連線（帶發光效果）
function drawRelationLine(x1, y1, x2, y2, type) {
    const color = CONFIG.colors.relationColors[type] || '#909090';

    // 解析顏色以創建發光效果
    relationCtx.save();

    // 外發光
    relationCtx.shadowColor = color;
    relationCtx.shadowBlur = 8 + Math.sin(relationTime * 2) * 3;
    relationCtx.strokeStyle = color;
    relationCtx.lineWidth = 2;
    relationCtx.globalAlpha = 0.6;
    relationCtx.beginPath();
    relationCtx.moveTo(x1, y1);
    relationCtx.lineTo(x2, y2);
    relationCtx.stroke();

    // 核心線
    relationCtx.shadowBlur = 0;
    relationCtx.globalAlpha = 1;
    relationCtx.lineWidth = 2;
    relationCtx.beginPath();
    relationCtx.moveTo(x1, y1);
    relationCtx.lineTo(x2, y2);
    relationCtx.stroke();

    // 繪製流動的能量點
    const pulsePos = (relationTime * 0.3) % 1;
    const px = x1 + (x2 - x1) * pulsePos;
    const py = y1 + (y2 - y1) * pulsePos;
    relationCtx.beginPath();
    relationCtx.arc(px, py, 3, 0, Math.PI * 2);
    relationCtx.fillStyle = color;
    relationCtx.fill();

    relationCtx.restore();
}

// 繪製潛在連線（虛線）
function drawPotentialLine(x1, y1, x2, y2) {
    relationCtx.save();
    relationCtx.strokeStyle = '#3a3d4a';
    relationCtx.lineWidth = 1;
    relationCtx.setLineDash([5, 10]);
    relationCtx.globalAlpha = 0.3;
    relationCtx.beginPath();
    relationCtx.moveTo(x1, y1);
    relationCtx.lineTo(x2, y2);
    relationCtx.stroke();
    relationCtx.restore();
}

// 繪製節點
function drawNode(x, y, node, isPlayer, isSelected) {
    const r = isPlayer ? 38 : 28;

    relationCtx.save();

    // 外圈發光（選中或玩家角色）
    if (isSelected || isPlayer) {
        const glowColor = isPlayer ? '#c9a227' : '#5a8fcc';
        const pulseSize = 1 + Math.sin(relationTime * 3) * 0.1;
        relationCtx.shadowColor = glowColor;
        relationCtx.shadowBlur = 20 * pulseSize;
        relationCtx.beginPath();
        relationCtx.arc(x, y, r + 5, 0, Math.PI * 2);
        relationCtx.strokeStyle = glowColor;
        relationCtx.lineWidth = 2;
        relationCtx.globalAlpha = 0.5 + Math.sin(relationTime * 3) * 0.2;
        relationCtx.stroke();
    }

    relationCtx.shadowBlur = 0;
    relationCtx.globalAlpha = 1;

    // 節點背景漸層
    const nodeGrad = relationCtx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    if (isPlayer) {
        nodeGrad.addColorStop(0, '#4a4535');
        nodeGrad.addColorStop(1, '#2a2520');
    } else {
        nodeGrad.addColorStop(0, '#3a3d4a');
        nodeGrad.addColorStop(1, '#22252f');
    }

    relationCtx.beginPath();
    relationCtx.arc(x, y, r, 0, Math.PI * 2);
    relationCtx.fillStyle = nodeGrad;
    relationCtx.fill();

    // 節點邊框
    if (isPlayer) {
        const borderGrad = relationCtx.createLinearGradient(x - r, y - r, x + r, y + r);
        borderGrad.addColorStop(0, '#deb887');
        borderGrad.addColorStop(0.5, '#c9a227');
        borderGrad.addColorStop(1, '#a08020');
        relationCtx.strokeStyle = borderGrad;
        relationCtx.lineWidth = 3;
    } else {
        relationCtx.strokeStyle = isSelected ? '#c9a227' : '#5a5d6a';
        relationCtx.lineWidth = 2;
    }
    relationCtx.stroke();

    // 節點名稱
    relationCtx.fillStyle = isPlayer ? '#deb887' : '#d8d8d0';
    relationCtx.font = isPlayer ? '700 14px "Noto Serif TC"' : '400 13px "Noto Serif TC"';
    relationCtx.textAlign = 'center';
    relationCtx.textBaseline = 'middle';
    relationCtx.fillText(node.name, x, y + r + 18);

    // 玩家節點內部裝飾
    if (isPlayer) {
        relationCtx.fillStyle = '#c9a227';
        relationCtx.font = '400 18px serif';
        relationCtx.fillText('✧', x, y);
    }

    relationCtx.restore();
}

function showNPCDetail(node) {
    const panel = document.getElementById('npc-detail');
    if (!node) return panel.classList.remove('show');

    const isPlayer = node.id === 'player';
    const relationLabels = {
        love: '愛慕',
        ally: '同盟',
        neutral: '中立',
        rival: '競爭',
        enemy: '敵對'
    };

    // 取得此角色的所有關係
    const nodeRelations = relationships.filter(r =>
        r.revealed && (r.from === node.id || r.to === node.id)
    ).map(r => {
        const otherId = r.from === node.id ? r.to : r.from;
        const other = otherId === 'player' ? playerCharacter : npcs.find(n => n.id === otherId);
        return {
            name: other?.name || '未知',
            type: r.type,
            label: relationLabels[r.type] || '未知'
        };
    });

    let html = `
        <h3>${node.name}</h3>
        ${node.role ? `<div class="role">${node.role}</div>` : ''}
        <div class="desc">${node.desc || '尚未深入了解此人...'}</div>
    `;

    if (nodeRelations.length > 0) {
        html += `<div class="relations"><div style="color:#7a7d8a;font-size:13px;margin-bottom:10px;">已知關係</div>`;
        nodeRelations.forEach(rel => {
            html += `
                <div class="relation-item">
                    <span class="target">${rel.name}</span>
                    <span class="status ${rel.type}">${rel.label}</span>
                </div>
            `;
        });
        html += `</div>`;
    } else if (!isPlayer) {
        html += `<div style="color:#5a5d6a;font-size:13px;margin-top:15px;font-style:italic;">尚未發現與其他角色的關係...</div>`;
    }

    panel.innerHTML = html;
    panel.classList.add('show');
}

// --- 6. 時間線渲染 ---
function renderTimeline() {
    const container = document.getElementById('timeline-content');
    if (!container) return;

    if (!savePoints || savePoints.length === 0) {
        container.innerHTML = '<div class="timeline-empty">尚無存檔點。冒險中的重要抉擇會自動記錄於此。</div>';
        return;
    }

    container.innerHTML = savePoints.map((sp, index) => `
        <div class="timeline-item ${sp.isMajor ? 'major' : ''}" data-id="${sp.id}" onclick="toggleTimelineDetail('${sp.id}')">
            <div class="timeline-date">${sp.calendarString}</div>
            <div class="timeline-name">${sp.name}</div>
            <div class="timeline-detail" id="detail-${sp.id}">
                <div class="timeline-detail-row">
                    <span>記錄時間</span>
                    <span>${new Date(sp.timestamp).toLocaleString()}</span>
                </div>
                <div class="timeline-detail-row">
                    <span>命運點</span>
                    <span>${sp.snapshot?.fatePoints || 0}</span>
                </div>
                <div class="timeline-detail-row">
                    <span>已知NPC</span>
                    <span>${sp.snapshot?.npcs?.length || 0} 人</span>
                </div>
                <button class="timeline-revert-btn" onclick="event.stopPropagation();revertToSavePoint('${sp.id}')">
                    ⏪ 回溯到此節點
                    <span class="timeline-cost">（消耗 ${sp.isMajor ? 8 : 5} 命運點）</span>
                </button>
            </div>
        </div>
    `).reverse().join('');
}

function toggleTimelineDetail(savePointId) {
    const detail = document.getElementById(`detail-${savePointId}`);
    if (detail) {
        detail.classList.toggle('show');
    }
}