// ============ 傳承與解鎖系統 (Legacy & Unlocks) ============

/**
 * 全域存檔結構
 * 跨局次持久化數據，存儲在 localStorage
 */
class GlobalSave {
    constructor() {
        this.data = this.load();
    }

    // 預設數據結構
    getDefaultData() {
        return {
            version: '2.0',
            statistics: {
                totalGames: 0,          // 總遊戲次數
                totalDeaths: 0,          // 總死亡次數
                totalVictories: 0,       // 總勝利次數
                longestSurvival: 0,      // 最長存活時間（小時）
                soulShards: 0,           // 靈魂碎片總數
                totalShardsEarned: 0,    // 累計獲得的碎片
            },
            unlocks: {
                backgrounds: ['wanderer'],  // 已解鎖身世
                startingItems: [],          // 已解鎖初始道具
                mutations: [],               // 已解鎖特殊異變
                npcs: [],                    // 已解鎖 NPC（可轉世相認）
            },
            achievements: [],               // 成就列表
            history: {
                bestRuns: [],               // 最佳遊戲記錄（top 10）
                discoveredNPCs: [],         // 發現過的 NPC
                discoveredEvents: [],       // 發現過的事件
                discoveredEndings: [],      // 發現過的結局
            },
            settings: {
                autoSaveLegacy: true,
                showLegacyNotifications: true,
            }
        };
    }

    // 從 localStorage 載入
    load() {
        try {
            const saved = localStorage.getItem('rpg_legacy_save');
            if (saved) {
                const parsed = JSON.parse(saved);
                // 合併預設值（處理版本升級）
                return { ...this.getDefaultData(), ...parsed };
            }
        } catch (e) {
            console.error('載入全域存檔失敗:', e);
        }
        return this.getDefaultData();
    }

    // 儲存到 localStorage
    save() {
        try {
            localStorage.setItem('rpg_legacy_save', JSON.stringify(this.data));
            return true;
        } catch (e) {
            console.error('儲存全域存檔失敗:', e);
            return false;
        }
    }

    // 獲取靈魂碎片數量
    getSoulShards() {
        return this.data.statistics.soulShards;
    }

    // 添加靈魂碎片
    addSoulShards(amount) {
        this.data.statistics.soulShards += amount;
        this.data.statistics.totalShardsEarned += amount;
        this.save();
        return this.data.statistics.soulShards;
    }

    // 消耗靈魂碎片
    spendSoulShards(amount) {
        if (this.data.statistics.soulShards < amount) return false;
        this.data.statistics.soulShards -= amount;
        this.save();
        return true;
    }

    // 記錄遊戲結束
    recordGameEnd(result) {
        this.data.statistics.totalGames++;

        if (result.victory) {
            this.data.statistics.totalVictories++;
        } else {
            this.data.statistics.totalDeaths++;
        }

        // 更新最長存活
        if (result.survivalHours > this.data.statistics.longestSurvival) {
            this.data.statistics.longestSurvival = result.survivalHours;
        }

        // 添加到最佳記錄
        this.data.history.bestRuns.push(result);
        this.data.history.bestRuns.sort((a, b) => b.score - a.score);
        this.data.history.bestRuns = this.data.history.bestRuns.slice(0, 10);

        this.save();
    }

    // 解鎖身世
    unlockBackground(backgroundId) {
        if (!this.data.unlocks.backgrounds.includes(backgroundId)) {
            this.data.unlocks.backgrounds.push(backgroundId);
            this.save();
            return true;
        }
        return false;
    }

    // 解鎖初始道具
    unlockStartingItem(itemId) {
        if (!this.data.unlocks.startingItems.includes(itemId)) {
            this.data.unlocks.startingItems.push(itemId);
            this.save();
            return true;
        }
        return false;
    }

    // 檢查是否已解鎖
    isUnlocked(type, id) {
        return this.data.unlocks[type]?.includes(id) || false;
    }

