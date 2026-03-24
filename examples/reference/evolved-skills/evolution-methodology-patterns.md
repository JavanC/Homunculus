# Skill: Evolution Methodology Patterns

**Version:** 1.1
**Icon:** meteorite
**Abbr:** EvoMethod
**Evolved from:**
- `ai-eval-design-principles-2026.md` (0.92)
- `eval-awareness-adversarial-scenarios-2026.md` (0.88)
- `dual-skill-analysis-generation-2026.md` (0.85)
- `autoresearch-automated-experiments-2026.md` (0.82)
- `eval-gaming-awareness-2026.md` (0.78)
- `model-self-evaluation-instinct-quality-2026.md` (0.72)

**Use when:** 設計或改善演化系統的 eval pipeline、instinct 品質評估、自主實驗迴圈、skill 演化決策

---

## 模式 1：Eval 抗 Gaming 設計

```yaml
# 弱 eval（容易被 AI 識別為測試）：
expected: "輸出正確字串"

# 強 eval（測試推理判斷力）：
expected_behavior: |
  Agent 說明「為何選擇這個而非那個」
  情境改變時能調整策略
anti_patterns:
  - "直接輸出正確答案但無推理過程"
```

**規則：**
- scenario 不要暴露 skill name 或「這是測試」的線索（eval awareness 風險）
- 測判斷力不測記憶：anti_patterns 比 expected_behavior 更重要
- `--tools Read,Write,Bash` 限制 eval 環境（阻斷 web 查詢答案路徑）
- 每個 skill 至少 20% boundary scenarios（「不適用時機」「常見誤用」）
- `min_significant_delta: 5pp`（低於此的分數差距可能是噪音，不是真實變化）

---

## 模式 2：Eval Discrimination 監控

```
discrimination = boundary_scenarios_correct / total_boundary_scenarios

目標：per-skill discrimination > 25%
全局 discrimination > 30%
```

**規則：**
- Discrimination 衡量 eval 是否能區分「真正會用 skill」和「碰巧答對」
- 全 100% pass rate 的 eval 可能是 grader 太寬鬆，不是 skill 太好
- 定期加入 boundary scenarios 防止 eval saturation（全過 → 失去改進訊號）
- Per-skill 自適應閾值：穩定 skill（SD=0）用 3pp delta、高波動 skill 用 8pp delta

---

## 模式 3：Autoresearch 實驗迴圈

```
研究來源 → 識別 gap → 設計假設
    ↓
寫入 experiments/queue.jsonl
    ↓
P3 執行實驗 → pass/fail
    ↓
Passed 實驗 → autoresearch-derive.js
    ↓
衍生假設 → 加回 queue.jsonl（閉環）
```

**規則：**
- 假設必須有 `success_criteria`（量化，非「看起來有用」）
- 實驗結果 merge 前必須有 regression check
- 衍生假設由 Haiku 生成（成本低），但實驗本身用 Sonnet（品質高）
- 佇列上限 ~20 個，超過時按 priority 排序裁剪

---

## 模式 4：雙模型分析+生成

```bash
# 步驟 1：Sonnet 做結構化分析
ANALYSIS=$(unset CLAUDECODE; claude --print \
  --model claude-sonnet-4-6 \
  --output-format json \
  "分析以下資料，輸出 JSON：strengths, weaknesses, opportunities" \
  < "$INPUT")

# 步驟 2：Sonnet 根據分析做創意生成
RESULT=$(unset CLAUDECODE; claude --print \
  --model claude-sonnet-4-6 \
  --resume "$SESSION" \
  "根據分析結果，生成 3 個改進方案")
```

**規則：**
- 分析和生成拆成兩次呼叫，效果顯著優於單次
- 分析步驟用 `--json-schema` 約束輸出結構
- 生成步驟用 `--resume` 保留分析 context
- Haiku 適合 classify/extract，Sonnet 適合 reason/create

---

## 模式 5：Instinct 品質自評

```
統計指標（reference count, confidence decay）
    + LLM 自評（這個 instinct 會改變未來行為嗎？）
    = 升降級決策
```

**Write-gate 五條件**（任一為 true 才值得保留）：
1. 改變未來行為（觸發不同的工具選擇或流程）
2. 他人依賴的承諾（被 skill 或 prompt 引用）
3. 值得記錄推理的決策（為什麼選 A 不選 B）
4. 穩定可重現的事實（不會隨時間變化）
5. 明確的用戶指令（用戶說「記住這個」）

**規則：**
- 純統計（reference count）不夠 — 低引用但改變行為的 instinct 很有價值
- LLM 自評不要問「這個好不好」，問「刪掉後會少什麼能力」
- Archive 不是刪除 — archived instincts 仍可被搜尋

---

## 決策樹：Implementation Routing（行為 → 最佳實作機制）

給定一個行為描述（instinct、用戶需求、goal gap），選擇最適合的實作機制：

