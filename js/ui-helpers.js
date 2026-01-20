// ============ UI 輔助函數 - 末日鐘與世界詳情 ============

/**
 * 更新末日鐘 UI
 */
function updateDoomClockUI(gameState) {
    if (!gameState) return;

    const doomDisplay = document.getElementById('doom-display');
    const doomBar = document.getElementById('doom-bar');
    const doomLevel = document.getElementById('doom-level');

    if (!doomDisplay || !doomBar || !doomLevel) return;

    // 顯示末日鐘
    doomDisplay.style.display = 'block';

    // 更新進度條寬度
    const doomValue = Math.floor(gameState.doomClock);
    doomBar.style.width = `${doomValue}%`;

    // 更新顏色
    const color = gameState.getDoomColor();
    doomBar.style.background = `linear-gradient(90deg, ${color}, ${adjustColor(color, -20)})`;

    // 更新文字
    doomLevel.textContent = gameState.getDoomLevelDescription();
    doomLevel.style.color = color;
}

/**
 * 調整顏色亮度（簡易版）
 */
function adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}

/**
 * 切換世界詳情 Modal
 */
function toggleWorldInfoModal(show) {
    const modal = document.getElementById('world-info-modal');
    if (!modal) return;

    if (show) {
        modal.style.display = 'flex';
        updateWorldInfoContent();
    } else {
        modal.style.display = 'none';
    }
}

/**
 * 更新世界詳情內容
 */
function updateWorldInfoContent() {
    if (!gameManager || !gameManager.state || !gameManager.state.currentWorld) return;

    const world = gameManager.state.currentWorld;
    const gameState = gameManager.state;

    // 更新基本資訊
    const basicInfo = document.getElementById('world-basic-info');
    if (basicInfo) {
        basicInfo.innerHTML = `
            <div><strong>世界名稱：</strong>${world.name}</div>
            <div style="margin-top:8px;"><strong>主題：</strong>${world.theme}</div>
            <div style="margin-top:8px;">${world.desc}</div>
            <div style="margin-top:8px;"><strong>核心衝突：</strong>${world.conflict}</div>
        `;
    }

    // 更新異變列表
    const mutatorsList = document.getElementById('world-mutators-list');
    if (mutatorsList) {
        if (world.mutators && world.mutators.length > 0) {
            mutatorsList.innerHTML = world.mutators.map(mutator => `
                <div class="mutator-card rarity-${mutator.rarity}">
                    <div class="mutator-icon">${mutator.icon}</div>
                    <div class="mutator-content">
                        <div class="mutator-name" style="color:#deb887;">${mutator.name}</div>
                        <div class="mutator-desc">${mutator.desc}</div>
                        <div class="mutator-desc" style="margin-top:6px;color:#9a9aaa;font-size:12px;">
                            ${mutator.prompt.replace('【世界異變規則】：', '').replace(/\n/g, '')}
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            mutatorsList.innerHTML = '<div style="color:#7a7a8a;text-align:center;">無世界異變</div>';
        }
    }

    // 更新陣營列表
    const factionsList = document.getElementById('world-factions-list');
    if (factionsList && gameState.factionData && gameState.factionData.length > 0) {
        factionsList.innerHTML = gameState.factionData.map((faction, i) => {
            const repColor = faction.rep >= 70 ? '#80c090' :
                           faction.rep >= 40 ? '#c0a060' :
                           faction.rep >= 20 ? '#9a9aaa' : '#c07070';

            return `
                <div style="background:rgba(30,30,40,0.5);padding:12px;border-radius:6px;border:1px solid #3a3d4a;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:700;color:#deb887;">${faction.name}</span>
                        <span style="color:${repColor};font-weight:700;">聲望 ${faction.rep}</span>
                    </div>
                    <div style="margin-top:6px;font-size:13px;color:#b0b5c0;">${faction.desc || world.factions[i]?.desc || ''}</div>
                </div>
            `;
        }).join('');
    }
}

/**
 * 更新工具列按鈕顯示狀態
 */
function updateToolbarButtonVisibility() {
    const worldInfoBtn = document.getElementById('btn-world-info');
    if (worldInfoBtn && gameManager && gameManager.state && gameManager.state.currentWorld) {
        worldInfoBtn.style.display = 'flex';
    }
}

/**
 * 優化按鈕點擊反應（立即清空並顯示 Loading）
 */
function optimizeButtonClick(buttonElements, loadingText = '命運推演中...') {
    // 清空所有按鈕
    if (typeof buttons !== 'undefined') {
        buttons = [];
    }

    // 隱藏按鈕容器（如果有的話）
    buttonElements.forEach(btn => {
        if (btn && btn.parentElement) {
            btn.parentElement.style.display = 'none';
        }
    });

    // 顯示 Loading 文字
    if (typeof loadingText !== 'undefined' && gameManager && gameManager.state) {
        gameManager.state.loadingText = loadingText;
    }
}

/**
 * 根據末日值調整 Canvas 粒子效果
 */
function updateParticlesByDoomLevel(particles, doomLevel) {
    if (!particles || particles.length === 0) return;

    // 根據末日等級調整粒子顏色和速度
    const levelConfig = [
        { color: [80, 192, 144], speed: 0.5 },   // 0: 綠色，慢速
        { color: [192, 160, 96], speed: 0.7 },   // 1: 黃色，中速
        { color: [192, 144, 96], speed: 0.9 },   // 2: 橙色，快速
        { color: [192, 112, 112], speed: 1.2 },  // 3: 紅色，很快
        { color: [160, 64, 160], speed: 1.5 }    // 4: 紫色，極快
    ];

    const config = levelConfig[doomLevel] || levelConfig[0];

    particles.forEach(p => {
        if (p.baseSpeed) {
            p.speedX = p.baseSpeed * config.speed * (Math.random() - 0.5);
            p.speedY = p.baseSpeed * config.speed * (Math.random() - 0.5);
        }

        // 更新顏色（漸變）
        if (p.color) {
            p.color.r += (config.color[0] - p.color.r) * 0.05;
            p.color.g += (config.color[1] - p.color.g) * 0.05;
            p.color.b += (config.color[2] - p.color.b) * 0.05;
        }
    });
}

// 綁定世界詳情按鈕事件（在 DOM 載入後）
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const worldInfoBtn = document.getElementById('btn-world-info');
        if (worldInfoBtn) {
            worldInfoBtn.addEventListener('click', () => toggleWorldInfoModal(true));
        }
    });
}
