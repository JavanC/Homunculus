# Skill: Claude Code 功能參考手冊（Index）

**Version:** 4.9
**Icon:** eye
**Abbr:** Reference
**Use when:** 查閱 Claude Code 功能：hooks 設定、headless CLI flags、model 別名、permissions 規則、subagents、MCP、keybindings、版本更新要點

---

## 快速路由：讀哪個章節？

| 你想做的事 | 章節文件 |
|------------|---------|
| 設計擴展架構（skill/hook/mcp 優先順序）| `ch01-extensions.md` |
| 設定 Subagent / Agent Teams | `ch02-agents.md` |
| 撰寫 Hooks（PreToolUse/PostSession 等）| `ch03-hooks.md` |
| 設定 MCP 服務（基礎 + 進階）| `ch04-mcp.md` |
| UI 功能（Checkpoint/排程/Remote/快捷鍵）| `ch05-ui.md` |
| Rules / Plugins / 權限 / Sandboxing / 安全 | `ch06-rules-security.md` |
| Model 設定 / opusplan / 記憶系統 / 成本 | `ch07-model-memory.md` |
| 進階工作流 / Best Practices | `ch08-workflows.md` |
| 外部整合（監控/Chrome/IDE/企業/Cloud）| `ch09-integrations.md` |
| CLI flags / Agent SDK | `ch10-cli-sdk.md` |
| Output Styles / 版本更新（v2.1.72–80）| `ch11-output-versions.md` |

---

## 決策樹：選什麼擴展方式？

**我需要...**
```
永遠生效的規則 / 項目設定
    → CLAUDE.md（< 200 行）or rules/（path-scoped）

按需知識 / 可觸發工作流
    → Skills（低 context，/name 觸發）

隔離執行 / 並行任務 / 專用工作者
    → Subagents（隔離 context）

多 session 協同（需要互相通訊）
    → Agent Teams（ch02-agents.md）

連接外部服務（DB/Slack/browser）
    → MCP（ch04-mcp.md）

確定性腳本（lint/format/log）
    → Hooks（零 context cost，ch03-hooks.md）

跨專案打包分享
    → Plugins（ch06-rules-security.md）
```

---

## 決策樹：哪種 Model 設定？

```
需要深度推理 + 執行自動切 Sonnet
    → opusplan 別名（ch07-model-memory.md）

需要 1M context window
    → sonnet[1m] 別名

Opus 4.6 加速（速度 2.5x）
    → /fast 或 Fast Mode（ch05-ui.md）

設定 effort level
    → CLAUDE_CODE_EFFORT_LEVEL=low|medium|high
```

---

## 決策樹：Permissions / Security

```
查看/管理允許規則
    → /permissions（ch06-rules-security.md）

OS 層級隔離
    → /sandbox（ch06-rules-security.md）

Prompt injection 防護
    → Sandboxing 安全優勢（ch06-rules-security.md）

企業政策管理
    → ch09-integrations.md
```

---

## 擴展系統優先順序總覽

| 功能 | Context 成本 | 適用情境 |
|------|-------------|---------|
| CLAUDE.md | 每次載入 | 永遠生效的規則 |
| Skills | 低（按需）| 按需知識 / 工作流 |
| Subagents | 與主 session 隔離 | 隔離執行 / 平行 |
| Agent Teams | 高（獨立費用）| 多 session 協同 |
| MCP | 每次（工具定義）| 外部服務 |
| Hooks | **零** | 確定性腳本 |
| Plugins | 同各組件 | 跨專案打包 |

**CLAUDE.md 大小目標**：< 200 行（最多 ~500 行）。超過 → 移到 Skills（按需載入）

---

## Built-in Tools 速查

| 類別 | 工具 |
|------|------|
| 檔案操作 | Read, Edit, Write |
| 搜尋 | Glob（按名稱）、Grep（按內容）|
| 執行 | Bash、Git |
| Web | WebSearch、WebFetch |
| 特殊 | Agent、TodoWrite、NotebookEdit |

---

## 最佳實踐摘要（Always Check）

- `/permissions` — 確認目前允許規則
- `git status` — 確認無未提交變更
- 重大改動前 `git stash` — 保留快照
- MCP 中途斷線 → `/mcp` 確認連線
- subagent 不繼承主 session permissions

**Style**：優先 CLI 工具（gh/gcloud）而非 MCP；subagent 用於隔離執行而非便利

**Skip**：不要在 sandbox 模式下嘗試存取 Keychain

---

*詳細內容請讀對應章節文件（ch01–ch11）。章節文件含完整程式碼範例與邊界情境。*
