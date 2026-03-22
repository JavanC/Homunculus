# ch11: Output Styles + 版本更新（v2.1.72–80）+ CC Channels

## 34. Output Styles（系統提示替換）

Output Styles 直接**替換** Claude Code 的軟體工程 system prompt，用於非程式任務或整體風格改變（與 CLAUDE.md 附加不同）。

```bash
/config   # v2.1.73+ 在 /config 介面選擇（session 開始時固定，利於 prompt caching）
```

設定儲存於 `.claude/settings.local.json`。

### 內建 Styles

- `default` — 標準軟體工程模式
- `explanatory` — 每個操作間加入教育性 Insights（學習 codebase 時有用）
- `learning` — 協作學習模式：insights + 要求用戶完成部分代碼（加 `TODO(human)` 標記）

### 自訂 Output Style

```markdown
<!-- ~/.claude/output-styles/my-style.md -->
---
name: 風格名稱
description: 用途說明
keep-coding-instructions: false   # false = 完全替換；true = 保留程式能力 + 自訂
---
[自訂 system prompt 內容...]
```

存放位置：
- `~/.claude/output-styles/` — 個人（所有專案）
- `.claude/output-styles/` — 專案級

### 機制比較

| 機制 | 作用點 | 適用場景 |
|------|--------|---------|
| Output Styles | 替換 system prompt（session 固定）| 非軟體任務、整體風格 |
| CLAUDE.md | 附加到 user message（每次） | 持久規則、偏好 |
| Skills | 任務觸發時載入 | 可重用工作流 |
| `--append-system-prompt` | 附加到 system prompt | 單次 session 調整 |

---

## 35. v2.1.72–76 新功能速查

> 詳細說明見 instinct `claude-code-v2174-features-2026.md`

### v2.1.76（2026-03-14/15）

- **MCP Elicitation**：MCP server 可在任務中途發出互動式 dialog 請求結構化輸入（`Elicitation` + `ElicitationResult` hooks 可攔截）
- **`-n`/`--name` flag**：啟動時命名 session（`claude -n "my-task"`）
- **`worktree.sparsePaths`**：大型 monorepo 用 git sparse-checkout 只 checkout 需要目錄
- **`PostCompact` hook**：compaction 完成後觸發（可用於壓縮後清理或通知）
- **`/effort` slash command**：在 session 中設定 effort level（原本需要 `--effort` CLI flag）
- **Deferred tools schema 修復** ⭐：ToolSearch 載入的工具在 compaction 後不再遺失 input schema（修復 array/number 參數被拒絕）
- **Background agent 改進**：kill 背景 agent 時保留其部分結果於 conversation context
- **Stale worktree 清理**：平行跑 interrupted 後殘留的 worktree 自動清除
- **Auto-compaction circuit breaker**：連續失敗 3 次停止自動重試（防無限迴圈）
- **Remote Control 多項修復**：idle session 靜默死亡、rapid messages queuing、stale work items 等

### v2.1.75（2026-03-14）

- **Bash `!` mangling 修復**：jq `select(.x != .y)`、`history -c` 等含 `!` 語法現在正確執行
- **Token 估算修復**：thinking + tool_use blocks 不再被過計，`/context` 百分比更可靠
- **Memory files 最後修改時間**：Claude 可在 context 中看到記憶檔案的 timestamp，推理新鮮度
- **1M context for Opus 4.6**：Max/Team/Enterprise plan 預設啟用，無額外計費
- **Async hook 靜音**：`async: true` hooks 不再顯示 completion 訊息（`--verbose` 可見）
- **`/color <hex>`**：為 session prompt bar 設顏色，方便識別多個 concurrent sessions
- **`/rename <name>`**：session 名稱顯示於 prompt bar

### v2.1.72–73

