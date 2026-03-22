# Skill: tdd-workflow
**Version:** 1.2
**Icon:** poison
**Abbr:** TDD
**Evolved from:** (manual — 參考 Affaan/everything-claude-code TDD Guide + aihero.dev TDD Skill，適配小J環境)
**Created:** 2026-03-16
**Use when:** Forge 任務寫測試、AC 對應 test case、紅綠迴圈執行、quest-board endpoint 測試、habit/forge API discriminator

## 概述

AC-driven 開發中的自動化測試層。AC 定義「什麼算完成」，TDD 提供「自動驗證做對了沒」的紅綠迴圈。

**核心立場**：AC 是主人，測試是僕人。不是所有 AC 都能自動測試。

---

## 適用場景

- 新增 API endpoint
- 修 bug（先寫重現測試，再修）
- 重構（先確保測試綠，改完仍綠）
- 任何 Forge 任務中標記為 `[testable]` 的 AC

**不適用**：UI 外觀、UX 體驗、文件撰寫 — 這些用 `[manual]` AC。

---

## 紅綠重構迴圈

### Step 1: RED — 寫失敗的測試

從 `[testable]` AC 出發，為每條寫一個測試：

```javascript
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { request, backupState, restoreState } = require('./helpers');

describe('POST /api/forge/review', () => {
  before(() => backupState());
  after(() => restoreState());

  it('returns verdict field in response', async () => {
    const { status, data } = await request('POST', '/api/forge/review', {
      id: 'r17',
      ac_results: [{ criterion: 'test', passed: true }],
    });
    assert.strictEqual(status, 200);
    assert.ok(data.verdict, 'response should contain verdict');
  });

  it('returns 400 when id is missing', async () => {
    const { status } = await request('POST', '/api/forge/review', {
      ac_results: [],
    });
    assert.strictEqual(status, 400);
  });
});
```

### Step 2: 確認 RED

```bash
node --test tests/<task-id>.test.js
# 預期：全部失敗（因為功能還沒實作）
```

如果測試意外通過 → 測試寫錯了（太寬鬆），或功能已存在。

### Step 3: GREEN — 最少 code 讓測試過

只寫剛好能通過測試的 code。不多做。

### Step 4: 確認 GREEN

```bash
node --test tests/<task-id>.test.js
# 預期：全部通過
```

### Step 5: REFACTOR — 保持綠燈

重構 code，每改一步就跑測試。測試變紅 = 改壞了，回退。

---

## 測試 Pattern

### Pattern A：API Endpoint 測試

最常用。HTTP request → assert response status + body。

```javascript
it('POST /api/quest/add creates a task', async () => {
  const { status, data } = await request('POST', '/api/quest/add', {
    title: 'test-quest',
  });
  assert.strictEqual(status, 200);
  assert.ok(data.task, 'should return created task');
  assert.strictEqual(data.task.title, 'test-quest');
});
```

### Pattern B：State 持久化測試

操作後直接讀 state.json 驗資料一致性。

```javascript
it('completing quest adds XP to player', async () => {
  const before = readState();
  await request('POST', '/api/quest/complete', { id: 'r1' });
  const after = readState();
  assert.ok(after.player.xp > before.player.xp, 'XP should increase');
});
```

### Pattern C：Shell Script 測試

驗 exit code + stdout，不驗內部實作。

```javascript
const { execSync } = require('child_process');

it('heartbeat.sh exits 0 on success', () => {
  const result = execSync('zsh ~/assistant/heartbeat/heartbeat.sh 2>&1', {
    timeout: 30000,
    encoding: 'utf8',
  });
  // 驗 output 格式，不驗具體內容
  assert.ok(result.includes('[') || result.length > 0);
});
```

### Pattern D：JSON Schema 驗證

確認 state.json 必要欄位存在。

```javascript
it('state.json has required structure', () => {
  const state = readState();
  assert.ok(state.player, 'missing player');
  assert.ok(Array.isArray(state.tasks), 'tasks should be array');
  assert.ok(typeof state.player.xp === 'number', 'xp should be number');
  assert.ok(typeof state.player.gold === 'number', 'gold should be number');
});
```

---

## State 隔離

**每個 test suite 必須隔離 state**，避免互相污染：

```javascript
before(() => backupState());   // 備份
after(() => restoreState());   // 還原
```

`helpers.js` 的 `backupState()`/`restoreState()` 用 file copy 實作，簡單可靠。

