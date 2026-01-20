// ============ 世界異變系統 (World Mutators) ============

/**
 * 世界異變卡牌定義
 * 每次開局隨機抽取 1-3 個異變，改變遊戲規則
 */
const WORLD_MUTATORS = {
    blood_moon: {
        id: 'blood_moon',
        name: '血月之夜',
        icon: '🌕',
        desc: '血色月光籠罩世界，權威與恐懼交織',
        rarity: 'rare',
        effects: {
            authority_difficulty: 2,  // 威儀檢定難度 +2
            empathy_bonus: 'monster_tame',  // 共情可感化怪物
        },
        prompt: '【血月異變】威儀檢定難度+2，但共情檢定有機會直接感化敵對生物'
    },

    mana_drought: {
        id: 'mana_drought',
        name: '魔力枯竭',
        icon: '🌑',
        desc: '世界的魔力源頭乾涸，科技崛起',
        rarity: 'common',
        effects: {
            magic_disabled: true,  // 禁用魔法選項
            tech_boost: 2,  // 科技類選項效果翻倍
        },
        prompt: '【魔力枯竭】無法使用魔法相關選項，科技類選項效果翻倍'
    },

    paranoia_chain: {
        id: 'paranoia_chain',
        name: '猜疑鏈',
        icon: '🕸️',
        desc: '每個人都懷疑著彼此，信任成為最稀缺的貨幣',
        rarity: 'uncommon',
        effects: {
            npc_initial_rep: -20,  // 所有 NPC 初始好感 -20
            alliance_bonus: 2,  // 成功結盟後聲望獲得翻倍
        },
        prompt: '【猜疑鏈】所有 NPC 初始好感度為負，但成功結盟後獲得的聲望加倍'
    },

    truth_curse: {
        id: 'truth_curse',
        name: '真言詛咒',
        icon: '👁️',
        desc: '謊言在這個世界會立即被揭穿',
        rarity: 'rare',
        effects: {
            cunning_disabled: true,  // 無法使用機變相關選項
            logic_boost: 3,  // 理性檢定加成 +3
        },
        prompt: '【真言詛咒】無法使用欺騙和偽裝，理性檢定獲得 +3 加成'
    },

    time_fracture: {
        id: 'time_fracture',
        name: '時間裂痕',
        icon: '⏳',
        desc: '時間流速不穩定，有些事情發生得太快或太慢',
        rarity: 'epic',
        effects: {
            random_time_cost: true,  // 選項時間消耗隨機（1-3倍）
            fate_point_boost: 2,  // 命運點獲得翻倍
        },
        prompt: '【時間裂痕】選項時間消耗隨機（可能更快或更慢），但命運事件觸發率翻倍'
    },

    endless_feast: {
        id: 'endless_feast',
        name: '永恆盛宴',
        icon: '🍷',
        desc: '世界陷入狂歡，理智變得稀有',
        rarity: 'uncommon',
        effects: {
            logic_difficulty: 2,  // 理性檢定難度 +2
            empathy_boost: 2,  // 共情檢定加成 +2
        },
        prompt: '【永恆盛宴】理性檢定難度+2，共情檢定獲得 +2 加成'
    },

    iron_law: {
        id: 'iron_law',
        name: '鐵律時代',
        icon: '⚖️',
        desc: '嚴苛的法律統治一切，秩序至上',
        rarity: 'common',
        effects: {
            authority_boost: 3,  // 威儀檢定加成 +3
            risk_consequence: 2,  // 冒險選項失敗懲罰翻倍
        },
        prompt: '【鐵律時代】威儀檢定獲得 +3 加成，但冒險選項失敗後果更嚴重'
    },

    dream_plague: {
        id: 'dream_plague',
        name: '夢魘瘟疫',
        icon: '💭',
        desc: '真實與幻夢的界線模糊',
        rarity: 'epic',
        effects: {
            reality_unstable: true,  // NPC 可能突然改變態度
            empathy_see_truth: true,  // 共情可看穿謊言
        },
        prompt: '【夢魘瘟疫】NPC 行為不可預測，但共情檢定可直接看穿謊言和偽裝'
    },

    survival_mode: {
        id: 'survival_mode',
        name: '末日求生',
        icon: '💀',
        desc: '資源極度匱乏，每個決定都關乎生死',
        rarity: 'rare',
        effects: {
            all_difficulty: 1,  // 所有檢定難度 +1
            death_permanent: true,  // NPC 死亡無法復活
            reward_boost: 2,  // 成功獎勵翻倍
        },
        prompt: '【末日求生】所有檢定難度+1，NPC 死亡不可逆，但成功獎勵翻倍'
    },

    golden_age: {
        id: 'golden_age',
        name: '黃金時代',
        icon: '✨',
        desc: '繁榮與和平，但暗流湧動',
        rarity: 'uncommon',
        effects: {
            all_difficulty: -1,  // 所有檢定難度 -1
            hidden_danger: true,  // 看似友善的 NPC 可能隱藏危險
        },
        prompt: '【黃金時代】所有檢定難度-1，但要小心表面友善的 NPC，他們可能藏著秘密'
    },

    chaos_storm: {
        id: 'chaos_storm',
        name: '混沌風暴',
        icon: '🌪️',
        desc: '純粹的隨機性統治世界',
        rarity: 'epic',
        effects: {
            dice_extreme: true,  // 擲骰結果極端化（1-4視為失敗，9-12視為大成功）
            fate_cost_half: true,  // 命運干涉消耗減半
        },
        prompt: '【混沌風暴】擲骰結果極端化（要嘛慘敗要嘛大勝），命運干涉消耗減半'
    },

    ancestral_echo: {
        id: 'ancestral_echo',
        name: '祖靈迴響',
        icon: '👻',
        desc: '死者的記憶影響著生者',
        rarity: 'rare',
        effects: {
            npc_remember: true,  // NPC 可能記得上一局的事
            empathy_see_past: true,  // 共情可看見 NPC 的過去
        },
        prompt: '【祖靈迴響】某些 NPC 會神秘地認識你，共情檢定可揭示 NPC 的前世記憶'
    },

    frozen_heart: {
        id: 'frozen_heart',
        name: '凍結之心',
        icon: '❄️',
        desc: '情感被冰封，唯有理智長存',
        rarity: 'uncommon',
        effects: {
            empathy_disabled: true,  // 共情選項大幅受限
            logic_critical: true,  // 理性檢定可暴擊（12=自動成功）
        },
        prompt: '【凍結之心】共情選項效果大幅降低，但理性檢定擲出12點時自動大成功'
    },

    wild_growth: {
        id: 'wild_growth',
        name: '野性甦醒',
        icon: '🌿',
        desc: '自然力量復興，文明退化',
        rarity: 'uncommon',
        effects: {
            nature_boost: 3,  // 與自然相關的檢定 +3
            authority_difficulty: 1,  // 威儀檢定難度 +1
        },
        prompt: '【野性甦醒】與自然、動物相關的檢定獲得 +3 加成，但威儀檢定難度+1'
    },

    echo_chamber: {
        id: 'echo_chamber',
        name: '迴聲之室',
        icon: '📢',
        desc: '你的每個行動都會被放大傳播',
        rarity: 'rare',
        effects: {
            reputation_amplify: 2,  // 聲望變化翻倍（正負皆是）
            secret_harder: true,  // 更難隱藏秘密
        },
        prompt: '【迴聲之室】所有聲望變化翻倍（無論正負），秘密更容易被揭露'
    },

    puppet_strings: {
        id: 'puppet_strings',
        name: '傀儡之弦',
        icon: '🎭',
        desc: '每個人都在扮演被指定的角色',
        rarity: 'epic',
        effects: {
            npc_archetype: true,  // NPC 行為高度符合其原型
            cunning_see_strings: true,  // 機變可看穿操控
        },
        prompt: '【傀儡之弦】NPC 行為高度可預測（符合其原型），機變檢定可揭示背後的操控者'
    },

    coin_flip: {
        id: 'coin_flip',
        name: '命運硬幣',
        icon: '🪙',
        desc: '一切由五五波決定',
        rarity: 'common',
        effects: {
            dice_simple: true,  // 所有檢定簡化為 50/50（7+成功）
            no_attribute_bonus: true,  // 屬性加成失效
        },
        prompt: '【命運硬幣】所有檢定難度統一為7，屬性加成暫時失效'
    },

    memory_fade: {
        id: 'memory_fade',
        name: '記憶消逝',
        icon: '🌫️',
        desc: 'NPC 會忘記你做過的事',
        rarity: 'uncommon',
        effects: {
            relationship_decay: true,  // 關係會隨時間衰減
            first_impression: true,  // 第一次互動效果加倍
        },
        prompt: '【記憶消逝】NPC 關係會隨時間遺忘，但第一次互動的效果加倍'
    },

    butterfly_effect: {
        id: 'butterfly_effect',
        name: '蝴蝶效應',
        icon: '🦋',
        desc: '微小的選擇導致巨大的後果',
        rarity: 'epic',
        effects: {
            minor_choices_major: true,  // 普通選項可能觸發重大事件
            world_state_volatile: true,  // 世界狀態變化劇烈
        },
        prompt: '【蝴蝶效應】看似無關緊要的選擇可能引發連鎖反應，劇情走向極度不可預測'
    },

    mirror_world: {
        id: 'mirror_world',
        name: '鏡像世界',
        icon: '🪞',
        desc: '善惡對調，一切相反',
        rarity: 'legendary',
        effects: {
            morality_flip: true,  // 善惡陣營互換
            consequence_reverse: true,  // 預期後果可能相反
        },
        prompt: '【鏡像世界】善惡陣營互換，原本應該帶來好結果的選擇可能導致災難'
    }
};

