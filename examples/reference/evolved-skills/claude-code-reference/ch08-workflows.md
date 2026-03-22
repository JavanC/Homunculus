# ch08: 進階工作流模式 + Best Practices

## 16. 進階工作流模式

**Interview Pattern**（大型功能前）：
```text
I want to build X. Interview me using the AskUserQuestion tool.
Keep interviewing until covered, then write a spec to SPEC.md.
```
→ 收到 spec 後開新 session 執行（乾淨 context）

**Writer/Reviewer 雙 Session**：
- Session A 實作，Session B 用 `@file` 引用做 review
- 或 A 寫 tests，B 寫 passing code

**Fan-out 批次**：
```bash
for file in $(cat files.txt); do
  claude -p "Migrate $file" --allowedTools "Edit,Bash(git commit *)"
done
```

**Pipe 資料**：`cat error.log | claude`、`claude -p "..." --output-format json | jq`

**@ 引用**：`Look at @src/auth.ts and @docs/policy.md, then implement...`

**Session 命名**（`/rename`）：
```text
/rename "oauth-migration"   ← 像 git branch 一樣命名，方便 --resume 找
```

**Claude Code 除錯配置確認**：
```text
/status   ← 確認 proxy/gateway 設定是否正確套用
```

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
```

---


---

## 最佳實踐摘要

1. **CLAUDE.md 保持精簡**：只放 Claude 不能從代碼猜到的規則，多餘的規則會被忽略
2. **提供驗證手段**：測試/截圖/輸出讓 Claude 自我校驗（最高槓桿）
3. **Context 是最貴資源**：用 `/clear` 清理、用 subagent 隔離探索、用 Summarize from here 壓縮
4. **Explore → Plan → Code → Commit**：Plan Mode 分離探索與實作
5. **大型 migration 用 fan-out**：`claude -p "..." --allowedTools` 批次處理
6. **安全性雙層**：Permissions（工具層）+ Sandboxing（OS 層）同時使用
7. **Path-scoped rules**：詳細指令用 `paths:` frontmatter 按需載入，節省 context
8. **先命名後清理**：`/rename` → `/clear` → `/resume`，不丟失 session 歷史
9. **自訂快捷鍵**：`chat:stash`（Ctrl+S）暫存 prompt、`chat:externalEditor`（Ctrl+E）編輯長 prompt
10. **MCP scope 注意**：`local`（個人本專案）、`project`（.mcp.json 共享）、`user`（跨專案）
11. **診斷優先**：`/doctor` 全面檢查（安裝/MCP/keybindings/context 警告），`/bug` 回報問題
12. **CLAUDE.md 精簡**：`/init` 生成起點，只保留 Claude 無法從代碼猜到的規則；太長時規則被忽略
13. **Context 是最貴資源（二）**：2 次糾正後 `/clear` 重來；subagent 做探索（保護主 context）；`/compact Focus on X` 聚焦壓縮
14. **`ultrathink`** keyword：當次 turn 使用 high effort 思考（不改全局），用於 one-off 複雜問題

---


---

## 29. 工作流最佳實踐（Best Practices）

### 5 個常見反模式

| 反模式 | 症狀 | 修法 |
|--------|------|------|
| 廚房水槽 Session | 多個不相關任務堆在同一 context | `/clear` 分隔任務 |
| 無限糾正迴圈 | 糾正兩次仍錯 | `/clear` + 重寫更精確的 prompt |
| 臃腫 CLAUDE.md | 太長導致 Claude 忽略規則 | 每行問「刪掉會犯錯嗎？」 |
| 信任後驗證落差 | 實作看似對但邊界 case 未處理 | 永遠提供驗證（tests/screenshots）|
| 無限探索 | Claude 讀幾百個檔案，context 爆 | 用 subagent 做調查 |

### 驗證策略（最高槓桿）
```
❌ "implement email validation"
✅ "write validateEmail. test cases: user@example.com=true, invalid=false. run tests after"
```

### Session 管理
```bash
claude --continue          # 繼續最近 session
claude --resume            # 選擇 session（picker）
claude --resume oauth-migration  # 指定名稱
/rename oauth-migration    # 給當前 session 命名
```

**v2.1.70 改進**：修復 skill listing 重複注入；`--resume` 省 ~600 tokens（不重複載入已在 context 的 skills）。

### Worktree 工作流（v2.1.72）
```bash
claude --worktree feature-a   # 建立 git worktree 並進入
# 完成後在 session 內使用 ExitWorktree 工具離開
# 或 /plan fix the auth bug  ← plan mode 可直接帶描述引數
```

### CLAUDE.md 精要

| ✅ 放進去 | ❌ 不要放 |
|-----------|----------|
| Claude 無法猜到的 bash 命令 | 讀程式碼就知道的事 |
| 非預設的 code style | 標準語言慣例 |
| Test runner 和測試指令 | 詳細 API 文件（改用連結）|
| 開發環境 quirks | 「寫乾淨的程式碼」等自明慣例 |

CLAUDE.md 太長時 Claude 會忽略重要規則。`IMPORTANT`/`YOU MUST` 強化關鍵規則。

---