**注意**：`helpers.js` 使用 pid-unique backup（`state.test-backup-<pid>.json`），多數測試可並發跑。
但若測試需要直接寫 state.json（如 habit 測試，無對應 API），必須用 `--test-concurrency=1`：

```bash
# 一般情況（大多數 API 測試，pid-unique backup 已解決 race）：
node --test tests/*.test.js

# 含直接寫 state.json 的測試時：
node --test --test-concurrency=1 tests/*.test.js
```

⚠️ `--concurrency=1` 不是有效的 node:test flag，正確是 `--test-concurrency=1`（Node.js v22+）。

---

## Session Start Pattern（既有專案）

**觸發**：接手或繼續有測試基礎的既有專案（非全新 Forge 任務）。

先跑現有測試，再開始任何改動：
```bash
node --test quest-board/tests/*.test.js  # 或對應的測試命令
```

**三個目的（Simon Willison, 2026-03）**：
1. 確認 agent 知道如何跑測試（為後續改動建立習慣）
2. 提供專案脈絡（測試本身就是功能規格）
3. 建立基線 — 知道改動前幾個測試通過，才能確認改動後不退步

---

## Anti-Patterns

### ❌ 不 mock server
quest-board 是我們自己的服務，直接測真實 server。Mock 會隱藏真實問題。

### ❌ 不測 UI render
沒有前端框架，UI 驗證用 `[manual]` AC + Playwright 截圖。

### ❌ 不追求 100% 覆蓋
單人系統，核心 API 80% 覆蓋即可。邊界情況按風險決定。

### ❌ 不改測試來通過
RED 階段寫完的測試就是規格。如果測試過不了，改 code 不改 test。除非 AC 本身定義有誤。

### ❌ 不在測試中驗內部狀態
```javascript
// ❌ 測內部實作
assert.strictEqual(server._handlers.length, 5);

// ✅ 測可觀察行為
const { status } = await request('GET', '/api/health');
assert.strictEqual(status, 200);
```

---

## 測試品質標準

1. **測行為不測實作** — assert response / output，不 assert internal state
2. **每個測試獨立** — backup/restore 隔離，不依賴執行順序
3. **測試名 = 規格** — `it('returns 400 when id is missing')` 讀起來就是需求
4. **邊界案例** — null / empty string / invalid type / 不存在的 id
5. **錯誤路徑** — 測 4xx 回應，不只測 happy path

---

## 與 forge-dev 整合

```
/forge-dev define-ac <id>
  → AC 標記 [testable] / [manual]

/forge-dev gen-tests <id>
  → 讀 [testable] AC → 生成 tests/<id>.test.js → 跑一次確認 RED

/forge-dev start <id>
  → 紅綠迴圈：實作 → node --test → 修到全綠

/forge-dev review <id>
  → 自動跑 node --test → ac_results 自動生成
  → [manual] AC 仍用手動驗證（Read/curl/Glob）
  → 混合結果合併計算 pass_rate
```

---

## 夜間 Backfill

夜間 agent 為既有 API 補測試：

1. 掃描 server.js 的 endpoint → 比對 tests/ 已有覆蓋 → 產出缺口清單
2. 每晚補 1-2 個 endpoint，優先：forge > quest > habit > state
3. 新測試必須全綠且不破壞舊測試
4. Night report 追蹤：「測試覆蓋：X/Y endpoints（Z%）」

**Habit 測試特殊注意**：habit API 使用 `questId`（非 `id`），且 habits 在 `state.today.habits`。
由於沒有 add-habit API，測試 setup 需直接注入 state.json → 須搭配 `--test-concurrency=1`。

---

## 選擇指引

| 情境 | 做法 |
|------|------|
| 新 API endpoint | Pattern A（endpoint 測試）+ Pattern B（state 持久化） |
| 修改既有 endpoint 格式 | 在**同一個 module 測試檔**（如 quest-api.test.js）中新增 assert，不建新檔 |
| 修 API bug | 先寫重現 bug 的測試（RED）→ 修復 → GREEN |
| 重構 server.js | 先確保所有現有測試 GREEN → 重構 → 仍 GREEN |
| Shell script 修改 | Pattern C（exit code + stdout） |
| state.json 結構變更 | Pattern D（schema 驗證） |
| UI 相關變更 | 不寫測試，用 `[manual]` AC |