- **Agent tool `model` 恢復**：per-invocation 模型覆寫（`"model": "haiku"` 在 Agent tool JSON）
- **CLAUDE.md HTML 註解隱藏**：`<!-- 備注 -->` 自動注入時 Claude 看不到（Read tool 可見），可做私人備注
- **`CLAUDE_CODE_DISABLE_CRON=1`**：立即停止所有 /loop 排程
- **`ExitWorktree` tool**：離開 `EnterWorktree` session 的專用工具
- **SDK `query()` cache 修復**：prompt cache 失效問題修復，input token 成本最高 -12x
- **`modelOverrides` 設定**：將 model picker 選項映射到自訂 provider ID（Bedrock ARN 等）
- **`lsof`、`pgrep`、`fd` 加入 bash auto-approve 清單**：減少常見唯讀命令的確認提示


### v2.1.78（2026-03-19）

- **`StopFailure` hook** ⭐：API 錯誤（rate limit、auth failure）結束 turn 時觸發，可捕捉靜默失敗
- **`${CLAUDE_PLUGIN_DATA}`**：plugin 持久化狀態變數，升級後保留（搭配 `InstructionsLoaded` hook 讀取）
- **Plugin agent frontmatter 新欄位**：`effort`、`maxTurns`、`disallowedTools`
- **tmux 通知穿透**：`set -g allow-passthrough on` → 終端通知可穿透 tmux（支援 iTerm2/Kitty/Ghostty）
- **回應逐行 streaming**：文字回應改為逐行輸出（非最後一次性）
- **`ANTHROPIC_CUSTOM_MODEL_OPTION`**：在 `/model` picker 加入自訂 model entry
- **安全修復** ⚠️（三項）：① `deny: ["mcp__servername"]` 未正確阻止 MCP tools → 已修復 ② sandbox 依賴缺失時靜默停用 → 改為警告 ③ `bypassPermissions` 可寫入 `.git`/`.claude` → 已修復
- **Bug Fixes**：① `--resume` 大型 session（>5MB + subagent）歷史截斷 → 已修復 ② API 錯誤 → stop hook 無限迴圈 → 已修復 ③ `sandbox.filesystem.allowWrite` 不支援絕對路徑 → 已修復

### v2.1.77（2026-03-18）

- **Opus 4.6 output token 擴展** ⭐：預設 max output 4k → **64k**；上限 **128k**（對長程 coding/analysis 任務意義重大）
- **安全修復** ⚠️：`PreToolUse` hook 回傳 `"allow"` 可繞過 `deny` 規則（含 enterprise managed settings）→ 已修復
- **Agent tool API 重構**：`resume` 參數移除 → 改用 `SendMessage({to: agentId})` 繼續已停止的 agent；`SendMessage` 自動 resume stopped agent
- **`/branch` 正式命名**：`/fork` 更名為 `/branch`（`/fork` 保留 alias，向後相容）
- **`--resume` 競態修復**：memory-extraction write 與 transcript 競態導致歷史截斷 → 已修復
- **`sandbox.filesystem.allowRead`**：在 `denyRead` 區域中例外放行特定路徑讀取（細粒度沙箱控制）
- **`/copy N`**：複製第 N 條最近的 assistant 回應（N 預設 1 = 最新一條）

### v2.1.79（2026-03-18）

- **`SessionEnd` hooks 修復**：互動式 `/resume` 時不觸發 SessionEnd → 已修復
- **`claude auth login --console`**：支援 Console 帳號認證（非 claude.ai 帳號）
- **VSCode `/remote-control`**：橋接 claude.ai/code 的遠端控制
- **Non-streaming fallback 2 分鐘 timeout**：API 不支援 streaming 時自動 fallback，每次嘗試 2 分鐘（解決長任務靜默超時問題）
- **`CLAUDE_CODE_PLUGIN_SEED_DIR` 多目錄**：冒號（`:`）分隔多個 seed 目錄（Unix），方便共享 plugin 庫
- **`/btw` 修復**：修復 `/btw` 回傳主 agent 輸出而非回答旁枝問題的 bug

