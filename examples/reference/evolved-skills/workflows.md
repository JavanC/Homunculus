# Skill: Workflows

**Version:** 1.2
**Icon:** wind-1
**Abbr:** Workflows
**Evolved from:** Phase 1 Discord Bridge 開發中的架構領悟 — 「流程是知識，不是基礎設施」
**Evolved:** 2026-03-14
**Use when:** 判斷該用哪個標準 workflow：forge-dev 開發流、研究任務、skill evolution、系統性 debug vs 孤立 bug

## 用途

定義小J助理的常用工作流模板。當用戶觸發對應情境時，自動依循流程執行。
Workflow 只定義**重複性流程**，一次性或高度隨機的互動不套用。

---

## 核心原則

1. **流程是知識，不是程式碼**：不需要 workflow engine，agent 讀到就會做
2. **只管步驟，不限細節**：每個步驟怎麼做由 agent 當下判斷
3. **可跳步**：用戶明確說「不用 X」就跳過，不死板
4. **自然演化**：用了幾次發現缺步驟或多餘步驟，直接更新此 skill

## 使用追蹤

**[MUST]** 完成任何 workflow 後，**靜默** POST 記錄（不需要告訴用戶）。這是數據驅動演化的基礎 — 沒有記錄就無法分析哪些 workflow 需要改進。

```bash
curl -sf http://localhost:3000/api/workflow/log -X POST -H 'Content-Type: application/json' -d '{
  "workflow": "<workflow-id>",
  "steps_completed": ["step1", "step2"],
  "steps_skipped": ["step3"],
  "outcome": "success|partial|failure|aborted"
}' > /dev/null 2>&1
```

Workflow ID 對應：`research` / `study` / `feature-dev` / `project-init` / `learning-path` / `tech-eval` / `debug` / `daily-review`

**Subagent tracking 已自動化**：observe.sh hook 在每次 Agent tool 呼叫後自動 POST `/api/subagent/log`，不需要手動記錄。

---

## Workflow 1：技術研究（Research）

**觸發**：收到 URL、「研究 X」、「X 是什麼」、「幫我看看這個」

**步驟**：
1. 抓取/搜尋內容（WebFetch / WebSearch）
2. 摘要：主題（1-2 句）+ 關鍵要點（3-5 點）+ 來源
3. **Goal 適用性評估**：對照 `architecture.yaml` 目標樹，分類為：
   - `[informational]` — 有趣但不直接影響系統
   - `[adoptable]` — 可直接納入，標記 `affected_goals: [goal.path]`
   - `[testable]` — 需實驗驗證，標記 `affected_goals` + 建議實驗
   - `[irrelevant]` — 與系統目標無關
4. 如果值得記住 → 更新 research-notes memory
5. 如果 adoptable → 建議開 Forge（標明服務哪個 goal）
6. 如果 testable → 建議實驗（寫入 experiments/queue.jsonl）
7. **如果值得沉澱為知識** → 產出知識卡片到 `knowledge-cards/candidates/`（或用 `/study` 深度研究）

**產出**：摘要回覆 + 分類標記 + 可選的 memory 更新 + 可選的行動建議 + 可選的知識卡片

**判斷是否產出知識卡片**：
- 有具體案例、數據、機制可拆解 → 產出卡片
- 純概念問答或與 Javan 領域無關 → 不產出

**不套用**：單純的「X 是什麼」知識問答（直接回答就好）

---

## Workflow 2：功能開發（Feature Dev）

**觸發**：「做 X 功能」、「修這個 bug」、「加一個 API」、Forge 任務開發

