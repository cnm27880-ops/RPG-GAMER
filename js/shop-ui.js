// ============ 靈魂商店 UI 邏輯 ============

function setupShopButton() {
    const shopBtn = document.getElementById('btn-shop');
    if (shopBtn) {
        shopBtn.addEventListener('click', () => toggleShopModal(true));
    }
}

function updateSoulShardDisplay() {
    if (typeof globalSave !== 'undefined') {
        const shards = globalSave.getSoulShards();
        const badge = document.getElementById('soul-shard-badge');
        if (badge) {
            badge.textContent = shards;
            badge.style.display = shards > 0 ? 'flex' : 'none';
        }
    }
}

function toggleShopModal(show) {
    const modal = document.getElementById('shop-modal');
    if (!modal) return;

    modal.classList.toggle('show', show);

    if (show && typeof globalSave !== 'undefined') {
        // 更新商店資料
        const stats = globalSave.getStatistics();
        document.getElementById('shop-soul-shards').textContent = stats.soulShards;
        document.getElementById('stat-total-games').textContent = stats.totalGames;
        document.getElementById('stat-victories').textContent = stats.totalVictories;
        document.getElementById('stat-longest').textContent = stats.longestSurvival;

        // 預設顯示身世標籤
        switchShopTab('backgrounds');
    }
}

let currentShopTab = 'backgrounds';

function switchShopTab(tab) {
    currentShopTab = tab;

    // 更新標籤樣式
    document.querySelectorAll('.shop-tab').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(getTabName(tab)));
    });

    // 渲染商店內容
    renderShopItems(tab);
}

function getTabName(tab) {
    const names = {
        'backgrounds': '身世',
        'startingItems': '道具',
        'abilities': '能力'
    };
    return names[tab] || '';
}

function renderShopItems(category) {
    const container = document.getElementById('shop-content');
    if (!container || typeof LegacyShop === 'undefined') return;

    const items = LegacyShop.getAvailableItems()[category] || [];

    const html = items.map(item => {
        const unlocked = item.unlocked;
        const affordable = item.affordable;
        const canBuy = !unlocked && affordable;
        const onclick = canBuy ? 'purchaseShopItem(\'' + category + '\', \'' + item.id + '\')' : '';

        let unlockButton = '';
        if (!unlocked) {
            unlockButton = '<button class="shop-item-unlock-btn" ' +
                (affordable ? '' : 'disabled') + '>' +
                (affordable ? '解鎖' : '碎片不足') +
                '</button>';
        }

        const benefitsHtml = item.benefits.map(b =>
            '<div class="shop-benefit">' + b + '</div>'
        ).join('');

        return '<div class="shop-item ' + (unlocked ? 'unlocked ' : '') + (!canBuy ? 'disabled' : '') + '" ' +
            (onclick ? 'onclick="' + onclick + '"' : '') + '>' +
            '<div class="shop-item-header">' +
            '<div class="shop-item-icon">' + item.icon + '</div>' +
            '<div class="shop-item-info">' +
            '<div class="shop-item-name">' + item.name + '</div>' +
            '<div class="shop-item-cost ' + (unlocked ? 'unlocked' : '') + '">' +
            (unlocked ? '✓ 已擁有' : '💎 ' + item.cost + ' 碎片') +
            '</div></div></div>' +
            '<div class="shop-item-desc">' + item.desc + '</div>' +
            '<div class="shop-item-benefits">' + benefitsHtml + '</div>' +
            unlockButton +
            '</div>';
    }).join('');

    container.innerHTML = html;
}

function purchaseShopItem(category, itemId) {
    if (typeof LegacyShop === 'undefined') return;

    const result = LegacyShop.purchase(category, itemId);

    if (result.success) {
        // 顯示成功訊息
        if (typeof showError === 'function') {
            showError(result.message, 3000, '#80c090');
        }

        // 更新顯示
        updateSoulShardDisplay();
        toggleShopModal(true); // 重新渲染
    } else {
        // 顯示失敗訊息
        if (typeof showError === 'function') {
            showError(result.message, 3000);
        }
    }
}

// 遊戲結束時的靈魂碎片結算
function showGameEndReward(gameState) {
    if (typeof SoulShardCalculator === 'undefined' || typeof globalSave === 'undefined') return;

    const { shards, reasons } = SoulShardCalculator.calculate(gameState);

    // 記錄遊戲結束
    globalSave.recordGameEnd({
        victory: gameState.victory || false,
        survivalHours: Math.floor((gameState.turnCount || 0) / 4),
        score: shards,
        timestamp: Date.now()
    });

    // 添加靈魂碎片
    globalSave.addSoulShards(shards);
    updateSoulShardDisplay();

    // 顯示獎勵訊息
    const message = '遊戲結束！\\n\\n獲得 ' + shards + ' 靈魂碎片\\n\\n' + reasons.join('\\n');
    alert(message);

    // 提示打開商店
    if (shards >= 30) {
        const openShop = confirm('你已累積足夠的靈魂碎片！\\n是否前往靈魂商店？');
        if (openShop) {
            toggleShopModal(true);
        }
    }
}
