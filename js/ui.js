// ============ 介面元件模組 ============

let buttons = [];
let particles = [];
let floatingTexts = [];

class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.r = Math.random() * 2 + 0.5;
        this.speed = Math.random() * 0.3 + 0.1;
        this.alpha = Math.random() * 0.4 + 0.1;
        this.drift = (Math.random() - 0.5) * 0.2;
    }
    update() {
        this.y -= this.speed;
        this.x += this.drift;
        if (this.y < -10) {
            this.y = canvasHeight + 10;
            this.x = Math.random() * canvasWidth;
        }
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

class FloatingText {
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.alpha = 1;
        this.vy = -1;
    }
    update() {
        this.y += this.vy;
        this.alpha -= 0.015;
        return this.alpha > 0;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = '700 20px "Noto Serif TC"';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

function showFloatingText(text, x, y, color) {
    floatingTexts.push(new FloatingText(text, x, y, color));
}

class Button {
    constructor(text, x, y, w, h, callback, type = 'normal') {
        this.text = text;
        this.rect = { x, y, w, h };
        this.callback = callback;
        this.type = type;
        this.hover = false;
        this.hoverAnim = 0;
    }
    update() {
        const { x, y, w, h } = this.rect;
        const inBounds = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
        this.hover = inBounds;
        this.hoverAnim += (inBounds ? 0.15 : -0.1);
        this.hoverAnim = Math.max(0, Math.min(1, this.hoverAnim));
    }
    draw() {
        const { x, y, w, h } = this.rect;
        const anim = this.hoverAnim * 3;
        ctx.save();

        if (this.type === 'world') {
            ctx.fillStyle = this.hover ? 'rgba(50, 45, 40, 0.95)' : 'rgba(30, 28, 25, 0.9)';
            ctx.strokeStyle = this.hover ? CONFIG.colors.textGold : '#3a3530';
        } else if (this.type === 'start') {
            ctx.fillStyle = this.hover ? CONFIG.colors.textGold : 'rgba(40, 35, 30, 0.9)';
            ctx.strokeStyle = CONFIG.colors.textGold;
        } else {
            ctx.fillStyle = this.hover ? 'rgba(50, 48, 45, 0.95)' : 'rgba(35, 33, 30, 0.9)';
            ctx.strokeStyle = this.hover ? CONFIG.colors.textGold : '#4a4540';
        }

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.roundRect(ctx, x - anim/2, y - anim, w + anim, h + anim/2, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = this.type === 'world' ? fonts.display : `700 ${isMobile ? 16 : 18}px "Noto Serif TC"`;
        ctx.fillStyle = (this.type === 'start' && this.hover) ? '#0d0f14' : (this.hover ? '#fff' : CONFIG.colors.textPrimary);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let disp = this.text;
        if (this.timeAdvance) disp += ' ⏱';
        this.wrapText(ctx, disp, x + w/2, y + h/2 - anim, w - 20);
        ctx.restore();
    }
    roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x+r, y);
        ctx.lineTo(x+w-r, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r);
        ctx.quadraticCurveTo(x, y, x+r, y);
        ctx.closePath();
    }
    wrapText(ctx, text, x, centerY, maxW) {
        ctx.fillText(text, x, centerY); // 簡化版
    }
}

class Typewriter {
    constructor() { this.text = ""; this.idx = 0; this.done = true; }
    start(text) { this.text = text; this.idx = 0; this.done = false; }
    skip() { this.idx = this.text.length; this.done = true; }
    update() {
        if (this.done) return;
        this.idx += isMobile ? 0.7 : 0.5;
        if (this.idx >= this.text.length) { this.idx = this.text.length; this.done = true; onTypingComplete(); }
    }
    draw() {
        if (currentState !== STATE.TYPING && currentState !== STATE.CHOICE) return;
        const maxW = Math.min(canvasWidth - 40, 700);
        const startX = (canvasWidth - maxW) / 2;
        const startY = isMobile ? 95 : 120;
        const lh = isMobile ? 30 : 36;
        ctx.save();
        ctx.font = fonts.body;
        ctx.fillStyle = CONFIG.colors.textPrimary;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const str = this.text.substring(0, Math.floor(this.idx));
        let line = '', cy = startY;
        for (const char of str) {
            if (ctx.measureText(line + char).width > maxW && line) {
                ctx.fillText(line, startX, cy);
                line = char;
                cy += lh;
            } else line += char;
        }
        ctx.fillText(line, startX, cy);
        ctx.restore();
    }
}

const typewriter = new Typewriter();

function drawFactionHUD() {
    if (!currentWorld || currentState < STATE.TYPING) return;
    // 手機版暫時簡化顯示或隱藏，避免擋住
    if (canvasWidth < 600) return; 

    const boxW = 180, boxH = 110;
    const startX = canvasWidth - boxW - 20, startY = 70;
    const pad = 10;

    ctx.save();
    ctx.fillStyle = CONFIG.colors.panelBg;
    ctx.strokeStyle = CONFIG.colors.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, startY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = fonts.small;
    ctx.textAlign = 'center';
    ctx.fillText("陣營聲望", startX + boxW/2, startY + 18);

    let cy = startY + 38;
    factionData.forEach((f, i) => {
        ctx.font = fonts.small;
        ctx.textAlign = 'left';
        ctx.fillStyle = CONFIG.colors.textPrimary;
        ctx.fillText(f.name, startX + pad, cy);
        ctx.textAlign = 'right';
        ctx.fillStyle = CONFIG.colors.factions[i];
        ctx.fillText(f.rep, startX + boxW - pad, cy);
        cy += 6;
        ctx.fillRect(startX + pad, cy, (f.rep/100)*(boxW-pad*2), 3);
        cy += 18;
    });
    ctx.restore();
}

// 模態視窗開關
function toggleRelationModal(show) {
    document.getElementById('relation-modal').classList.toggle('show', show);
    if (show) { initRelationCanvas(); drawRelationNetwork(); }
}
function toggleLogModal(show) { document.getElementById('log-modal').classList.toggle('show', show); }
function toggleSettingsModal(show) {
    document.getElementById('settings-modal').classList.toggle('show', show);
    if (show) {
        // 載入 API Key
        document.getElementById('api-key-input').value = apiKey;

        // 載入 LLM 設定
        if (typeof loadLLMSettings === 'function') {
            loadLLMSettings();
        }

        // 更新 Provider 資訊
        if (typeof updateProviderInfo === 'function') {
            updateProviderInfo();
        }
    }
}
function toggleTimelineModal(show) {
    document.getElementById('timeline-modal').classList.toggle('show', show);
    if (show) renderTimeline(); // 需確保 renderTimeline 在 systems.js 定義並可訪問
}
function toggleCharacterCreateModal(show) {
    document.getElementById('character-create-modal').classList.toggle('show', show);
    if (show) resetCharacterForm();
}
function toggleWorldIntroModal(show) {
    document.getElementById('world-intro-modal').classList.toggle('show', show);
    // 修復：關閉時若在選擇介面，恢復按鈕
    if(!show && currentState === STATE.WORLD_SELECT) setupWorldSelectUI();
}