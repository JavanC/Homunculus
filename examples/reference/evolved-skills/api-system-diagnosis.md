# Skill: API System Diagnosis Workflow

**Version:** 1.1
**Evolved from:** 9 instincts (api-endpoint-code-change-verification-cycle, api-filter-mismatch-diagnosis-cycle, api-parameter-ignored-diagnosis-cycle, api-then-user-observation-verification, api-first-ui-bug-diagnosis-workflow, multi-layer-data-diagnosis-workflow, grep-first-cross-layer-api-diagnosis, cross-layer-decision-verification-pattern, cross-system-state-sync-verification-workflow)
**Confidence threshold:** 0.75–0.85
**Created:** 2026-03-19
**Use when:** UI 顯示異常、API 返回非預期值、參數被忽略、Filter 不符、跨層 bug、服務未載入新代碼

## 目的

系統化診斷 API / 後端 / 前端 跨層問題的通用工作流。適用於：UI 顯示異常、API 返回非預期結果、參數被忽略、Filter 不符、服務未載入新代碼等場景。

---

## 核心原則

1. **Grep 優先**：問題在哪層？先搜尋代碼，再實驗。
2. **由內而外**：API 層 → 業務邏輯層 → 前端渲染層，逐層確認。
3. **縮小範圍**：每層用 curl/jq 確認數據後，再進入下一層。
4. **服務重啟後才驗證**：Node.js 修改 server.js 後，舊進程仍在跑，必須重啟。

---

## Phase 1：根因定位（Grep 優先）

### 1a. 定位處理函數

```bash
# 找 API 端點處理器
grep -n "app\.\(get\|post\|put\|delete\).*endpoint" server.js

# 找 filter / selector 邏輯
grep -n "filter\|select\|map\|find" src/component.js

# 追蹤跨文件調用鏈
grep -rn "functionName" .
```

### 1b. 識別問題層

| 症狀 | 懷疑層 | 驗證方式 |
|------|--------|---------|
| UI 顯示異常 | 前端 render | curl API 比對 JSON |
| Filter 結果不符 | Filter 邏輯 | 印出 filter 條件 + raw data |
| 參數未生效 | 後端讀取 | curl 帶 body 測試 |
| 功能在舊進程 | 服務未重啟 | 重啟後 re-test |

---

## Phase 2：層級驗證流程

### 2a. API 層（最先驗證）

```bash
# 驗證數據源是否乾淨
curl -s http://localhost:3000/api/endpoint | jq '{field1, field2, count: (.items | length)}'

# 確認欄位值格式（注意 "done" vs "completed" 這類 typo）
curl -s http://localhost:3000/api/tasks | jq '.[0] | keys'
```

**紅旗**：
- 欄位值格式不符預期（"done" vs "completed"）
- 陣列長度不符
- 歷史污染數據存在（舊 prefix 如 `qrr*`）

### 2b. 業務邏輯層（參數處理）

當 API 參數沒有被正確應用時：

```bash
# 1. 確認前端確實傳了參數
grep -n "fetch\|axios\|curl" src/api-client.js | grep endpoint

# 2. 確認後端讀取了參數
grep -n "body\.\|req\.body\|query\." server.js | grep param_name

# 3. 確認後端寫入了 state
grep -n "state\[.param_name.\]\|\.param_name =" server.js
```

**常見 bug**：
- `body.param` 讀對了，但 `state.param` 沒有寫入
- filter 條件用了硬編碼值（`=== "pending"`），沒有讀 config

### 2c. 前端渲染層（UI 異常）

```bash
# 定位 filter/hide/skip 邏輯
grep -n "filter\|display.*none\|hidden\|skip" static/app.js

# 確認 selector 對應的 class/id
grep -n "querySelector\|getElementById\|\.class" static/app.js
```

**當 API 數據正確但 UI 仍顯示異常**（常見 field name mismatch）：

```bash
# Step 1：確認 API 返回的欄位名稱與值
curl -s http://localhost:3000/api/endpoint | jq '.[0] | {status, type, done}'

# Step 2：grep 前端 filter 比較用的字串，找命名不一致
grep -n '"done"\|"completed"\|"finished"\|===.*status\|\.status' static/app.js

# Step 3：確認 filter 邏輯用的欄位名是否與 API 一致
# 例：API 返回 status: "done"，但前端 filter 判斷 status === "completed" → mismatch
```