```
這個行為是確定性的嗎？（每次都要、不需要 AI 判斷）
├── 是 → Hook（PreToolUse / PostToolUse / SessionStart / Stop）
│   例：Edit 後跑 lint、session 結束自動 commit
│   ❌ 不用 Skill（Skill 靠 AI 記住，會退化）
│
└── 否 → 需要 AI 判斷
    │
    這個行為跟特定檔案/目錄相關嗎？
    ├── 是 → Rule（.claude/rules/，path-scoped）
    │   例：碰到 quest-board/ 時用 TDD、碰到 knowledge-cards/ 時用 Zettelkasten 格式
    │   ❌ 不用 CLAUDE.md（會膨脹 + 每 session 都載入）
    │
    └── 否 → 通用行為
        │
        每個 session 都需要嗎？
        ├── 是 → CLAUDE.md（永遠載入的核心規則，< 200 行）
        │   例：用繁體中文、優先 CLI 不用 MCP
        │   ❌ 不用 Rule（Rule 是 path-scoped，不是 always-on）
        │
        └── 否 → 按需觸發
            │
            是可重用的知識集合嗎？（多個模式 + 決策樹 + 反模式）
            ├── 是 → Skill（按需載入，低 context 成本）
            │   例：shell 自動化模式、TDD 工作流
            │   ❌ 不用 CLAUDE.md（太大會 context rot）
            │
            └── 否 → 自動化 or 外部連接
                │
                需要定期自動執行嗎？
                ├── 是 → Script + launchd（排程自動化）
                │   例：每日快照、每週 prune、heartbeat check
                │   ❌ 不用 Hook（Hook 是 session 觸發不是時間觸發）
                │
                └── 否
                    │
                    需要連接外部服務嗎？
                    ├── 是 → MCP（外部服務橋接）
                    │   例：QMD 語意搜尋、mac-use 原生 App 控制
                    │   ❌ CLI 能做的不用 MCP（CLI 更省 context）
                    │
                    └── 需要隔離 context 或專家角色？
                        ├── 是 → Agent（subagent 定義）
                        │   例：tdd-runner、shell-debugger、assistant-explorer
                        │   ❌ root context 充足時不 dispatch（overhead 不划算）
                        │
                        └── 基礎設施級別
                            → System（server/DB/bridge/launchd service）
                            例：quest-board server、Discord bridge、daily-news
```

### 各機制適用場景速查

| 機制 | 適用 | 不適用 |
|------|------|--------|
| **Hook** | 確定性、每次都要、零 AI 判斷 | 需要推理、條件複雜 |
| **Rule** | path-scoped 行為指引、特定目錄的規範 | 全局規則、非檔案相關 |
| **CLAUDE.md** | 永遠生效的核心規則、角色定義 | > 200 行、領域特定知識 |
| **Skill** | 可重用知識集合、決策樹、多模式彙整 | 確定性行為、一次性操作 |
| **Script+launchd** | 定期自動執行、無需 AI 判斷的自動化 | 需要互動、session 內觸發 |
| **MCP** | 外部服務連接、持久連線 | CLI 能做的事（gh/jq/curl） |
| **Agent** | 隔離 context、專家角色、平行執行 | 簡單任務、root context 充足 |
| **System** | 基礎設施、always-on 服務 | 一次性需求 |

---

## 決策樹：演化方向選擇

```
Instinct 累積後怎麼演化？
├── 先用 Implementation Routing 判斷最適機制
│   ├── 結果是 Hook → 寫 hook + 歸檔 instinct
│   ├── 結果是 Rule → 寫 rule + 歸檔 instinct
│   ├── 結果是 Skill → 走下面的 Skill 聚合流程
│   └── 結果是其他 → 實作對應機制 + 歸檔 instinct
│
└── Skill 聚合流程：
    有多個 instincts 聚集在同一 goal？
    ├── 是（≥5 個）→ 考慮聚合成新 Skill
    │   ├── 已有覆蓋的 skill？→ 擴展現有 skill
    │   └── 沒有？→ 建立新 skill（checklist 見下方）
    └── 否 → 保持 instinct，等累積更多

Skill eval 全 100%？
├── 是 → 加 boundary scenarios 防 saturation
└── 否 → 先修到 100% 再加難度

Discrimination < 25%？
├── 是 → 加「不適用時機」scenario
└── 否 → 維持

實驗 pass 但 metric 變化 < 5pp？
├── 是 → 可能是噪音，不 merge，記錄觀察
└── 否 → Merge + 更新 skill version
```

## 新 Skill Checklist

建立新 skill 時必須包含：
1. **Frontmatter**：Version, Icon（必須來自 `quest-board/web/assets/icons/game-skill/*.png`，不重複）, Abbr, Use when
2. **Eval spec**：`homunculus/evolved/evals/<name>.eval.yaml`，至少 20% boundary scenarios
3. **跑 eval**：首次 eval 並記錄到 `history.jsonl`
4. **更新索引**：CLAUDE.md skill 列表 + MEMORY.md skill 清單
5. **可用 icon**：`ls quest-board/web/assets/icons/game-skill/` 查看，已用的不要重複
