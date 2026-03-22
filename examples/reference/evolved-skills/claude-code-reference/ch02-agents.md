# ch02: Subagents + Agent Teams

## 3. Subagents 系統

```yaml
# ~/.claude/agents/my-agent.md
---
name: my-agent
description: Use proactively for X. Delegates Y tasks.
tools: Read, Grep, Glob, Bash
model: haiku          # sonnet | opus | haiku | inherit | 完整 model ID（如 claude-opus-4-6）（v2.1.74 修復：之前完整 ID 被靜默忽略）
permissionMode: acceptEdits
maxTurns: 20
memory: user          # 持久記憶到 ~/.claude/agent-memory/<name>/
background: false     # true = 永遠背景執行
isolation: worktree   # git worktree 隔離
skills:
  - shell-automation-patterns  # 啟動時完全預載入 skill 內容（full preload）
---
You are a specialized agent...
```

> **Skills 預載入差異**：主 session 按需載入 skills（用戶 `/invoke` 或 Claude 判斷時才讀取內容）；
> Subagent 的 `skills:` 欄位在**啟動時完全預載入**（full preload），直接進入隔離 context。
> Subagent **不繼承**主 session 已載入的 skills，必須在 `skills:` 中明確列出。

> **Subagent 繼承規則**：獨立 context 但**繼承 CLAUDE.md + git status**（從 parent）。
> System prompt 與 parent **共享緩存**（節省 tokens）。對話歷史**不繼承**。

**記憶 Scopes**：

| Scope | 路徑 | 適用 |
|-------|------|------|
| `user` | `~/.claude/agent-memory/<name>/` | 跨所有專案（推薦預設）|
| `project` | `.claude/agent-memory/<name>/` | 專案特定，可 commit 分享 |
| `local` | `.claude/agent-memory-local/<name>/` | 專案特定，不 commit |

→ 自動注入 `MEMORY.md` 前 200 行到 subagent context

**Session-Scoped Agents（CLI flag）**：
```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer...",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

**Resume Subagent**：Subagent 完成後可繼續（完整 context 保留）：
```text
Use the code-reviewer to review src/auth.ts
[Agent 完成]
Continue that code review and now check src/session.ts
```
Transcripts：`~/.claude/projects/{project}/{sessionId}/subagents/agent-{id}.jsonl`

**Subagent-scoped hooks**：定義在 frontmatter 中，只在該 subagent 執行期間生效，結束後自動清理。

**Agent 管理**：`/agents`（互動式）、`claude agents`（CLI 列出）

---


---

## 11. Agent Teams（實驗性）

```bash
# 啟用
# settings.json: { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }

# 建立 team（自然語言）
"Create a team with 3 teammates: security reviewer, performance reviewer, test reviewer"

# 控制
# Shift+Down → 切換 teammate
# Ctrl+T → 切換 task list
```

**Subagents vs Agent Teams**：
- Subagents：回報給 main agent，適合快速獨立任務
- Agent Teams：teammates 互相通訊，適合需要討論/辯論的複雜研究

**最佳規模**：3-5 teammates，每人 5-6 tasks，各人負責不同檔案（避免衝突）

---