### v2.1.80（2026-03-19）⭐ 當前版本

- **`effort` frontmatter for skills/commands** ⭐：在 `.md` skill/command YAML frontmatter 設定預設 effort：
  ```yaml
  ---
  effort: low    # low | medium | high | max（max = Opus 4.6 only，最高品質）
  ---
  ```
  夜間低風險任務可設 `low` 節省 token；high-stakes 任務設 `high` 提升品質。
  也可在 shell 用 `CLAUDE_CODE_EFFORT_LEVEL=low claude -p "..."` 控制。
- **`--channels` flag**：MCP server 可推送訊息到 session（research preview）— 詳見 Section 36
- **statusline 新增 `rate_limits` 欄位**：可在 `~/.claude/statusline.sh` 加入 `rate_limits`，顯示 5h/7d 視窗的速率限制剩餘量
- **修復 `--resume` 遺失平行 tool 結果**：多個 tool 並行呼叫在 resume 後不再遺失部分結果
- **啟動記憶體減少 ~80MB**：大型 repo（250k+ 檔案）啟動時記憶體佔用大幅優化
- **修復 managed settings 啟動未套用**：`remote-settings.json` 快取導致設定在啟動時未生效 → 已修復
- **修復 `/remote-control` 出現在 gateway**：gateway 部署環境中不再顯示 `/remote-control`（不相容）

## 36. CC Channels — Telegram/Discord 雙向橋接（v2.1.80+ research preview）

允許 MCP server 推送事件到你的 CC session（CI 結果、Telegram 訊息、Discord DM），Claude 可反應並回覆。需 claude.ai 帳號（非 API key）。

**快速設置（Telegram）：**
```bash
# 1. BotFather 建立 bot，取得 token
# 2. 安裝插件（需 Bun）
/plugin install telegram@claude-plugins-official
# （找不到：先執行 /plugin marketplace add anthropics/claude-plugins-official）

# 3. 設定 token
/telegram:configure 123456789:AAHfiqks...

# 4. 啟動並配對
claude --channels plugin:telegram@claude-plugins-official
# 在 Telegram 傳訊給 bot → 取得 pairing code
/telegram:access pair <code>
/telegram:access policy allowlist   # 只允許自己
```

**Discord 差異**：用 `/plugin install discord@claude-plugins-official`，Discord Developer Portal 建 bot，需啟用 Message Content Intent。

**關鍵限制**：
- 只在 session 開啟時有效；always-on 需 background process
- `--channels` 明確指定才生效（.mcp.json 單獨不夠）
- Team/Enterprise 預設停用，需 admin 在 managed settings 啟用

**與 webhook 差異**：CC Channels = 雙向互動控制；webhook = 單向推送通知

**Permission Relay（v2.1.81）**：channel servers 可將工具審核 prompt 轉發到手機。
夜間 agent 遇到 sensitive 操作時，可透過 Telegram/Discord 通知用戶確認，而不是自動允許或拒絕。
設定：在 `--channels` 啟動的 session 中，PermissionRequest 會同時推送到 channel。

### v2.1.81（2026-03-22）

- **`--bare` flag** ⭐：headless `-p` 呼叫跳過所有初始化（hooks/LSP/plugins/skill scan/auto-memory），大幅加速無狀態 script。限制：需 `ANTHROPIC_API_KEY`（不支援 OAuth/keychain）
- **`--channels` permission relay**：PermissionRequest 轉發到手機 channel，夜間 agent 可請求人工審核高風險操作
- **修復** background agent task 輸出卡住（polling interval 間完成的 race condition）
- **修復** `--resume` worktree session 自動切換回 worktree 目錄
- **修復** concurrent sessions OAuth token 刷新後需要重新認證（影響 heartbeat 多進程場景）
- **MCP read/search** collapse 成單行顯示（大幅減少 UI 雜訊）
