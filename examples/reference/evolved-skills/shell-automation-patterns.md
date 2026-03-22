# Skill: Shell Automation Patterns

**Version:** 1.6
**Icon:** lightning
**Abbr:** Shell
**Evolved from:**
- `discord-as-primary-output.md` (0.95)
- `claude-print-in-shell-scripts.md` (0.85)
- `jq-state-management.md` (0.85)
- `gog-for-google-workspace.md` (0.90)
- `playwright-usage-check.md` (0.88)
- `modular-autodiscovery-pattern.md` (0.80)
- `jq-jsonl-stream-parsing.md` (0.90)
- `jq-null-safety-diagnostic-cycle.md` (0.85)
- `jq-reduce-scope-trap.md` (0.85)
**Evolved:** 2026-03-14 night agent (v1.4)
**Use when:** 撰寫 shell 自動化腳本：launchd plist、jq 狀態管理、Claude CLI headless、Discord webhook、JSONL 串流解析、macOS zsh 模式

## 用途

這個 skill 涵蓋 Javan 在 shell script 自動化中反覆使用的核心模式。
適用於設計或擴充 cron job、heartbeat checks、daily-news 等系統。

---

## 模式 1：Discord Webhook 輸出

```bash
WEBHOOK_URL="$DISCORD_WEBHOOK"  # 從環境變數取得

send_discord() {
  local msg="$1"
  # 分塊處理（2000 字元限制）
  while [[ ${#msg} -gt 1900 ]]; do
    chunk="${msg:0:1900}"
    msg="${msg:1900}"
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"content\": $(echo "$chunk" | jq -Rs .)}"
  done
  curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"content\": $(echo "$msg" | jq -Rs .)}"
}
```

**規則：**
- 夜間（01:00-07:00）不推送 Discord
- 錯誤 log 寫入檔案，不推 Discord
- 2000 字元需分塊

---

## 模式 2：Claude --print AI 處理

```bash
process_with_claude() {
  local input_file="$1"
  local prompt_file="$2"
  local log_file="$3"

  RESULT=$(unset CLAUDECODE; claude --print \
    --system-prompt "$(cat "$prompt_file")" \
    --model claude-sonnet-4-6 \
    < "$input_file" \
    2>>"$log_file")

  echo "$RESULT"
}
```

**規則：**
- 必須 `unset CLAUDECODE`
- stdin 傳入（`< file`）
- 模型固定 `claude-sonnet-4-6`
- 檢查 exit code：`|| { log "claude --print failed"; return 1; }`
- 長時間呼叫加 timeout：`timeout 300 claude --print ...`
- 輸出可能為空，使用前先檢查 `[[ -n "$RESULT" ]]`

---

## 模式 3：jq JSON 狀態管理

```bash
STATE_FILE="path/to/state.json"

# 讀取
VALUE=$(jq -r '.key // empty' "$STATE_FILE")

# 原子更新（含 trap EXIT 清理）
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT  # 必須在 mktemp 後立即設！確保中斷時 tmpfile 被清理
jq --arg val "$VALUE" '.key = $val' "$STATE_FILE" > "$TMPFILE" \
  && mv "$TMPFILE" "$STATE_FILE"
```

**規則：**
- 永遠用 tmpfile 做原子更新
- **mktemp 後立即加 `trap "rm -f $TMPFILE" EXIT`**（不然 script 中斷會留下 /tmp/ 殘留）
- trap 放在 mktemp 之後（mktemp 之前 $TMPFILE 未定義，trap 觸發會報錯）
- `EXIT` 比 `ERR` 更完整：ERR 不捕捉 kill 信號，EXIT 涵蓋所有結束情況
- 讀取時用 `// empty` 設預設值

---

## 模式 4：gog CLI 操作 Gmail

```bash
# 搜尋
gog gmail search "is:unread" --account starpincer@gmail.com

# 讀取
gog gmail message get "$MSG_ID" --account starpincer@gmail.com

# 標記已讀
gog gmail message modify "$MSG_ID" \
  --remove UNREAD \
  --account starpincer@gmail.com \
  --no-input
```

**規則：**
- Gmail 帳號固定 `starpincer@gmail.com`
- cron job 中不用 MCP，用 gog

---

