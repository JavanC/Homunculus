# Skill: Resilience & State Patterns

**Version:** 1.0
**Icon:** shield-2
**Abbr:** Resilience
**Evolved from:**
- `cache-fallback-consistency-pattern.md` (0.85)
- `defensive-api-fallback-rendering.md` (0.85)
- `multi-source-fallback-api-resilience.md` (0.85)
- `heartbeat-concurrent-instance-prevention-via-flock.md` (0.85)
- `filter-persistence-via-metadata-pattern.md` (0.77)
- `background-session-output-validation-with-text-fallback-2026.md` (0.78)
- `tiered-budget-management-by-criticality.md` (0.83)

**Use when:** 寫防禦性程式碼、處理 API fallback、管理狀態檔案一致性、防止競態條件、設計容錯機制

---

## 模式 1：多源 Fallback 降級

```javascript
// 主源 → 備源 → 預設值，層層降級
function getData() {
  // 嘗試主源（結構化 JSON）
  try {
    const data = JSON.parse(fs.readFileSync(PRIMARY_FILE, 'utf8'));
    if (data && Object.keys(data).length > 0) return data;
  } catch {}

  // 備源（從其他檔案解析）
  try {
    const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
    return parseFromRaw(raw);
  } catch {}

  // 最終 fallback：安全預設值
  return DEFAULT_DATA;
}
```

**規則：**
- 永遠有最終 fallback（不讓函數拋錯到呼叫端）
- 備源解析邏輯要獨立測試（主源壞掉時才用，平常不觸發 = 容易有 bug）
- Log 降級事件（`log("WARN: primary source failed, using backup")`）
- **Response 層面標記**：降級時在回傳中標記 `source: "fallback"` 或加 warning 欄位，不只 log
- 空檔案 ≠ 不存在：`JSON.parse("")` 會拋錯，需額外處理
- **何時不需要多層 fallback**：內部狀態檔（如 server 自己管的 state.json）不存在 = 初始化問題，一層 try/catch + 明確錯誤訊息就夠。多層 fallback 用在外部 API 或跨 process 資料源

---

## 模式 2：背景 Session 輸出驗證

```bash
# 背景 session 產出 JSON → 主流程消費
OUTPUT=$(claude --print ... --output-format json)

# 驗證結構化輸出
if echo "$OUTPUT" | jq -e '.result' > /dev/null 2>&1; then
  # 結構化輸出有效
  RESULT=$(echo "$OUTPUT" | jq -r '.result')
else
  # Fallback：當純文字處理
  RESULT="$OUTPUT"
  log "WARN: structured output failed, using text fallback"
fi
```

**規則：**
- 背景 session 的 JSON 輸出不保證有效（可能被截斷、timeout、格式錯誤）
- 用 `jq -e` 驗證後再取值，失敗時有 text fallback
- 不要 `set -e` 然後 pipe jq（jq 失敗 = script 中斷）

---

## 模式 3：Flock 防重入

```bash
LOCK_FILE="/tmp/my-job.lock"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another instance running, skipping"
  exit 0
fi
# Lock acquired — do work
# Lock auto-released on process exit (fd 9 closes)
```

**規則：**
- 用 `flock -n`（non-blocking）而非 `flock`（blocking 會排隊等待）
- Lock file 放 `/tmp/`（重啟後自動清除，不會留殘）
- 不需要手動 unlock — fd close 時自動釋放
- 適用場景：launchd job、heartbeat tick、任何**寫入共享狀態**且可能被多觸發源同時啟動的任務
- **不需要 flock 的情況**：純讀取操作（多個讀取者同時執行是安全的）、一次性 script（不會被重複觸發）

---

## 模式 4：Filter 持久化（前端狀態消失問題）

```javascript
// ❌ 問題：過濾條件基於 mutable 欄位
tasks.filter(t => t.status === 'suggested')
// → 狀態改變後項目從列表消失

// ✅ 解法：加 metadata 欄位追蹤歷史狀態
tasks.filter(t => t.was_suggested === true)
// → 即使 status 變了，metadata 保留原始分類
```

**規則：**
- 過濾條件不應基於會被業務邏輯修改的欄位
- 加 immutable metadata 欄位（`created_by`、`was_suggested`、`origin`）
- 或用 event log（JSONL）追蹤狀態變遷，從 log 重建而非從當前狀態推斷

---

## 模式 5：原子狀態更新

```bash
# ✅ tmpfile + mv（原子）
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT
jq '.key = "value"' "$STATE" > "$TMPFILE" && mv "$TMPFILE" "$STATE"

# ❌ 直接寫回（非原子，crash = 資料損壞）
jq '.key = "value"' "$STATE" > "$STATE"  # 先清空再寫 = 中斷時空檔案
```

**規則：**
- 所有狀態檔案更新走 tmpfile + mv
- `trap "rm -f $TMPFILE" EXIT` 在 mktemp 後立即加
- 讀取時加 `// empty` 或 `// {}` 處理空值
- 高頻寫入（如每 tick）考慮用 flock 防競態

---

## 模式 6：分層預算管理

```
關鍵路徑（必須完成）：
  → 不設硬限制，完成為止
  → 例：P0 指定任務、P1 系統整合

可選路徑（有預算就做）：
  → 根據剩餘預算決定深度
  → 例：P2 研究、Bonus loop

背景任務（定期執行）：
  → 固定上限，超過就跳過
  → 例：heartbeat check modules
```

**規則：**
- 不同工作類型用不同預算策略（不是統一限制）
- 關鍵路徑不設 `--max-budget-usd`（會卡住重要工作）
- 可選路徑用 budget level 控制（full / reduced / minimal）
- 背景任務用 timeout 而非 budget（時間可預測，成本不可預測）

---

## 決策樹：容錯設計

```
資料來源可能失敗？
├── 是 → 多源 fallback（模式 1）
│   └── 有備源？→ 主→備→預設
│   └── 無備源？→ 主→預設值 + log
└── 否 → 直接讀取

背景 process 產出結構化資料？
├── 是 → 驗證後消費（模式 2）
└── 否 → 直接用

可能被同時多次觸發？
├── 是 → flock 防重入（模式 3）
└── 否 → 不需要

狀態欄位會被業務邏輯改變？
├── 是 → 加 immutable metadata（模式 4）
└── 否 → 直接用 status 過濾

寫入狀態檔案？
├── 是 → tmpfile + mv + trap（模式 5）
└── 否 → 不需要
```