**步驟**：
1. 讀取相關檔案，確認現有架構
2. **前置評估** → `/forge-dev evaluate`（goal 定位 + impact 預判 + 成本合理性 → proceed/defer/reject）
3. 如果是 Forge 且沒有 AC → `/forge-dev define-ac`（參考 evaluate 的預期變更清單，標記 `[testable]`/`[manual]`）
4. **[optional]** 如果有 `[testable]` AC → `/forge-dev gen-tests`（生成測試，確認 RED）— 實際多數情況直接在紅綠迴圈中寫測試
5. 實作改動（有測試 → 紅綠迴圈；無測試 → 直接實作）
6. 語法預檢（`node -c`、`zsh -n`、`jq empty` 等）
7. 服務重啟（如果改了跑中的服務）
8. 端點/功能驗證：`[testable]` AC 跑 `node --test`、`[manual]` AC 手動驗證
9. **系統整合** → `/forge-dev complete`（architecture.yaml + CLAUDE.md + health_check + test 指標同步）
10. 回報結果

**產出**：可用功能 + 測試通過 + 驗證結果 + 系統一致性確認

**已有支撐**：`/forge-dev` command、`development-verification-patterns` skill、`tdd-workflow` skill

---

## Workflow 3：開啟項目（Project Init）

**觸發**：「開個項目追蹤 X」、「我想長期做 X」、「這個值得開項目」

**步驟**：
1. 建立 `~/assistant/projects/{slug}/README.md`（目標、背景、里程碑）
2. 建立 Forge 任務（或多個，依規模拆分）
3. 問用戶要不要在 Discord 開 thread 做長期討論
4. 更新 memory 索引（如果是重要項目）

**產出**：項目目錄 + Forge 任務 + 可選的 Discord thread

---

## Workflow 4：學習計劃（Learning Path）

**觸發**：「我想學 X」、「幫我規劃學 X」

**步驟**：
1. 快速研究 X 的學習路徑（搜尋 + 自身知識）
2. 依照 Project Init workflow 建立項目
3. 拆成 3-5 個里程碑（由淺到深）
4. 建議第一步（具體、可執行）
5. 設定 check-in 頻率（每週？每天？）

**產出**：學習項目 + 里程碑 Forge + 第一步行動

---

## Workflow 5：技術評估（Tech Eval）

**觸發**：「X 值得用嗎」、「X 跟 Y 比哪個好」、「要不要換成 X」

**步驟**：
1. 快速研究 X（官方文檔 + 社群評價）
2. 跟現有系統/方案比較（功能、成本、複雜度）
3. **Goal 適用性評估**：標記 `affected_goals` + 分類（adoptable/testable/informational）
4. 明確結論：採用 / 不採用 / 觀望
5. 如果採用 → 建議具體行動（Forge，標明服務哪個 goal）
6. 記入 research-notes（不論結論，留作知識儲備）

**產出**：評估結論 + 分類標記 + 行動建議 + memory 更新

---

## Workflow 6：系統除錯（Debug）

**觸發**：「X 壞了」、「這個 error 怎麼回事」、服務異常

**步驟**：
1. 查看相關 log（`/tmp/*.log`、`heartbeat/logs/`）
2. 定位根因（不要急著修，先理解）
3. 修復
4. 驗證修復有效
5. 判斷是否系統性問題 → 決定是否加防護：

   **系統性問題（應加防護）**：
   - 邊界條件可重現：空檔案、null 值、網路逾時、並發衝突
   - 根因是外部輸入或環境不確定性（非 typo）
   - 影響多個呼叫路徑或會反覆觸發
   - 例：空 state.json → `jq '.x // []'`；API timeout → retry + fallback

   **孤立 bug（修完即可）**：
   - 邏輯錯誤、typo、hardcoded 值錯誤
   - 有明確的「不應該發生這種情況」的前提
   - 修完後不會在正常使用中再次出現
   - 例：API path 拼錯、filter 條件相反

**產出**：問題修復 + 根因說明 + 可選的防護措施

---

## Workflow 7：每日回顧（Daily Review）

**觸發**：夜間 heartbeat P1 / 用戶問「今天做了什麼」