    // 記錄發現的 NPC
    discoverNPC(npc) {
        const exists = this.data.history.discoveredNPCs.find(n => n.id === npc.id);
        if (!exists) {
            this.data.history.discoveredNPCs.push({
                id: npc.id,
                name: npc.name,
                role: npc.role,
                desc: npc.desc,
                discoveredAt: Date.now()
            });
            this.save();
        }
    }

    // 獲取統計數據
    getStatistics() {
        return { ...this.data.statistics };
    }

    // 重置存檔（警告：不可逆）
    reset() {
        this.data = this.getDefaultData();
        this.save();
    }
}

// 全域實例
const globalSave = new GlobalSave();

/**
 * 靈魂碎片結算邏輯
 */
class SoulShardCalculator {
    // 計算遊戲結束時獲得的靈魂碎片
    static calculate(gameState) {
        let shards = 0;
        const reasons = [];

        // 基礎獎勵：存活時間
        const survivalHours = Math.floor(gameState.turnCount / 4); // 假設每4回合=1小時
        shards += survivalHours;
        reasons.push(`存活 ${survivalHours} 小時：${survivalHours} 碎片`);

        // NPC 關係獎勵
        const allies = gameState.npcs?.filter(n => n.relationship === 'ally').length || 0;
        if (allies > 0) {
            const allyBonus = allies * 5;
            shards += allyBonus;
            reasons.push(`結盟 ${allies} 個 NPC：${allyBonus} 碎片`);
        }

        // 命運點獎勵
        if (gameState.fatePoints > 0) {
            const fateBonus = Math.floor(gameState.fatePoints / 2);
            shards += fateBonus;
            reasons.push(`剩餘命運點 ${gameState.fatePoints}：${fateBonus} 碎片`);
        }

        // 陣營聲望獎勵
        const maxRep = Math.max(...(gameState.factions?.map(f => f.rep) || [50]));
        if (maxRep >= 80) {
            shards += 10;
            reasons.push(`高聲望（${maxRep}）：10 碎片`);
        }

        // 異變挑戰獎勵
        if (gameState.mutators && gameState.mutators.length > 0) {
            const mutatorBonus = gameState.mutators.reduce((acc, m) => {
                const bonusMap = { common: 2, uncommon: 4, rare: 8, epic: 15, legendary: 30 };
                return acc + (bonusMap[m.rarity] || 2);
            }, 0);
            shards += mutatorBonus;
            reasons.push(`異變挑戰（${gameState.mutators.length}個）：${mutatorBonus} 碎片`);
        }

        // 勝利獎勵
        if (gameState.victory) {
            shards += 50;
            reasons.push(`完成主線：50 碎片`);
        }

        // 首次成就獎勵
        // ... 可以根據 achievements 系統擴展

        return { shards, reasons };
    }
}

/**
 * 解鎖商店物品定義
 */