**常見 mismatch 類型**：
- 值不一致：API `"done"` vs 前端 filter `"completed"`
- 欄位名不一致：API `forge_cost` vs 前端讀取 `forgeCost`（camelCase 轉換遺漏）
- 型別不一致：API 返回數字 `0` vs 前端比較字串 `"0"`

---

## Phase 3：服務重啟驗證循環（Node.js）

修改 `server.js` 後，舊進程繼續執行舊代碼。

```bash
# 步驟 1：找目標進程
ps aux | grep "node.*server"

# 步驟 2：重啟
kill <PID> && sleep 1 && cd ~/assistant/quest-board && node server.js &

# 步驟 3：健康確認
curl -s http://localhost:3000/health

# 步驟 4：新功能驗證
curl -s -X POST http://localhost:3000/api/new-endpoint \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}' | jq
```

**注意**：
- 用 grep 只殺目標進程（避免殺掉其他 Node）
- `sleep 1` 給進程時間釋放 port
- 先驗證 `/health`，確認服務恢復後再測新端點

### 3b. 服務正常但端點仍 404（路由層診斷）

/health 正常但新端點仍返回 404 時，進程問題已排除，應 grep 確認路由定義：

```bash
# 確認端點路徑（完整路徑 + HTTP method）
grep -n "app\.\(get\|post\|put\|delete\)\s*['\"].*new-endpoint" server.js

# 確認 middleware 順序（靜態 handler 是否在 route 前攔截）
grep -n "app\.use\|express\.static\|router" server.js | head -20

# 確認 body parser 已載入（POST body 讀取需要）
grep -n "express\.json\|bodyParser" server.js
```

常見原因：
- 路徑拼寫錯誤（`/api/test` vs `/api/tests`）
- HTTP method 不符（GET 卻 POST）
- 靜態檔案 handler 攔截了請求
- body parser middleware 未載入（`req.body` 為 undefined）

---

## Phase 4：分層驗證決策

修改涉及多層時，逐層問：「這層真的需要修改嗎？」

```
修改觸發點（API endpoint）
    ↓
  是否影響業務邏輯層？（State update / filter logic）
    ↓
  是否影響前端渲染？（HTML template / JS selector）
    ↓
  是否影響其他系統？（heartbeat / session-start）
```

**不要假設**多層都需要改，逐層 grep 確認後再決定。

---

## Phase 5：跨系統狀態同步驗證

修改待辦/狀態系統後的驗證清單：

```bash
# API 層
curl -s http://localhost:3000/api/state | jq '.tasks[] | select(.id == "TARGET_ID")'

# Session context（session-start 載入）
cat ~/assistant/sessions/*.json | jq '.summary'

# Heartbeat 健康檢查
curl -s http://localhost:3000/api/health | jq

# 相依工具
grep -rn "state\.tasks\|forge_cost" ~/assistant/scripts/
```

---

## Phase 6：分層驗證策略（API → 用戶觀察）

當自動化工具鏈有限制時：

1. **自動化層**（優先）：curl API，驗證 JSON 數據
2. **用戶觀察層**（補充）：在說明中加入「請確認 UI 是否顯示 X」

```bash
# 自動化驗證
curl -s http://localhost:3000/api/forge | jq '{count: (.tasks | length), suggested: [.tasks[] | select(.status=="suggested")] | length}'

# 用戶確認點（當 curl 無法覆蓋 UI 渲染時）
echo "⚠️ 請在瀏覽器確認：ticket Y 應該不顯示在列表中"
```

---

## 常見 Anti-Patterns

- ❌ 直接看前端代碼猜問題，不先 curl API 驗證數據
- ❌ 修改 server.js 後，不重啟直接測試（看到舊行為誤以為 bug 未修）
- ❌ 假設多層都需要修改（逐層驗證才能確定）
- ❌ Filter 結果不符時只看 UI，不比對 API raw data

---

## 觸發場景

- UI 顯示異常：某元素應隱藏但仍出現、計數不符、區塊消失
- API 返回非預期：欄位值錯誤、陣列長度錯、歷史污染
- 功能修改無效：修改了代碼但行為未改變（服務重啟問題）
- 跨層 bug：前端正確但 API 出問題，或反之
- 多系統修改：API + heartbeat + session 同時涉及