## 模式 5：模組化自動發現

```bash
MODULES_DIR="$SCRIPT_DIR/checks"

for module in "$MODULES_DIR"/*.sh; do
  [[ -f "$module" ]] || continue
  # 透過環境變數傳遞 context
  export CONTEXT_VAR="$value"
  result=$(zsh "$module" 2>/dev/null) || continue
  # 處理 JSON 輸出
  echo "$result" | jq -r '.key // empty'
done
```

**規則：**
- 每個模組透過環境變數接收輸入
- 透過 stdout 輸出 JSON
- 模組失敗不中斷整體流程（`|| continue`）
- 錯誤輸出導向 log：`2>>"$LOG_FILE"`
- 失敗時記錄哪個模組失敗：`log "WARN: $module_name failed"`

---

## 模式 6：Playwright 使用量監控

```bash
# 取得使用率
USAGE_RESULT=$(cd ~/assistant/heartbeat && node check-usage.js 2>/dev/null)
USAGE_PCT=$(echo "$USAGE_RESULT" | jq -r '.percentage // empty')
USAGE_DAY=$(echo "$USAGE_RESULT" | jq -r '.days_into_week // empty')

# 計算預算（線性增長，週限額 80%）
USAGE_BUDGET=$(awk "BEGIN {printf \"%.1f\", ($USAGE_DAY / 7) * 80}")

# 判斷是否超預算
if (( $(echo "$USAGE_PCT > $USAGE_BUDGET" | bc -l) )); then
  echo "Over budget"
fi
```

---

---

## 模式 7：JSONL 事件流解析

Claude SDK session log 是 JSONL 格式，用 `select()` 過濾事件：

```bash
SESSION_LOG="path/to/session.jsonl"

# 從 session 結果中提取統計
CLAUDE_COST=$(jq -r 'select(.type=="result") | .total_cost_usd // 0' "$SESSION_LOG" 2>/dev/null | tail -1)
CLAUDE_TURNS=$(jq -r 'select(.type=="result") | .num_turns // "?"' "$SESSION_LOG" 2>/dev/null | tail -1)
CLAUDE_STOP_REASON=$(jq -r 'select(.type=="result") | .subtype // .stop_reason // "unknown"' "$SESSION_LOG" 2>/dev/null | tail -1)

# 監控 session 進度
LAST_TOOL=$(jq -r 'select(.type=="tool_use") | .tool_name // empty' "$SESSION_LOG" 2>/dev/null | tail -1)
```

**規則：**
- `2>/dev/null` 避免解析錯誤的行產生 stderr
- `tail -1` 取最後一個 result 事件
- `// fallback` 處理 null/missing 欄位

**常見 JSONL 事件類型：**
- `tool_use` — Claude 呼叫工具
- `tool_result` — 工具回傳結果
- `result` — session 結束摘要（cost、turns、stop_reason）

---

---

## 模式 8：多步驟 Claude 腳本（--resume + --json-schema）

多個 claude 呼叫共用 session context，或要求結構化輸出：

```bash
# 步驟 1：分析 + 取得 session_id
SESSION=$(unset CLAUDECODE; claude --print \
  --output-format json \
  --model claude-haiku \
  --no-session-persistence \
  "分析以下代碼並找出 TODO 列表：$(cat src/main.go)" \
  | jq -r '.session_id')

# 步驟 2：接續 session context 做後續處理
RESULT=$(unset CLAUDECODE; claude --print \
  --output-format json \
  --resume "$SESSION" \
  "根據剛才的 TODO 列表，產出優先級排序的 JSON" \
  | jq -r '.result')
```

**結構化輸出（--json-schema）：**
```bash
STRUCTURED=$(unset CLAUDECODE; claude --print \
  --output-format json \
  --json-schema '{"type":"object","properties":{"items":{"type":"array","items":{"type":"string"}}}}' \
  "列出前 5 個最重要的安全漏洞" \
  | jq '.structured_output.items[]')
```

**工具限制（fan-out 安全模式）：**
```bash
for file in $(cat files.txt); do
  unset CLAUDECODE
  claude --print \
    --allowedTools "Edit,Bash(git add *),Bash(git commit *)" \
    "遷移 $file 到新架構" &   # 平行執行
done
wait
```