/**
 * 異變稀有度配置
 */
const MUTATOR_RARITY_WEIGHTS = {
    common: 40,    // 40% 機率
    uncommon: 30,  // 30% 機率
    rare: 20,      // 20% 機率
    epic: 8,       // 8% 機率
    legendary: 2   // 2% 機率
};

/**
 * 根據稀有度權重隨機抽取異變
 */
function drawRandomMutators(count = 2) {
    const available = Object.values(WORLD_MUTATORS);
    const drawn = [];

    // 創建權重池
    const weightedPool = [];
    available.forEach(mutator => {
        const weight = MUTATOR_RARITY_WEIGHTS[mutator.rarity] || 10;
        for (let i = 0; i < weight; i++) {
            weightedPool.push(mutator);
        }
    });

    // 抽取 count 個不重複的異變
    const used = new Set();
    while (drawn.length < count && weightedPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        const mutator = weightedPool[randomIndex];

        if (!used.has(mutator.id)) {
            drawn.push(mutator);
            used.add(mutator.id);
        }
    }

    return drawn;
}

/**
 * 應用異變效果到難度計算
 */
function applyMutatorsToDifficulty(baseDifficulty, stat, activeMutators) {
    let modifier = 0;

    activeMutators.forEach(mutator => {
        const effects = mutator.effects;

        // 全局難度修改
        if (effects.all_difficulty) {
            modifier += effects.all_difficulty;
        }

        // 特定屬性難度修改
        if (stat === 'authority' && effects.authority_difficulty) {
            modifier += effects.authority_difficulty;
        }
        if (stat === 'empathy' && effects.empathy_difficulty) {
            modifier += effects.empathy_difficulty;
        }
        if (stat === 'logic' && effects.logic_difficulty) {
            modifier += effects.logic_difficulty;
        }
    });

    return baseDifficulty + modifier;
}

