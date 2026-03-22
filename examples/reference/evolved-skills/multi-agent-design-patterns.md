# Skill: Multi-Agent Design Patterns

**Version:** 1.2
**Evolved from:** 6 instincts (parallel-agent-task-distribution-2026, parallel-agents-git-coordination-2026, direnv-worktrees-parallel-agents-2026, mechanical-agent-responsibility-isolation-2026, agentic-engineering-patterns-2026, autonomous-agent-reliability-2026)
**Confidence threshold:** 0.75–0.92
**Created:** 2026-03-19
**Use when:** 設計多 agent 架構：平行任務分配、subagent dispatch 條件、worktree 隔離、orchestration 反模式識別

## 目的

設計、協調多 agent 系統的通用指引。適用於：平行 agent 任務分配、長時間自主 agent 可靠性、agent 職責隔離、多 agent 環境配置。

---

## Pattern 1：去中心化任務分配（Parallel Agents）

**問題**：多個 agent 同時執行時，如何避免重複認領同一任務？

### 方案：File Lock + Git Push
```
任務宣告流程：
1. agent 寫檔案到 current_tasks/<task-id>.lock（含 agent_id + timestamp）
2. git add + commit + push
3. 若 push 失敗（競爭衝突）→ git pull → 檢查 current_tasks/ → 換選下一個任務
4. 任務完成 → 刪除 lock 檔 + commit
```

### 有機專業化（Emergent Specialization）
- **不要預先指定分工**，讓 agent 依 repo 狀態自然分化
- 16 agent 建 C compiler 案例：自然出現「實作者、去重者、效能優化者、文件維護者」角色
- 強制指定分工反而降低彈性

### Oracle-driven 解除卡頓
當所有 agent 被同一個 bug 卡住時：
1. 引入外部 oracle（如 GCC 編譯結果、CI 測試輸出）
2. 把 oracle 輸出拆分為 per-agent 的獨立子任務
3. 恢復平行性

---

## Pattern 2：Git-Based 任務協調細節

```bash
# Agent 認領任務
TASK_ID="fix-memory-leak-str.c"
AGENT_ID="agent-$(uuidgen | head -c 8)"

# 宣告認領
echo "{\"agent\":\"$AGENT_ID\",\"started\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
  > current_tasks/${TASK_ID}.lock
git add current_tasks/ && git commit -m "claim: $TASK_ID by $AGENT_ID" && git push

# 若 push 失敗（conflict）
if git pull --rebase; then
  # 檢查是否被搶先
  if [ -f "current_tasks/${TASK_ID}.lock" ]; then
    # 已被其他 agent 認領，選下一個任務
    select_next_task
  fi
fi

# 任務完成
rm current_tasks/${TASK_ID}.lock
git commit -am "done: $TASK_ID" && git push
```

**適用場景**：多個 Claude Code agent 在不同 worktree 並行工作、夜間批量任務分配。

---

## Pattern 3：平行 Agent 環境配置（direnv + Worktrees）

**問題**：`git worktree add` 新 worktree 後，`.env` / API keys / local config 遺失。

### 解法：direnv `.envrc` 共享引用

在 repo 根目錄建立 `.envrc`（加入 `.gitignore`）：
```bash
# .envrc（不 commit）
export ANTHROPIC_API_KEY="sk-ant-..."
export DATABASE_URL="postgresql://localhost:5432/mydb"

# 讓所有 worktree 共用同一個 .venv
export VIRTUAL_ENV="$(git rev-parse --show-toplevel)/.venv"
export PATH="$VIRTUAL_ENV/bin:$PATH"
```

每個 `git worktree add` 後，`.envrc` 自動生效（direnv hook）：
- worktree 繼承主 repo 的環境變數
- 無需手動複製 `.env` 檔案

**搭配 CC v2.1.76 的 `worktree.sparsePaths`**（monorepo 優化）：
```json
// .claude/settings.json
{
  "worktree": {
    "sparsePaths": ["src/", "tests/", "package.json"]
  }
}
```

---

## Pattern 4：Agent 職責隔離原則

### 機械式 Agent vs 決策 Agent

| 類型 | 職責 | 典型任務 |
|------|------|---------|
| **機械式 Agent** | 確定性轉換 | JSON 格式轉換、schema 驗證、markdown 提取 |
| **決策 Agent** | 判斷與過濾 | 優先級排序、合理性評估、去重 |

**關鍵原則**：機械式 agent 不應包含任何決策邏輯。

```
❌ 錯誤設計：summarizer agent 同時負責「提取 + 去重 + 優先排序」
✅ 正確設計：
  - summarizer（機械式）：提取所有 JSON → 輸出完整列表
  - reviewer（決策）：由人工或決策 agent 過濾
```

**為什麼重要**：混入決策邏輯的機械式 agent 難以 debug（「它為什麼漏掉這條」），且無法在不同 context 下重用。

---

## Pattern 5：自主 Agent 可靠性

