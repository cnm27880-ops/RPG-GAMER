# RPG Roguelike 升級 - 整合指南

## 📋 概述

本次升級將 RPG 引擎升級為具有 **Roguelike 元素、動態劇情推進、且 UI 極度流暢** 的 Web 遊戲。

版本：**2.1**
更新日期：2026-01-20

---

## ✅ 已完成的核心功能

### 1. 末日鐘系統（Doom Clock）

#### 功能說明
- **動態末日值**：從 0% 到 100%，隨著遊戲進行逐漸上升
- **5 個危機等級**：寧靜（0-24%）、不安（25-49%）、危機（50-74%）、崩潰邊緣（75-99%）、末日降臨（100%）
- **大事件觸發**：跨過 25%、50%、75%、100% 閾值時，強制觸發重大劇情事件

#### 技術實現
- 位置：`js/game-state.js`
- 核心方法：
  - `advanceDoomClock(amount)` - 增加末日值
  - `getDoomLevel()` - 取得當前危機等級
  - `shouldTriggerDoomEvent()` - 檢查是否需要觸發大事件
  - `getDoomColor()` - 取得對應顏色（用於 UI）

#### 遊戲設計邏輯
- 每次推進時間，末日值增加 0.5-1.0
- 玩家的每個行動都會消耗時間，進而增加末日值
- 末日值越高，AI 生成的劇情越絕望、混亂

---

### 2. 優化開場流程（三步驟引導）

#### 舊流程
生成世界 → 直接丟出 NPC 對話

#### 新流程
1. **旁白介紹 (Prologue)**：用第二人稱描述世界危機與氛圍
2. **大方向選擇**：給予 3 個截然不同的方向（調查謠言、尋找庇護所、前往黑市等）
3. **遭遇 NPC**：根據玩家選擇的方向，生成對應的首個 NPC

#### 技術實現
- 位置：`js/prompts.js`
- 新增提示詞模板：
  - `prologueNarration` - 開場旁白
  - `initialDirections` - 大方向選擇
  - `openingScene` - 開場場景（更新版，接受 direction 參數）

#### 對應 PromptBuilder 方法
```javascript
buildPrologueNarration(world, playerCharacter)
buildInitialDirections(world, playerCharacter)
buildOpeningScene(world, playerCharacter, direction)
```

---

### 3. 提示詞工程升級

#### 新增注入內容
1. **末日值與描述**：`doomLevel`, `doomDescription`, `doomHint`
2. **異變規則**：`mutatorsPrompt`（已存在，確保正確注入）

#### 末日提示範例
```
【末日值】：75%（崩潰邊緣）
世界瀕臨崩潰，描述時強調混亂、恐懼、資源匱乏。NPC 行為極端化。

【重要】玩家的行動觸發了末日閾值！請在這個場景中安排一個「大事件」
（如：城鎮淪陷、重要 NPC 死亡、陣營覆滅、世界異變加劇等）。
```

#### 技術實現
- 位置：`js/prompts.js`
- 修改方法：
  - `buildNextScene()` - 新增 `gameState` 參數
  - `buildDiceScene()` - 新增 `gameState` 參數
  - `_getDoomHint()` - 新增私有方法，生成末日提示

---

### 4. UI/UX 極致優化

#### 修復手機版重疊問題
- **移除**：浮動的 `.mutators-display`（會擋住手機版文字）
- **新增**：🌍 世界詳情按鈕（在工具列）
- **新增**：世界詳情 Modal（`#world-info-modal`）
  - 世界設定
  - 世界異變列表（卡牌式呈現）
  - 陣營狀況

#### 新增末日鐘視覺反饋
- **HUD 進度條**：`#doom-display`
  - 顯示末日值百分比
  - 進度條顏色根據危機等級變化（綠→黃→橙→紅→紫）
  - 顯示當前危機等級文字

- **Canvas 粒子效果**（可選）
  - 根據末日等級調整粒子顏色和速度
  - 越危險越混亂（速度加快、顏色變紅）

#### 技術實現
- HTML：`index.html`
  - 新增 `#doom-display`
  - 新增 `#world-info-modal`
  - 新增 `#btn-world-info` 按鈕
- CSS：`style.css`
  - `.doom-clock` - 末日鐘樣式
  - `.doom-bar` - 進度條樣式
  - `.mutator-card` - 異變卡牌樣式（優化）
- JavaScript：`js/ui-helpers.js`
  - `updateDoomClockUI(gameState)` - 更新末日鐘 UI
  - `toggleWorldInfoModal(show)` - 切換世界詳情 Modal
  - `updateWorldInfoContent()` - 更新 Modal 內容
  - `updateParticlesByDoomLevel(particles, doomLevel)` - 更新粒子效果

---

## 🔧 如何整合到現有代碼

### 步驟 1：更新 GameManager 調用

在 `js/main.js` 或使用場景生成的地方，傳遞 `gameState` 到 `promptBuilder`：

```javascript
// 舊版本
const { system, user } = promptBuilder.buildNextScene(
    world, storyContext, action, factions, npcs, calendar, playerCharacter
);

// 新版本 - 傳遞 gameState
const { system, user } = promptBuilder.buildNextScene(
    world, storyContext, action, factions, npcs, calendar, playerCharacter,
    gameManager.state  // 新增參數
);
```

同樣的修改也適用於 `buildDiceScene()`。

### 步驟 2：在遊戲循環中更新 UI