/**
 * 應用異變效果到屬性加成
 */
function applyMutatorsToBonus(baseBonus, stat, activeMutators) {
    let modifier = 0;

    activeMutators.forEach(mutator => {
        const effects = mutator.effects;

        // 特定屬性加成
        if (stat === 'authority' && effects.authority_boost) {
            modifier += effects.authority_boost;
        }
        if (stat === 'empathy' && effects.empathy_boost && typeof effects.empathy_boost === 'number') {
            modifier += effects.empathy_boost;
        }
        if (stat === 'logic' && effects.logic_boost) {
            modifier += effects.logic_boost;
        }

        // 禁用屬性加成
        if (effects.no_attribute_bonus) {
            return 0;
        }
    });

    return baseBonus + modifier;
}

/**
 * 獲取異變的提示文字（用於 AI Prompt）
 */
function getMutatorsPrompt(activeMutators) {
    if (!activeMutators || activeMutators.length === 0) return '';

    const prompts = activeMutators.map(m => m.prompt).join('\n');
    return `\n\n【世界異變規則】：\n${prompts}\n\n請在劇情生成和選項設計時遵守以上異變規則。`;
}

/**
 * 檢查異變是否禁用某類選項
 */
function isMutatorBlocking(optionType, activeMutators) {
    for (const mutator of activeMutators) {
        const effects = mutator.effects;

        if (optionType === 'magic' && effects.magic_disabled) return true;
        if (optionType === 'cunning' && effects.cunning_disabled) return true;
        if (optionType === 'empathy' && effects.empathy_disabled) return true;
    }

    return false;
}