### 模型選擇（長時間 Loop）
- **Opus 4.6**：✅ 穩定遵守「LOOP FOREVER」指令（Karpathy 118 次實驗驗證）
- **較弱模型**：❌ 長時間後可能無法維持指令遵循

→ 長時間夜間 agent 應使用 Opus/Sonnet，不用 Haiku

### Context Compression 邊界
在自然任務邊界點做 compact，不要等到 token 耗盡：
```
一個里程碑完成 → compact → 繼續下一個
（不要連續跑直到 context 爆掉）
```

### 外部記憶持久化（SHARED_TASK_NOTES 模式）
長時間 agent 必須維護外部狀態檔案（不只依賴對話記憶）：

```markdown
# TASK_PROGRESS.md（agent 每輪更新）

## 已完成
- [x] 分析 9 個 API instincts → 提煉為 skill
- [x] 執行 eval：3/3 PASS

## 當前狀態
研究 multi-agent patterns 中...

## 下一步
1. 寫 skill 檔案
2. 建立 eval spec
3. 更新 MEMORY.md
```

**量化依據**：IBM 研究（2026）：agent 記憶萃取讓任務完成率 69.6% → 73.2%（+3.6%）

### Tool 描述品質 = 可靠性槓桿
- Tool 文件越精確，agent 成功率越高（Trace-Free+ 100+ tools 研究）
- 定期審查 instinct 的「觸發條件」，確保描述精準
- 考慮讓 agent 自動重寫/改進 tool 文件

---

## Pattern 6：Agentic Engineering 最佳實踐

### Simon Willison 三原則（2026 現場驗證）

1. **先讓 agent 探索工具**：
   ```
   Use `uvx my-tool --help` to learn about these tools first.
   ```
   - 不要假設 agent 知道私有/新工具的用法

2. **TDD + Agent = 最佳組合**（Pragmatic Summit 2026）：
   - 「Tests are no longer even remotely optional」
   - 先要求 agent 寫 failing tests → 再實作 → red-green
   - Tests 讓 agent 保持正確方向，成本接近零

3. **複合工程迴圈（Compound Engineering Loop）**：
   ```
   任務完成 → retrospective → 文件「什麼有效」
                                   ↓
                              注入未來 agent 指令（instincts/skills）
   ```
   - 每次互動都累積在 knowledge base 中
   - J-Assistant 的 nightly instinct evolve 是這個原則的系統化實作

### Agent-friendly 輸出格式
多 agent 協作時，log 格式很重要：
```bash
# ✅ Agent 可自動解析
ERROR: file.c:42: undefined variable 'foo'
TASK_COMPLETE: fix-memory-leak-str.c

# ❌ Agent 難以處理
Something went wrong somewhere in the file maybe around line 40ish
```

---

## Pattern 7：Writer/Reviewer 雙 Session

降低自我確認偏誤（confirmation bias）的核心模式。

### 方案：Session A 實作 → Session B 全新 context 做 review

```
Session A（Writer）：
  claude -p "Implement feature X" --allowedTools "Edit,Write,Bash"
  → 產出 code changes

Session B（Reviewer）：
  claude -p "Review the changes in @src/feature.ts" --allowedTools "Read,Grep,Glob"
  → 全新 context，不帶 Session A 的決策偏見
```

### 為什麼有效
- Session A 做完決策後，會傾向「確認自己的選擇是對的」
- Session B 從零開始看 code，更容易發現 A 忽略的問題
- Claude Code 官方最佳實踐（Section 16: Advanced Workflows）

### 使用時機
- 重要功能的 code review（不是 typo fix）
- 涉及安全、認證、資料庫 schema 等高風險改動
- forge-dev review 階段可考慮用獨立 session 驗證

### 注意事項
- Reviewer session 應**只有唯讀工具**（Read/Grep/Glob），不改 code
- 也可以反過來：A 寫測試 → B 寫實作（TDD 變體）

---

## 設計反模式

- ❌ **過度中心化**：用一個 orchestrator 管理所有 agent 任務（bottleneck + single point of failure）
- ❌ **硬編碼分工**：預先指定每個 agent 的角色（限制有機專業化）
- ❌ **機械式 agent 加入決策邏輯**（難以 debug 和重用）
- ❌ **不維護外部記憶**：只依賴對話歷史（compact 後遺失上下文）
- ❌ **跳過 tool 探索**：假設 agent 知道所有工具的用法
- ❌ **過度分派 subagent**：root agent 有足夠 token 時仍強制 dispatch subagent。
  Subagent 的核心價值是「保護 root context window」，不是分工。
  判斷準則：root agent 仍有 >40% context 空間 → 直接處理；
  否 → 考慮 dispatch（新 context window + 隔離 token 預算）。
  （Simon Willison，2026-03-17：「The main value of subagents is preserving the root context, not specialization」）

---

## 觸發場景

- 設計多個 Claude agent 並行工作的架構
- 夜間 batch 任務需要平行化
- 長時間自主 agent 出現可靠性問題
- 機械式 agent（summarizer/extractor）需要與決策 agent 分離
- 新專案引入 agent 輔助開發，選擇合適的 TDD 和 review 流程
