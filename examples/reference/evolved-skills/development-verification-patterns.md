# Skill: development-verification-patterns
**Version:** 1.1
**Icon:** cross
**Abbr:** Dev Check
**Evolved from:** cross-file-feature-removal-workflow, isolated-dependency-removal-verification, multi-file-syntax-prevalidation-loop, local-dev-cycle-restart-verify, api-endpoint-code-change-verification-cycle, cross-system-state-sync-verification-workflow
**Created:** 2026-03-14
**Use when:** 提交前驗證、多檔語法預檢、prod/test 依賴區分、服務啟動失敗診斷、重構安全性確認

## 概述

開發過程中三類驗證模式：
1. **語法預檢**：改完先驗語法，再做後續步驟
2. **功能移除清理**：跨檔案移除 + 孤立依賴檢查
3. **服務重啟驗證**：Node/shell 服務修改後的重啟 + 端點確認

---

## Pattern 1：多檔案語法預檢迴圈

**觸發**：修改 2+ 個相關檔案後，即將部署或重啟服務前。

```bash
# Node.js
node -c <file>.js

# Bash/Zsh
zsh -n <file>.sh

# JSON
jq empty <file>.json

# 批次預檢（改完立即跑）
node -c server.js && node -c web/app.js && zsh -n heartbeat.sh && echo "✅ All OK"
```

**原則**：
- 語法檢查只驗語法，不驗邏輯
- 全部通過後才重啟或部署
- 有錯立即修正 → 重新檢查，不跳過

---

## Pattern 2：跨檔案功能移除 + 孤立依賴清理

**觸發**：需要完整移除跨多檔案的功能（endpoint + UI + 業務邏輯 + 依賴）。

### 步驟
1. **識別範圍**
   ```bash
   grep -r "feature-name" .
   ```
2. **分層移除**（按依賴順序）
   - UI/表現層（HTML、CSS、前端事件）
   - 業務邏輯層（app 程式碼）
   - API 層（後端 endpoint）
   - 設定層（shell script）
3. **孤立依賴檢查**：每個被移除功能的 import/require，grep 確認是否還有其他使用者
   ```bash
   grep -r "module-name" . --include="*.js"   # 排除 node_modules
   ```
   - 只在 **production 代碼**中無引用 → 移除 production import（**test 檔不算**）
   - Test 檔中仍有引用 → 移除 production import，並同步更新/刪除該測試
   - Production + test 以外的代碼也有引用 → 保留 import
   - **Production vs Test 判斷**：`src/`、`*.js`（非 `*.test.js`）= production；`tests/`、`*.test.js`、`*.spec.js` = test
4. **語法驗證**（Pattern 1）
5. **成果審核**
   ```bash
   git diff   # 確認無孤立程式碼殘留
   ```

**典型範例**（移除 weather 功能）：
```
Grep "weather" → 找到 index.html/app.js/server.js/refresh.sh
移除順序：HTML chip → app.js 事件 → server.js endpoint → refresh.sh 邏輯
Grep "https" → 確認只有 weather 用 → 移除 require('https')
node -c server.js && zsh -n refresh.sh ✅
git diff 確認
```

---

## Pattern 3：服務重啟 + 端點驗證迴圈

**觸發**：修改 Node.js/Express server.js 後（新增端點、修改邏輯），需要載入新代碼。

### 步驟
```bash
# 1. 找現有進程
ps aux | grep "node.*server.js" | grep -v grep

# 2. 重啟（只殺目標，避免誤殺）
kill <PID> && sleep 1 && cd ~/assistant/quest-board && node server.js &

# 3. 驗證服務回復
curl -s http://localhost:3000/status   # 或 /health

# 4. 測試新端點
curl -s -X POST http://localhost:3000/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}' | jq
```

**注意**：
- 使用 `grep -v grep` 避免 grep 自己出現在結果中
- `sleep 1` 確保進程完全關閉後再啟動
- 先測健康端點，再測新功能端點
- 後台啟動用 `&`，若有 launchctl 管理則改用 launchctl

### 3b. 服務啟動失敗診斷（node -c 通過但 /health 返回 Connection refused）

`node -c` 只驗語法，不驗 runtime。啟動後若 `/health` 失敗：

```bash
# 步驟 1：等幾秒再重試（race condition）
sleep 2 && curl -s http://localhost:3000/health

# 步驟 2：確認進程是否存在
ps aux | grep "node.*server.js" | grep -v grep
# → 進程存在但無回應：port 衝突、未完全啟動，再等
# → 進程不存在：啟動時 crash 了

# 步驟 3：前景執行看 stderr（進程不存在時）
cd ~/assistant/quest-board && node server.js
# 看完整錯誤訊息（不加 & 讓 stderr 顯示在 terminal）
```