**規則：**
- `--no-session-persistence` 用於 CI/CD（不存 session 記錄）
- `--resume` 需要 session_id，從 `jq -r '.session_id'` 取得
- `--allowedTools` 比 `--disallowedTools` 更嚴格（白名單優先）
- 平行 fan-out 時每個 claude 呼叫要 `unset CLAUDECODE`

---

## 決策樹：選擇輸出方式

```
需要輸出給用戶？
├── 白天（07:00-01:00）→ Discord webhook
├── 夜間（01:00-07:00）→ 寫入 night-report.md，等早上
└── 錯誤訊息 → 寫入 log 檔
```

## 決策樹：選擇工具

```
需要 AI 處理？
├── 在 session 內 → 直接使用 Claude Code
└── 在 cron/shell script 中 → claude --print (unset CLAUDECODE)

需要操作 Gmail？
├── 在 session 內（互動） → Gmail MCP
└── 在 cron/shell script 中 → gog CLI

需要處理 JSON？
├── 簡單讀寫 → jq
└── 複雜轉換 → Python
```

---

## Pattern 9：jq 錯誤防護與除錯迴圈

**來源：** `jq-null-safety-diagnostic-cycle.md` + `jq-reduce-scope-trap.md`

### Null Safety（最常見錯誤）

```bash
# ❌ .history 為 null 時崩潰
jq '.history[] | .value' state.json

# ✅ 加 ? 運算符，null 時跳過
jq '.history[]? | .value' state.json

# ✅ 讀取帶預設值（避免 null 傳播）
VALUE=$(jq -r '.key // "default"' state.json)
COUNT=$(jq '.items // [] | length' state.json)
```

### reduce 作用域陷阱

```bash
# ❌ reduce 內部 . 是 accumulator，不是原始 input
reduce .goals[] as $goal ({}; .result = (.history[] | ...))

# ✅ 先捕捉原始 input 為 $root
. as $root |
reduce .goals[] as $goal ({}; .result = ($root.history[] | ...))

# ✅ 或改用 map + group_by 迴避 reduce
jq '[.goals[] | {id: .id, value: .value}] | group_by(.id)' state.json
```

### 除錯迴圈

jq 報錯時的標準步驟：
1. 從錯誤訊息（`Cannot iterate over null`、`compile error`）定位代碼行
2. 提取 jq 表達式，**單獨在 CLI 測試**：`echo '{"key":null}' | jq '.key[]?'`
3. 識別問題類型：null context / macOS jq 版本限制 / reduce scope
4. 修復 + 驗證整個 script 輸出結構

### Pipe + Alternative 優先順序陷阱（`//` 陷阱）

jq 的 `|` 和 `//` 優先順序容易誤判，導致靜默錯誤：

```bash
# ❌ 看起來是 "context 或 task"，實際解析卻不同：
jq '.actions | map(...)[$i].context // .actions | map(...)[$i].task' f.json
# 真實解析：.actions | (.context // .actions) | .task
# 當 .context 非 null 字串時：後段 | map(...) 試圖 iterate 字串 → "Cannot iterate over string" 錯誤
# 當 .context 為 null 時：返回整個 .actions 陣列，.task 取不到 → 空字串

# ✅ 括號明確指定 alternative 範圍：
jq '.actions | map(...)[$i] | (.context // .task)' f.json

# ✅ 規則：// 兩側都要用括號保護，特別是左側含 | 的表達式
VALUE=$(jq -r '.items[$i] | (.name // .id // empty)' state.json)
```

**實例（heartbeat.sh Bug C，2026-03-15）：** `system-maintenance.sh` 寫入 context 為 `"Trimmed observations.jsonl from 1146 to 500 lines"` 的 TODO action，heartbeat.sh 解析時觸發 `Cannot iterate over string ("Trimmed ob...")` jq error，在 launchd.err.log 持續出現。

### macOS jq 版本注意

```bash
# macOS jq 1.7.1 不支援 try...catch，改用：
jq '.field // empty' file.json 2>/dev/null || echo "fallback"

# 安全讀取 JSONL（忽略解析失敗的行）
jq -r 'select(.type=="result") | .value' log.jsonl 2>/dev/null | tail -1
```