在每次場景更新後，調用 UI 更新函數：

```javascript
// 更新末日鐘 UI
if (typeof updateDoomClockUI === 'function') {
    updateDoomClockUI(gameManager.state);
}

// 更新工具列按鈕顯示狀態
if (typeof updateToolbarButtonVisibility === 'function') {
    updateToolbarButtonVisibility();
}
```

### 步驟 3：檢查並觸發末日事件

在每次玩家行動後，檢查是否跨過閾值：

```javascript
if (gameManager.state.shouldTriggerDoomEvent()) {
    // AI 會在下一次場景生成時自動插入大事件
    // 無需額外處理，提示詞已包含指示
    gameManager.state.resetDoomEventFlag();
}
```

### 步驟 4：新增開場流程（可選）

如果要使用新的三步驟開場流程：

```javascript
// 1. 生成旁白
const prologuePrompt = promptBuilder.buildPrologueNarration(world, playerCharacter);
const prologueResult = await llm.generate(prologuePrompt.user, prologuePrompt.system);
// 顯示旁白...

// 2. 生成大方向選擇
const directionsPrompt = promptBuilder.buildInitialDirections(world, playerCharacter);
const directionsResult = await llm.generate(directionsPrompt.user, directionsPrompt.system);
// 顯示選項，等待玩家選擇...

// 3. 根據選擇的方向生成開場場景
const selectedDirection = directionsResult.directions[playerChoice].text;
const openingPrompt = promptBuilder.buildOpeningScene(world, playerCharacter, selectedDirection);
const openingResult = await llm.generate(openingPrompt.user, openingPrompt.system);
```

---

## 📊 遊戲設計建議

### 末日值增長曲線
- **快速模式**（1-2小時遊戲）：每個行動增加 2-3%
- **標準模式**（3-4小時遊戲）：每個行動增加 0.5-1%
- **長線模式**（6-8小時遊戲）：每個行動增加 0.2-0.5%

可在 `game-state.js` 的 `advanceTime()` 方法中調整：

```javascript
// 調整這個數值來控制末日增長速度
this.advanceDoomClock(0.5 + Math.random() * 0.5);
```

### 大事件設計原則
當末日值跨過閾值時，AI 會被指示創造大事件。建議的事件類型：

- **25% 閾值**：傳聞成真（謠言中的威脅首次顯現）
- **50% 閾值**：盟友背叛 / 關鍵 NPC 死亡
- **75% 閾值**：城鎮淪陷 / 陣營崩潰
- **100% 閾值**：終局選擇（拯救 or 毀滅）

---

## 🎨 UI 顏色對照表

| 末日等級 | 百分比 | 描述 | 進度條顏色 |
|---------|-------|------|-----------|
| 0 | 0-24% | 寧靜 | #80c090（綠色）|
| 1 | 25-49% | 不安 | #c0a060（黃色）|
| 2 | 50-74% | 危機 | #c09060（橙色）|
| 3 | 75-99% | 崩潰邊緣 | #c07070（紅色）|
| 4 | 100% | 末日降臨 | #a040a0（紫色）|

---

## 🐛 已知問題與待辦事項

### 已修復
- ✅ 手機版異變列表重疊問題
- ✅ 末日值未保存到存檔點
- ✅ 提示詞未注入末日資訊

### 待優化（可選）
- ⚠️ Canvas 粒子效果需要在 `main.js` 中手動調用 `updateParticlesByDoomLevel()`
- ⚠️ 新開場流程需要在主程式中手動整合
- ⚠️ 按鈕點擊反應優化需要在事件處理器中調用 `optimizeButtonClick()`

---

## 📖 範例：完整的場景生成流程

```javascript
async function generateNextSceneWithDoom(action) {
    // 1. 推進時間（自動增加末日值）
    gameManager.state.advanceTime(action.timeAdvance || 1);

    // 2. 檢查是否需要觸發大事件
    const shouldTriggerEvent = gameManager.state.shouldTriggerDoomEvent();
    if (shouldTriggerEvent) {
        console.log('⚠️ 末日閾值已觸發，AI 將生成大事件！');
        gameManager.state.resetDoomEventFlag();
    }

    // 3. 生成場景（傳遞 gameState）
    const { system, user } = promptBuilder.buildNextScene(
        gameManager.state.currentWorld,
        gameManager.state.storyContext,
        action.text,
        gameManager.state.factionData,
        gameManager.state.npcs,
        {
            getString: () => gameManager.state.getCalendarString(),
            getTimeString: () => gameManager.state.getTimeString()
        },
        gameManager.state.playerCharacter,
        gameManager.state  // 關鍵：傳遞 gameState
    );

    const result = await llm.generate(user, system);

    // 4. 更新 UI
    updateDoomClockUI(gameManager.state);

    return result;
}
```

---

## 🎮 測試檢查清單

- [ ] 末日值是否正確顯示在 HUD 上
- [ ] 進度條顏色是否隨危機等級變化
- [ ] 跨過閾值時，AI 是否生成大事件
- [ ] 手機版是否能正常打開世界詳情 Modal
- [ ] 異變列表是否正確顯示在 Modal 中
- [ ] 時光倒流後，末日值是否正確回溯
- [ ] 存檔/讀檔後，末日值是否保留

---

## 📞 聯絡與支援

如有任何問題或建議，請提交 Issue 到 GitHub 倉庫。

祝你的 Roguelike RPG 開發順利！🎲✨
