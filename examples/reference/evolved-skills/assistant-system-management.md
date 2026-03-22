# Skill: Assistant System Management

**Version:** 1.2
**Icon:** shield-1
**Abbr:** Sys Mgmt
**Evolved from:**
- `dual-layer-evolution-architecture.md` (0.85)
- `assistant-quality-system-2026.md` (0.85)
- `todo-management-fast-path-2026.md` (0.90)
**Evolved:** 2026-03-10 night agent (v1.0)
**Use when:** 操作助理系統：收割/archive instinct、演化 skill、夜間 agent 任務資格判斷、Quest Board / Forge 操作、系統健康檢查

## 用途

管理和維護 J-Assistant 自身的系統健康。適用於：
- 設計新的助理子系統
- 確保操作品質
- 管理待辦任務
- 規劃演化策略

---

## 模式 1：雙層自動演化架構

```
Layer 1（每 session）: evaluate-session.js
  observations.jsonl → 信心評估 → instinct/personal/ (conf > 0.7)
                                 ↓
Layer 2（每晚）: heartbeat → night agent
  instincts → 聚合 → evolved/skills/ → eval → improve
```

### 關鍵設計原則
1. **無人工介入**：信心 > 0.7 自動觸發，不需用戶確認
2. **避免重複**：生成前 grep 現有 instinct 內容
3. **持久化追蹤**：JSONL 記錄，jq 原子更新
4. **分層設計**：日常輕量，夜間深度
5. **Silent 操作**：Layer 1 的 instinct 捕捉和 git commit **不在主對話中輸出**，避免干擾用戶工作流

### Instinct 聚合判斷標準（夜間演化）
聚合為 skill 的條件：
- 2+ 個 instinct 有**相似觸發條件**（keyword overlap > 50%）
- 信心分數都 >= 0.75
- 合併後能形成連貫的指引（不只是清單）

**不聚合的情況**：主題雖相關但指引不同（保持獨立 instinct）

---

## 模式 2：品質門禁系統

在重要操作前驗證系統品質，防止積累技術債。

```bash
# /quality-gate [commit|deploy|infra|instinct|all]
```

### 通用檢查清單
| 檢查 | 方法 | 失敗處理 |
|------|------|---------|
| JSON 完整性 | `jq empty data/*.json` | ❌ 阻止 |
| Shell 語法 | `zsh -n scripts/*.sh` | ❌ 阻止 |
| 未提交演化 | `git diff homunculus/` | ⚠️ 提醒 |
| Instinct 格式 | grep confidence、created | ⚠️ 提醒 |

### 操作特定檢查
- **commit**: 確認 staging 不含 credentials
- **infra**: 確認 plist 不在 staging 中
- **instinct**: 確認 confidence 欄位存在且 0-1

### 狀態符號
- ✅ 通過 — 繼續執行
- ⚠️ 警告 — 可選擇繼續
- ❌ 失敗 — 建議停止

---

## 模式 3：系統健康審計

定期或按需掃描系統健康度。

```bash
# /harness-audit [--full|--hooks|--instincts|--skills|--heartbeat]
```

### 審計維度

**Hooks 健康**
- 所有 `.sh` 腳本語法正確（`zsh -n`）
- 必要腳本齊全：session-start/end、evaluate-session、observe、pre-compact、suggest-compact、auto-commit、profile
- `hook-profile-config.json` 格式正確
- Heartbeat 最後執行 < 2h

**Instinct 健康**
- 數量趨勢（是否在增長）
- 超過 90 天未更新的（可能過時）
- 重複主題（名稱相似度）
- 格式完整性（name/trigger/action/confidence/created）

**Skill 健康**
- Eval 覆蓋率（有 eval spec 的比例）
- 最新 pass rate（目標 > 80%）
- 超過 30 天未更新且有失敗 eval

**Heartbeat 健康**
- 最後執行時間
- Log 大小正常
- Checks 全部語法正確
- Todo 積壓情況

### 評分標準
- 🟢 正常：無 ❌，最多 2 個 ⚠️
- 🟡 注意：1+ 個 ⚠️ 但無 ❌
- 🔴 異常：任何 ❌

---

## 模式 4：待辦任務快速管理

**單一資料來源**：`quest-board/data/state.json` 的 `.tasks[]`

### Reminder 分類

| 類型 | 判斷 | 用途 |
|------|------|------|
| Quest | 無 `forge_cost` | 生活任務，賺 XP + Gold |
| Forge | 有 `forge_cost` | 系統任務，花 Gold + 加 Stat |

### 存取方式

| 場景 | 方法 |
|------|------|
| Session 開始自動摘要 | session-start.js 讀 state.json 注入 |
| 快速查詢 | `/todo` slash command |
| 新增 Quest | `/todo add <描述>` |
| 新增 Forge | `/todo forge <描述>` |
| 標記完成 | `/todo done <keyword>` |
| Night Agent 完成 | Forge: `/api/forge/complete`，Quest: `/api/quest/complete` |

### Session Start 注入格式
```
📌 待辦任務（共 N 項，用 /todo 管理）：
  🔴 高優先（N 項）：
    • title — notes（前 60 字元）
  📌 一般（N 項）：title1、title2
```

---

## 模式 5：Night Agent 任務閉環

### 任務資格篩選（P0 必查）

⚠️ **Night Agent 只能完成符合以下條件之一的任務**：
- `priority == "high"` — 用戶標記高優先
- `delegate_to == "night"` — 用戶明確委派夜間執行

**不符合條件的 pending 任務絕對不完成**，即使：
- 任務標題含「研究」或看起來適合夜間執行
- 任務有 `forge_cost`（有沒有 forge_cost 不影響資格）
- 任務是關於系統改進的

```bash
# 查詢符合條件的任務
curl -s http://localhost:3000/api/state | jq '
  .tasks[]
  | select(.status == "pending")
  | select(.priority == "high" or .delegate_to == "night")
  | {id, title, priority, delegate_to, forge_cost}'
```

Night Agent 執行高優先任務後，必須：
1. 透過 server API 完成任務（觸發 forge mechanics）
2. 記錄成果到 night-report.md
3. 新 instinct/skill 自動 git commit

```bash
# 透過 API 完成（確保 forge mechanics 正確執行）
# Forge 任務（有 forge_cost）
curl -s -X POST http://localhost:3000/api/forge/complete \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ID\"}"
# Quest 任務（無 forge_cost）
curl -s -X POST http://localhost:3000/api/quest/complete \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ID\"}"
```

---

## 快速參考

| 操作 | 命令 |
|------|------|
| 品質檢查 | `/quality-gate [類型]` |
| 系統審計 | `/harness-audit [--部分]` |
| 查看待辦 | `/todo` |
| 系統健康 | `/health` |
| 查看 instinct | `/instinct-status` |