**步驟**：
1. 讀取當天 session summaries
2. 統計：sessions 數、工具使用、主要工作項目
3. 評估未完成的任務，標記需延續的
4. 識別可擷取的 instinct（信心 > 0.7）
5. 寫入 night report 或直接回覆

**產出**：回顧摘要 + instinct 候選

---

## 不適合 Workflow 的場景

以下情境**不要套用 workflow**，直接靈活回應：
- 一般閒聊、腦力激盪（`#general` 頻道日常）
- 一次性快問快答（「X 多少錢」「翻譯這句」）
- 大型架構決策（需要深度推理，固定步驟反而限制思考）
- 跨 session 的開放式探索（沒有明確完成標準）

---

## Eval Spec

### Scenario 1: URL 研究觸發
**Input:** 用戶貼了一個技術文章 URL
**Expected:** 依循 Workflow 1 — 摘要 + 關聯性評估 + 必要時更新 memory
**Criteria:** 有摘要、有與系統關聯的評估、不做無謂的 Forge 建議
**Rating:** ⭐ 完整流程 / ✅ 有摘要但缺評估 / ❌ 只貼連結內容

### Scenario 2: 開項目請求
**Input:** 「幫我開個項目追蹤 Rust 學習」
**Expected:** 依循 Workflow 3+4 — 建目錄 + README + Forge + 里程碑 + 建議第一步
**Criteria:** 有 projects/ 目錄、有 Forge 任務、有具體下一步
**Rating:** ⭐ 完整 / ✅ 有目錄但缺里程碑 / ❌ 只回覆「好的」

### Scenario 3: 技術評估
**Input:** 「Bun 值得用來替換 Node 嗎？」
**Expected:** 依循 Workflow 5 — 研究 + 比較 + 明確結論 + 行動建議
**Criteria:** 有對比表、有結論、結論有理由支撐
**Rating:** ⭐ 完整 / ✅ 有結論但缺比較 / ❌ 模糊回覆

### Scenario 4: 不該套用 workflow
**Input:** 「今天晚餐吃什麼好？」
**Expected:** 直接輕鬆回答，不套用任何 workflow
**Criteria:** 自然回覆、不出現「步驟 1」之類的結構
**Rating:** ⭐ 自然回覆 / ❌ 硬套 workflow

### Scenario 5: Debug 流程
**Input:** 「heartbeat 好像沒有跑，幫我看看」
**Expected:** 依循 Workflow 6 — 查 log → 定位 → 修復 → 驗證
**Criteria:** 先查 log 不急著猜、修完有驗證
**Rating:** ⭐ 完整 / ✅ 有修但沒驗證 / ❌ 盲猜修改

### Scenario 6: 功能開發
**Input:** 「在 Quest Board 加一個 /api/stats endpoint」
**Expected:** 依循 Workflow 2 — 讀架構 → 實作 → 預檢 → 重啟 → 驗證
**Criteria:** 有語法檢查、有服務重啟、有端點測試
**Rating:** ⭐ 完整 / ✅ 能用但跳過驗證 / ❌ 寫完就走

### Scenario 7: 案例研究產出知識卡片 (boundary)
**Input:** 「研究這個：<URL to a detailed Stripe Agent Toolkit article>」
**Expected:** 依循 Workflow 1 步驟 1-7 — 摘要 + 評估 + 產出知識卡片到 candidates/
**Criteria:** 有卡片（正確 frontmatter + connections）、有確認摘要、卡片在 candidates/ 不在 cards/
**Rating:** ⭐ 完整卡片+摘要 / ✅ 有摘要但沒產卡片 / ❌ 只貼內容

### Scenario 8: 一般研究不產卡片 (boundary)
**Input:** 「台灣明天天氣怎樣」
**Expected:** 直接回答，不產出知識卡片
**Criteria:** 不產出卡片、不走完整 research workflow
**Rating:** ⭐ 直接回答 / ❌ 硬產卡片