const SHOP_ITEMS = {
    // ===== 身世 =====
    backgrounds: {
        exile: {
            id: 'exile',
            name: '皇室流亡者',
            desc: '你曾是王國的繼承人，但政變讓你失去了一切',
            cost: 50,
            icon: '👑',
            benefits: ['初始威儀 +2', '貴族陣營好感 +20', '開局獲得「家族印章」'],
        },
        cyborg: {
            id: 'cyborg',
            name: '賽博改造人',
            desc: '機械與血肉的結合體，超越人類的極限',
            cost: 80,
            icon: '🤖',
            benefits: ['初始理性 +3', '科技選項成功率 +20%', '開局獲得「神經增幅器」'],
        },
        cultist: {
            id: 'cultist',
            name: '古神信徒',
            desc: '你聽見了黑暗中的低語，獲得了禁忌知識',
            cost: 100,
            icon: '👁️',
            benefits: ['初始機變 +2', '可使用獻祭選項', '開局獲得「禁忌典籍」'],
        },
        timelord: {
            id: 'timelord',
            name: '時間旅者',
            desc: '你來自未來，試圖改變某個關鍵事件',
            cost: 150,
            icon: '⌛',
            benefits: ['開局已知部分劇情', '每局遊戲可免費使用1次時光倒流', '初始命運點 +5'],
        },
    },

    // ===== 初始道具 =====
    startingItems: {
        father_relic: {
            id: 'father_relic',
            name: '父親的遺物',
            desc: '一枚刻有家族紋章的戒指，總能帶來好運',
            cost: 30,
            icon: '💍',
            benefits: ['所有檢定難度 -1'],
        },
        master_key: {
            id: 'master_key',
            name: '萬能鑰匙',
            desc: '能打開任何鎖，包括心鎖',
            cost: 40,
            icon: '🔑',
            benefits: ['自動解鎖所有「潛入」選項', '機變檢定 +2'],
        },
        truth_monocle: {
            id: 'truth_monocle',
            name: '真實之眼',
            desc: '透過這片單鏡片，你能看穿謊言',
            cost: 60,
            icon: '🧐',
            benefits: ['自動識破 NPC 的謊言', '理性檢定 +2'],
        },
        silver_tongue: {
            id: 'silver_tongue',
            name: '銀舌徽章',
            desc: '佩戴者的話語如蜜糖般甜美',
            cost: 50,
            icon: '🎭',
            benefits: ['共情檢定 +3', 'NPC 初始好感 +10'],
        },
    },

    // ===== 特殊能力 =====
    abilities: {
        reincarnation_memory: {
            id: 'reincarnation_memory',
            name: '轉世記憶',
            desc: '讓上局的一個 NPC 關係「轉生」到下個世界',
            cost: 100,
            icon: '♻️',
            benefits: ['可選擇一個 NPC，下局遊戲中他會神秘地認識你'],
        },
        fate_affinity: {
            id: 'fate_affinity',
            name: '命運親和',
            desc: '你與命運之神達成了某種契約',
            cost: 80,
            icon: '✨',
            benefits: ['每局遊戲初始命運點 +3', '命運干涉消耗 -1'],
        },
        prophecy_sight: {
            id: 'prophecy_sight',
            name: '預言之眼',
            desc: '偶爾能看見未來的片段',
            cost: 120,
            icon: '🔮',
            benefits: ['每局遊戲隨機獲得 3 個「預知提示」'],
        },
    },
};

/**
 * 商店管理器
 */
class LegacyShop {
    static canAfford(itemCost) {
        return globalSave.getSoulShards() >= itemCost;
    }

    static purchase(category, itemId) {
        const item = SHOP_ITEMS[category]?.[itemId];
        if (!item) return { success: false, message: '物品不存在' };

        // 檢查是否已購買
        if (globalSave.isUnlocked(category, itemId)) {
            return { success: false, message: '已經擁有此物品' };
        }

        // 檢查碎片是否足夠
        if (!this.canAfford(item.cost)) {
            return {
                success: false,
                message: `靈魂碎片不足（需要 ${item.cost}，擁有 ${globalSave.getSoulShards()}）`
            };
        }

        // 扣除碎片並解鎖
        if (globalSave.spendSoulShards(item.cost)) {
            if (category === 'backgrounds') {
                globalSave.unlockBackground(itemId);
            } else if (category === 'startingItems' || category === 'abilities') {
                globalSave.unlockStartingItem(itemId);
            }

            return {
                success: true,
                message: `成功解鎖：${item.name}`,
                item: item
            };
        }

        return { success: false, message: '交易失敗' };
    }

    static getAvailableItems() {
        const result = {};

        for (const [category, items] of Object.entries(SHOP_ITEMS)) {
            result[category] = [];
            for (const [id, item] of Object.entries(items)) {
                result[category].push({
                    ...item,
                    unlocked: globalSave.isUnlocked(category, id),
                    affordable: this.canAfford(item.cost),
                });
            }
        }

        return result;
    }
}
