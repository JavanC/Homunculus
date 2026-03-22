# ch07: Model 設定 / 記憶系統進階 / 成本管理

## 15. Model 設定與 opusplan

```bash
/model opusplan    # Plan Mode 用 Opus，執行自動切 Sonnet
/model sonnet[1m]  # 1M token context window
```

| 別名 | 行為 |
|------|------|
| `sonnet` | 日常任務（預設推薦）|
| `opus` | 複雜推理 |
| `haiku` | 快速簡單任務 |
| **`opusplan`** | **Plan=Opus，Execute=Sonnet（最佳 cost/quality）** |
| `sonnet[1m]` | 超大 context（>200K tokens 按 extra 計費）|

**Effort Level**（Opus 4.6 / Sonnet 4.6；v2.1.72 起 `max` 移除）：
```bash
CLAUDE_CODE_EFFORT_LEVEL=low   # ○ 快速便宜
CLAUDE_CODE_EFFORT_LEVEL=medium # ◐ 預設（Opus 4.6 Max/Team）
CLAUDE_CODE_EFFORT_LEVEL=high  # ● 深度推理
/model                          # 用方向鍵調整，顯示 ○◐● 圖示
```

**Fast Mode + Low Effort = 最大速度**（適合快速迭代）

**Cloud Provider 模型固定**（Bedrock/Vertex/Foundry 必須設定，否則新版本上線可能 break）：
```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL="us.anthropic.claude-opus-4-5"
export ANTHROPIC_DEFAULT_SONNET_MODEL="us.anthropic.claude-sonnet-4-6"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="us.anthropic.claude-haiku-3-5"
```
不設定則 alias 解析到最新版，Anthropic 上線新 model 時可能破壞未啟用的帳號。

**`modelOverrides` setting**（v2.1.73）：將 model picker 項目對應到自訂 provider model ID：
```json
{
  "modelOverrides": {
    "opus": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-opus-4-6-v1:0"
  }
}
```
用途：Bedrock inference profile ARN、自訂 gateway endpoint 等。

---


---

## 17. 記憶系統進階

| 層級 | 路徑 | 說明 |
|------|------|------|
| Managed | `/Library/Application Support/ClaudeCode/CLAUDE.md` | 組織全體（不可排除）|
| User | `~/.claude/CLAUDE.md` | 個人偏好（所有專案）|
| Project | `./CLAUDE.md` | 團隊共享（commit 進 git）|
| **Local** | **`./CLAUDE.local.md`** | **個人私有（自動加入 .gitignore）** |
| Auto | `~/.claude/projects/<repo>/memory/` | Claude 自動寫（前 200 行）；`/memory` 管理；`"autoMemoryEnabled": false` 停用；`"autoMemoryDirectory": "path"` 自訂路徑（v2.1.74）|

**Path-Scoped Rules**（節省 context 的關鍵）：
```markdown
---
paths:
  - "src/api/**/*.ts"
  - "tests/**/*.test.ts"
---
# 只在處理這些檔案時載入的規則
```

**Monorepo 排除**：
```json
{"claudeMdExcludes": ["**/other-team/CLAUDE.md"]}
```

**InstructionsLoaded hook**：診斷哪些 instruction 在何時載入（偵錯用）

**Rules symlink**：`ln -s ~/shared-rules .claude/rules/shared`（多專案共享）

**CLAUDE.md Import**（組合多個檔案）：
```markdown
See @README.md for project overview and @package.json for npm commands.

# Additional Instructions
- Git workflow: @docs/git-instructions.md
```

**`/init`**：自動從現有 codebase 生成 starter CLAUDE.md（偵測 build system/test framework/patterns）

**CLAUDE.md 應包含 vs 不應包含**：
- ✅ 包含：Claude 無法從代碼猜到的 bash commands、不同於 default 的 code style、測試指令、PR 規範
- ❌ 排除：Claude 已知的標準慣例、頻繁變動的資訊、代碼庫的逐檔說明

**強調語法**：加 "IMPORTANT" 或 "YOU MUST" 改善 adherence（CLAUDE.md 太長時規則容易被忽略）

