# ch01: 擴展系統 + Built-in Tools + Skills 系統

## 用途

這個 skill 是 Claude Code 進階功能的快速參考。
適用於設計自動化系統、設定助理架構、或討論 Claude Code 最佳實踐時。

---

## 1. 擴展系統：優先順序

| 功能 | 適用情境 | Context 成本 |
|------|----------|-------------|
| CLAUDE.md | 永遠適用的規則（build commands、conventions）| 每次請求都載入 |
| Skills | 按需知識、可觸發工作流（`/<name>`）| 低（描述每次；內容按需）|
| Subagents | 隔離執行、平行任務、專用工作者 | 與主 session 隔離 |
| Agent Teams | 多 session 協同（需互相溝通）| 高（每個 teammate 獨立費用）|
| MCP | 外部服務連接（DB、Slack、browser）| 每次請求（工具定義）|
| Hooks | 確定性腳本（lint、format、log）| **零**（外部執行，不進 context）|
| Plugins | 跨專案打包分享（skills + hooks + MCP）| 同各組件 |

**CLAUDE.md 大小指南**：目標 < 200 行（最多 ~500 行）。超過就把參考資料移到 Skills（按需載入）。

**Skills `disable-model-invocation: true`**：完全隱藏於 Claude，context 成本為零，直到你手動 `/invoke` — 適合有副作用或只想自己觸發的 skill。

**MCP 靜默斷線**：MCP server 中途斷線不會報警，工具直接消失。若發現 MCP 工具突然不可用 → 執行 `/mcp` 確認連線狀態。

## Built-in Tools 分類

| 類別 | 工具 |
|------|------|
| 檔案操作 | Read, Edit, Write（Create/Rename）|
| 搜尋 | Glob（按名稱）、Grep（按內容）|
| 執行 | Bash、Git |
| Web | WebSearch、WebFetch |
| Code Intelligence | Type errors、Go to definition、Find references（需 IDE 插件）|

**Agentic Loop**：Gather Context → Take Action → Verify Results（反覆迴圈，工具輸出形成下一步輸入）

**Context 自動清理三層**：(1) 清除舊工具輸出 → (2) 壓縮對話 → (3) 保留請求與關鍵程式碼

---

## 2. Skills 系統

> **Skills vs Hooks 核心差異**：Skills 是**用戶主動呼叫**的命令（`/skill-name`），不會自動觸發。
> 若要在工具執行後自動執行邏輯，應使用 **Hooks**（PostToolUse 類型），不是 Skills。

```yaml
# .claude/skills/fix-issue/SKILL.md
---
name: fix-issue
description: Fix a GitHub issue (disable-model-invocation = user only)
disable-model-invocation: true       # 只能手動觸發
context: fork                        # 在獨立 subagent 中執行
agent: Explore
allowed-tools: Read, Grep, Bash
model: claude-sonnet-4-6
---
用 `gh issue view $ARGUMENTS` 取得 issue，分析並修復，
跑測試確認，提交 commit，開 PR。
```

**動態注入**（在 Claude 看到前就執行）：
```markdown
Git status: !`git status --short`
Branch: !`git branch --show-current`
```

**變數**：`$ARGUMENTS`, `$ARGUMENTS[N]`, `$0`..., `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`

**Bundled Skills（內建）**：

| 指令 | 功能 |
|------|------|
| `/simplify [focus]` | 平行 spawn 3 個 review agents（reuse/quality/efficiency），找問題後自動修復 |
| `/batch <instruction>` | 超大規模變更：分析→分解 5-30 個任務→每個獨立 worktree + PR（需 git）|
| `/debug [desc]` | 讀取 session debug log，診斷 Claude Code 問題 |
| `/claude-api` | 載入 Claude API/SDK 參考（偵測到 `anthropic` import 自動啟用）|

```text
/batch migrate src/ from React class components to functional components
/batch add JSDoc comments to all exported functions
```

**進階 frontmatter**：
```yaml
user-invocable: false       # 背景知識：Claude 自動載入，用戶不能 /invoke
argument-hint: "[issue]"    # autocomplete 提示
Skill(deploy *)             # permissions deny 中禁用特定 skills
```

**環境**：`SLASH_COMMAND_TOOL_CHAR_BUDGET`（skill context 預算，預設 context window 2%）

**多檔 Skill**：`SKILL.md`（主）+ `reference.md`（按需）+ `scripts/helper.py`（可執行）

---