**常見 runtime 失敗原因**：
- 缺少環境變數（`process.env.X` is undefined，配合 `|| throw` 立即崩潰）
- port 已被佔用（`EADDRINUSE :3000`）
- `require()` 路徑錯誤（找不到模組）
- JSON.parse 失敗（state.json 損毀）

---

## Pattern 4：Quest Board 系統整合驗證

**觸發**：修改 server.js API、session-start.js 或 state.json 相關邏輯後。

### 端對端驗證清單
```bash
# --- Habit API（每日習慣，ephemeral in today.habits）---
# 完成習慣
curl -s -X POST http://localhost:3000/api/habit/complete \
  -H "Content-Type: application/json" \
  -d '{"questId":"q1"}' | jq

# 復原習慣
curl -s -X POST http://localhost:3000/api/habit/undo \
  -H "Content-Type: application/json" \
  -d '{"questId":"q1"}' | jq

# --- Quest API（持久任務，無 forge_cost）---
# 新增任務
curl -s -X POST http://localhost:3000/api/quest/add \
  -H "Content-Type: application/json" \
  -d '{"title":"test-quest"}' | jq

# 完成任務
curl -s -X POST http://localhost:3000/api/quest/complete \
  -H "Content-Type: application/json" \
  -d '{"id":"rN"}' | jq

# 復原任務
curl -s -X POST http://localhost:3000/api/quest/undo \
  -H "Content-Type: application/json" \
  -d '{"id":"rN"}' | jq

# 刪除任務
curl -s -X POST http://localhost:3000/api/quest/delete \
  -H "Content-Type: application/json" \
  -d '{"id":"rN"}' | jq

# --- Forge API（系統升級任務，有 forge_cost）---
# 新增 Forge
curl -s -X POST http://localhost:3000/api/forge/add \
  -H "Content-Type: application/json" \
  -d '{"title":"test-forge","forge_cost":3,"stat":"int"}' | jq

# 完成 Forge
curl -s -X POST http://localhost:3000/api/forge/complete \
  -H "Content-Type: application/json" \
  -d '{"id":"rN"}' | jq

# 驗證 state 更新
jq '.player | {gold, xp, level, stats}' ~/assistant/quest-board/data/state.json
```

**驗證點**：
- Habit 完成：+XP、+gold、skill XP；全完成 bonus +agi
- Quest 完成：+XP、+gold
- Forge 完成：-gold（forge_cost）、+stat
- Undo：扣回 XP/gold，狀態回 pending
- Server 重啟後 state 保持不變（持久化確認）

---

---

## Pattern 5：AC-to-Test 自動驗證迴圈

**觸發**：Forge 任務有 `[testable]` AC，需要自動化驗證。

### 流程

1. `/forge-dev define-ac` 時標記 `[testable]` / `[manual]`
2. `/forge-dev gen-tests` spawn `tdd-runner` subagent：
   - 讀 `[testable]` AC → 生成 `quest-board/tests/<id>.test.js`
   - 跑一次確認 **RED**（全失敗）
3. `/forge-dev start` 進入紅綠迴圈：
   - 實作 → `node --test tests/<id>.test.js` → 修到全綠
4. `/forge-dev review` 自動跑測試 + 手動驗證 `[manual]` AC

### 與其他 Pattern 搭配

```
gen-tests（RED）→ 實作（GREEN）→ Pattern 1（語法預檢）→ Pattern 3（服務重啟）→ review
```

### 測試執行

```bash
# 單一任務測試
node --test quest-board/tests/<id>.test.js

# 所有測試（序列執行，避免 state 衝突）
node --test --concurrency=1 quest-board/tests/*.test.js
```

**詳細 pattern 和 anti-pattern 見 `tdd-workflow` skill。**

---

## 選擇指引

| 情境 | 使用 Pattern |
|------|-------------|
| 改了幾個檔案，即將重啟服務 | Pattern 1（語法預檢）|
| 移除某個功能 | Pattern 2（跨檔案移除）|
| 改了 server.js 想測新 endpoint | Pattern 3（服務重啟驗證）|
| 改了 Quest Board 邏輯 | Pattern 4（整合驗證）|
| Forge 任務有 testable AC | Pattern 5（AC-to-Test 迴圈）|
| 移除功能後涉及服務重啟 | Pattern 2 → Pattern 1 → Pattern 3 |
| 新功能完整流程 | Pattern 5 → Pattern 1 → Pattern 3 → Pattern 4 |