**HTML 注解隱藏（v2.1.72）**：`<!-- 這段說明只給人看，不消耗 token -->` 不會注入 model context，但 `@CLAUDE.md` 讀取時仍可見。適合在 CLAUDE.md 中加人類閱讀的說明而不浪費 token。

**Compaction 客製化**（在 CLAUDE.md 中）：
```markdown
When compacting, always preserve the full list of modified files and any test commands.
```

**`/compact <instructions>`**：指定 focus 壓縮，如 `/compact Focus on the API changes`

---


---

## 18. 成本管理

**平均費用**：$6/開發者/天（90% 用戶 < $12）

**最有效的成本控制**：

```bash
# 任務切換：先命名再清，之後可復原
/rename "feature-auth"
/clear
/resume feature-auth      # 需要時復原

# MCP 工具自動延遲載入（超過 5% context 就 defer）
# settings.json: {"env": {"ENABLE_TOOL_SEARCH": "auto:5"}}

# 降低 extended thinking 費用（Sonnet/pre-Opus-4.6 適用）
MAX_THINKING_TOKENS=8000  # 預設 31999
MAX_THINKING_TOKENS=0     # 完全停用思考（Opus 4.6 已改用 adaptive，此設仍有效）

# CI/CD 成本上限（超過就中止，不要用 --no-session-persistence）
claude -p "..." --max-budget-usd 2.00   # 超過 $2 自動停止

# Hook 預處理：10000 行 log → grep ERROR → 幾百行
```

**Haiku 適用場景**（比 Sonnet 便宜 ~80%）：
- Subagent 重複性任務：格式轉換、資料萃取、分類
- Eval 評估（/eval-skill 明確用 Haiku）
- 批次處理（指令明確、輸出格式固定）
- 設定：skill frontmatter 的 `model: haiku`，或 `ANTHROPIC_DEFAULT_CLAUDE_MODEL=claude-haiku-4-5`

**高成本陷阱**：
- Agent Teams plan mode ≈ 7x tokens
- MCP server 即使不用也佔 context
- `/compact` 指令要加 focus（保留關鍵內容）

**CLAUDE.md → Skills**：詳細工作流移到 skills（按需載入），CLAUDE.md 保持 < 200 行

**Team Rate Limit 建議（TPM/人）**：
| 人數 | TPM/人 | RPM/人 |
|------|--------|--------|
| 1-5 | 200k-300k | 5-7 |
| 5-20 | 100k-150k | 2.5-3.5 |
| 20-50 | 50k-75k | 1.25-1.75 |
| 50-100 | 25k-35k | 0.62-0.87 |
| 100+ | 10k-20k | 0.25-0.47 |

Bedrock/Vertex/Foundry 無原生費用追蹤 → 用 **LiteLLM Proxy** 按 key 追蹤費用。

---

## 決策樹：選什麼擴展方式？

```
要在 Claude 工作時自動觸發某個行為？
└── Hooks（確定性、每次都跑）

要封裝可重用的工作流程？
├── 互動式 → Skills（用戶 /invoke 或 Claude 自動用）
└── 隔離執行 → Subagents

要多個 agent 互相討論/協作？
└── Agent Teams（實驗性，需啟用）

要連接外部工具（DB、API、Slack）？
└── MCP servers

要跨專案分享一組 skills + agents + hooks？
└── Plugin

要定期在 session 內執行某任務？
└── /loop 或 CronCreate

要快速 Opus 回應（犧牲費用）？
└── /fast（Fast Mode）

要安全的自主執行環境？
└── /sandbox（Sandboxing）

要超大規模平行批次變更（50+ 檔）？
└── /batch（每個任務獨立 worktree + PR）

完成功能後要清理代碼品質？
└── /simplify（平行 3 agents 審查）

要自訂互動快捷鍵（stash/editor/mode 切換）？
└── Keybindings（~/.claude/keybindings.json，/keybindings 管理）

要在瀏覽器測試 web app / 抽取資料 / 錄 GIF？
└── Chrome 整合（claude --chrome，共享登入狀態）
```

---

