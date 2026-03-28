**語言：** [English](../../README.md) | [繁體中文](README.md) | [简体中文](../zh-CN/README.md)

# Homunculus for Claude Code

[![npm version](https://img.shields.io/npm/v/homunculus-code)](https://www.npmjs.com/package/homunculus-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.70+-blue)](https://docs.anthropic.com/en/docs/claude-code)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)

**別再調教你的 AI。讓它自己演化。**

<p align="center">
  <img src="https://github.com/user-attachments/assets/b3ce6017-02de-44a4-a3c6-8d45765c1693" alt="Homunculus Demo — goal setup + evolution cycle in 60 seconds" width="700">
</p>

你花了無數小時調整 prompt、撰寫規則、研究新功能、設定工具。Homunculus 反轉這一切：定義你的目標，系統會自行演化——skill、agent、hook、script，一切——而你只需專注在真正的工作上。

```bash
npx homunculus-code init
```

一行指令。定義你的目標。你的助理開始演化。

> **實證：** 一位開發者運行此系統 3 週，自動產生了 200 個行為模式，收斂為 10 個經過測試的 skill、5 個專門化 agent、17 個 command、以及 33 個自動化 script。夜間 agent 進行了 1,026 次自主 commit——在開發者睡覺時持續改善系統。[查看成果 →](#真實世界的成果)

---

## 為什麼需要

每個 Claude Code 進階使用者都會撞上同一面牆：

```
第 1 週：「Claude 太厲害了！」
第 2 週：「讓我加一些 rule 和 hook...」
第 3 週：「我需要 skill、agent、MCP server、自訂 command...」
第 4 週：「我花在設定 Claude 的時間比用它的時間還多。」
```

聽起來很熟悉？即使是 [OpenClaw](https://github.com/openclaw/openclaw)——擁有 300K+ 星星和自我擴展能力——仍然需要*你*來決定要改善什麼、何時改善、以及改善是否有效。編輯 `SOUL.md`、調整 `AGENTS.md`、搞壞了什麼、再開一個 AI session 來修。AI 可以擴展自身，但它無法設定自己的方向或驗證自身品質。

**這就是差異所在：**

```
Without Homunculus:                      With Homunculus:

  You notice tests keep failing          Goal tree detects test_pass_rate dropped
  → You research testing patterns        → Nightly agent auto-evolves tdd skill
  → You write a pre-commit skill         → Eval confirms 100% pass
  → You test it manually                 → Morning report: "Fixed. Here's what changed."
  → It breaks after a Claude update      → Next update? System re-evaluates and adapts
  → You fix it again...                  → You slept through all of this
```

---

## 核心理念：Goal Tree

大多數 AI 工具做局部最佳化——「你做了 X，所以我記住 X。」Homunculus 做**全域最佳化**——朝著你在 tree 中定義的目標前進：

```
🎯 my-project
├── code_quality — Ship fewer bugs
│   ├── testing — Maintain test coverage
│   │   └── realized_by: jest.config.js, tests/ (42 tests) ✓
│   └── linting — Consistent code style
│       └── realized_by: .eslintrc.js, .prettierrc ✓
├── speed — Move faster
│   └── deploy_automation — One-command deploys
│       └── realized_by: # will evolve ○
└── knowledge — Learn and remember
    ├── research — Discover better approaches
    │   └── realized_by: nightly agent ✓
    └── memory — Remember what matters
        └── realized_by: homunculus/instincts/ ✓
```

每個節點定義了**為什麼**存在、**如何**衡量、以及**什麼**目前在實作它。**目標是穩定的。實作會演化。** 系統自動將每個行為路由到最佳機制——實作被替換和升級，而目標保持不變。

<details>
<summary>📖 <code>architecture.yaml</code> 中的 goal 節點長什麼樣？</summary>

```yaml
# architecture.yaml — from the reference system
autonomous_action:
  purpose: "Act without waiting for human commands"
  goals:
    nightly_research:
      purpose: "Discover better approaches while developer sleeps"
      realized_by: heartbeat/heartbeat.sh        # a shell script
      health_check:
        command: "test $(find logs/ -mtime -1 | wc -l) -gt 0"
        expected: "nightly agent ran in last 24h"

    task_management:
      purpose: "Track and complete tasks autonomously"
      realized_by: quest-board/server.js          # a web app
      metrics:
        - name: forge_completion_rate
          healthy: "> 70%"

continuous_evolution:
  purpose: "Improve over time without human intervention"
  goals:
    pattern_extraction:
      purpose: "Learn from every session"
      realized_by: homunculus/scripts/evaluate-session.js
    skill_aggregation:
      purpose: "Converge patterns into tested skills"
      realized_by: homunculus/evolved/skills/
```

`realized_by` 欄位可以指向**任何東西**：

| 類型 | 範例 | 使用時機 |
|------|---------|-------------|
| Skill | `skills/tdd-workflow.md` | 行為知識 |
| Agent | `agents/code-reviewer.md` | 專門化 AI subagent |
| Hook | `hooks/pre-commit.sh` | 自動觸發 |
| Script | `scripts/deploy.sh` | Shell 自動化 |
| Cron | `launchd/nightly-check.plist` | 排程任務 |
| MCP | `mcp-servers/github` | 外部整合 |
| Rule | `rules/security.md` | Claude Code 行為規則 |
| Command | `commands/quality-gate.md` | Slash command 工作流 |

</details>

---

## 如何演化

```
          You use Claude Code normally
                      │
           ┌──────────┼──────────┐
           │          │          │
       Observe    Health Check   Research
       (hooks)    (goal tree)    (nightly)
           │          │          │
           └──────────┼──────────┘
                      │
                      ▼
               ┌────────────┐
               │  Evolve    │   Goals stay the same.
               │  ────────  │   Implementations get better.
               │  Extract   │
               │  Converge  │
               │  Eval      │
               │  Replace   │
               └────────────┘
```

**三個輸入，一個引擎：**

1. **觀察** — hook 監控你的工具使用，將反覆出現的模式提取為 "instinct"
2. **健康檢查** — goal tree 識別哪些目標不健康 → 聚焦於此
3. **研究** — 夜間 agent 掃描更好的方法並提出實驗

演化引擎接著：
- 提取行為模式 → **instinct**（標記最佳機制 + goal 路徑）
- 將每個 instinct 路由到最佳機制 → **hook、rule、skill、script、agent 或 system**
- 對於 skill：**eval → improve 迴圈**直到 100% 通過率
- 每晚檢視所有 goal → 目前的機制仍是最佳選擇嗎？
- Instinct 實作後歸檔 → 機制本身才是 source of truth

---

## 最新更新

### v0.9.0 — Evolution Engine 升級 (Mar 2026)

- **智慧觀察** — `observe.sh` 現在過濾雜訊（跳過 Read/Glob/Grep，寫入操作只記錄 post-phase）並追蹤引用頻率——哪些 instinct 和 skill 真正被讀取
- **三層提取** — `evaluate-session.js` 現在一次提取 instinct + memory 建議 + 研究主題。Memory 和研究寫入 `homunculus/reports/` 供你審閱（非侵入式）
- **語意去重** — 新 instinct 可以宣告 `supersedes` 自動歸檔被取代的舊 instinct
- **寫入門檻** — 提取 prompt 現在包含品質標準（必須改變未來行為、記錄承諾、或保存決策理由）
- **動態每日上限** — Instinct 提取上限隨 session 大小調整（短 session 1 個，長 session 最多 5 個）
- **更聰明的修剪** — `prune-instincts.js` 現在使用引用頻率評分（+25 常用、-15 從未引用）、3 層 skill 覆蓋偵測（直接演化 / 高重疊 / 部分）、14 天寬限期再開始信心衰退、以及 at-risk 預警
- **冪等性** — 提取追蹤掃描狀態，避免重複處理相同觀察
- **`--json` 輸出** — `prune-instincts.js` 支援 `--json` 供程式化使用

### v0.8.0 — 升級機制 (Mar 2026)

- **`homunculus-code upgrade`** — 升級 npm 套件時更新受管理檔案的新指令。核心 script（observe.sh 等）自動替換並備份為 `.bak`；command 和 rule 只在你未自訂時才替換——否則寫入 `.new` 檔供手動合併
- **安裝清單** — `init` 現在產生 `homunculus/.manifest.json` 追蹤所有受管理檔案的 SHA256 hash，實現安全的 diff-aware 升級

### v0.7.0 — 非侵入式安裝 & 主動性設計指南 (Mar 2026)

- **非侵入式安裝** — Script 現在放在 `homunculus/scripts/` 而非專案根目錄的 `scripts/`，避免與既有專案工具衝突
- **安全 command 安裝** — Slash command 逐檔安裝；既有 command 保留並顯示警告，不會被覆蓋
- **Hook 合併** — 如果 `.claude/settings.json` 中已有 `PostToolUse` hook，觀察 hook 會合併到陣列中，而非跳過整個設定
- **主動性設計指南** — 新增 [docs/proactivity.md](../../docs/proactivity.md) 涵蓋主動式 AI 助理的三個核心概念：Memory Flush、Research Queue、Periodic Heartbeat

### v0.6.3 — 專案感知目標 & 演化層級 (Mar 2026)

- **專案掃描** — `/hm-goal` 現在在提問前偵測你的技術堆疊、測試、CI 和目錄結構。Goal tree 從你已有的東西開始預填
- **通用機制路由** — `/evolve` 將 instinct 路由到最佳機制（hook、rule、skill、script、agent），不只是 skill
- **演化強度層級** — 在 `evolution-config.yaml` 中設定 `minimal` / `standard` / `full` 以控制深度、頻率和成本
- **夜間 agent 設定** — 首次執行 `/hm-night` 時正確提供自動夜間演化的設定選項

### v0.5.0 — 初始版本 (Mar 2026)

- **Goal tree** — 在 `architecture.yaml` 中定義你想要的
- **觀察 hook** — 自動從你的 session 中擷取行為模式
- **夜間演化** — `/hm-night` 執行健康檢查、提取 instinct、演化 skill、產生報告
- **6 個 slash command** — `/hm-goal`、`/hm-night`、`/hm-status`、`/evolve`、`/eval-skill`、`/improve-skill`

---

## 快速開始

### 1. 安裝

在你的專案目錄（有 `CLAUDE.md` 或 `.claude/` 的地方）執行：

```bash
npx homunculus-code init
```

```
Homunculus — Self-evolving AI Assistant

✓ Created homunculus/ directory structure
✓ Added evolution rules
✓ Copied evolution scripts
✓ Added slash commands (/hm-goal, /hm-night, /hm-status)
✓ Configured observation hook

Done! Homunculus is installed.

Next steps:
  1. Run claude to open Claude Code
  2. Type /hm-goal to define your goals (AI-guided)
  3. Type /hm-night to run your first evolution cycle
```

### 2. 定義你的目標

開啟 Claude Code 並輸入 `/hm-goal`。Claude 會先掃描你的專案，然後根據發現的內容提問：

```
> /hm-goal

Claude: I see a Next.js + TypeScript project with 42 Jest tests
        and GitHub Actions CI. What's the main purpose of this project?
You:    A SaaS dashboard for analytics

Claude: You have 42 tests already. Is test coverage a pain point,
        or is something else slowing you down more?
You:    Deployment is manual and error-prone

Claude: If your AI could fix one thing overnight, what would it be?
You:    Automated deployment with proper checks

Claude: Here's your goal tree:
        🎯 analytics-dashboard
        ├── code_quality — Ship fewer bugs
        │   ├── testing — Maintain test coverage
        │   │   └── realized_by: jest.config.js, tests/ (42 tests) ✓
        │   └── linting — Consistent code style
        │       └── realized_by: .eslintrc.js, .prettierrc ✓
        ├── deployment — Reliable releases
        │   └── ci_pipeline — Automated checks on every PR
        │       └── realized_by: .github/workflows/ ✓
        └── productivity — Move faster
            └── deploy_automation — One-command deploys
                └── realized_by: # will evolve ○

        4 goals: 3 already have implementations (✓), 1 will evolve (○)
        Does this look right?
You:    Great!

Claude: ✅ architecture.yaml created with 4 goals!
```

對於沒有既有檔案的新專案，Claude 會退回到詢問關於專案類型和目標的一般性問題。

### 3. 執行第一次演化循環

```
> /hm-night
```

觀看 Claude 檢查你的目標、將 instinct 路由到正確的機制（hook/rule/skill/script/agent）、評估和改善實作、並產生報告——全在一個指令中完成。這就是夜間 agent 在你睡覺時自主執行的內容。

### 4. 升級

新版本發布時，更新你的受管理檔案：

```bash
npx homunculus-code@latest upgrade
```

- **核心 script** → 自動替換（備份儲存為 `.bak`）
- **你未修改過的 command/rule** → 自動替換
- **你自訂過的 command/rule** → 跳過，新版本儲存為 `.new` 供你合併

### 5. 持續使用 Claude Code

觀察 hook 會自動監控你的使用。當模式浮現時，instinct 會被提取並路由到正確的機制：

```
/hm-goal        定義或調整你的目標
/hm-night       執行完整演化循環（可手動執行，但最佳方式是設為夜間 agent）
/hm-status      查看演化進度
```

`/hm-night` 執行完整的演化流程：將 instinct 路由到最佳機制（hook/rule/skill/script/agent）、對 skill 執行 eval + improve、檢視 goal 健康度、產生報告。你可以隨時手動執行，但真正的威力在於讓它每晚自主運行。

> 第一次執行 `/hm-night` 時，它會詢問你是否要設定夜間 agent 以進行自動夜間演化。

---

## 關鍵概念

### Goal Tree (`architecture.yaml`)

中樞神經系統。每個 goal 都有 purpose、metrics 和 health check。演化系統讀取它來決定**改善什麼**以及**如何衡量成功**。

### Instinct

從你的使用中自動提取的小型行為模式。每個 instinct 標記了：
- **信心分數** — 隨強化成長，隨時間衰退（半衰期：90 天）
- **建議機制** — 哪種實作類型最適合（hook/rule/skill/script/...）
- **Goal 路徑** — 這服務 tree 中的哪個 goal

把 instinct 想像成原料。它們被路由到正確的機制，實作後就歸檔。

### 實作路由

系統為每個行為選擇最佳機制：

| 行為類型 | 機制 |
|--------------|-----------|
| 確定性的、每次都要 | **Hook**（零 AI 判斷） |
| 綁定特定檔案/目錄 | **Rule**（path-scoped） |
| 可複用的知識集合 | **Skill**（含 eval spec） |
| 週期性自動化 | **Script + scheduler** |
| 外部服務連接 | **MCP** |
| 需要隔離 context | **Agent** |

### Skill & Eval Spec

當多個 instinct 覆蓋相同領域且路由結果是 "skill" 時，它們收斂為經過測試、有版本的知識模組。每個 skill 都有包含情境測試的 eval spec。未通過 eval 的 skill 會自動改善。

### 可替換實作

核心原則：**相同目標，演化的實作。**

```
Goal: "Catch bugs before merge"

  v1: instinct → "remember to run tests"
  v2: rule     → .claude/rules/testing.md (path-scoped guidance)
  v3: skill    → tdd-workflow.md (with eval spec)
  v4: hook     → pre-commit.sh (deterministic, automated)
```

系統每晚檢視這些——如果一個 skill 應該是 hook，它會建議升級。

---

## 夜間 Agent

這是讓系統真正自主的關鍵。夜間 agent 在你睡覺時自動執行 `/hm-night`——路由 instinct 到正確的機制、評估 skill、檢視 goal 健康度、研究更好的方法。

**設定：** 第一次執行 `/hm-night` 時，它會詢問是否啟用自動夜間執行。同意後，它會設定排程器（macOS 上用 `launchd`，Linux 上用 `cron`）每晚執行。

你也可以隨時手動執行 `/hm-night` 來觸發一次循環。

### 演化層級

透過 `evolution-config.yaml`（`init` 時建立）控制你的助理每晚演化的深度：

| | Minimal | Standard | Full |
|---|---------|----------|------|
| Instinct 收割 + 路由 | ✅ | ✅ | ✅ |
| Skill eval（僅變更的） | ✅ | ✅ | ✅ |
| 研究 | — | 2 個主題 | 3-5 個主題 |
| 實驗 | — | 每晚 1 個 | 每晚 3 個 |
| 額外迴圈 | — | — | 可選 |
| **預估成本/晚** | **~$0.5** | **~$2-3** | **~$5-10** |

每週深度模式（可設定日期）額外包含：全面 skill 重新評估、goal tree 機制審查、深度健康檢查。

```bash
# 隨時更改層級
# 編輯 evolution-config.yaml → tier: minimal | standard | full
```

訂閱用戶（Max/Team）可以無額外 API 成本執行 `full`。

```
 You go to sleep
        │
        ▼
 ┌─────────────────────────────────────────────┐
 │  Nightly Agent (phase pipeline)             │
 │                                             │
 │  1. Health check (goal status)              │
 │                                             │
 │  2. Evolution cycle                         │
 │    Route instincts → 8 mechanisms           │
 │    Eval + improve implementations           │
 │    Review: best mechanism per goal?         │
 │                                             │
 │  3. Research (cross-night dedup)            │
 │                                             │
 │  4. Act (experiments + quick fixes)         │
 │                                             │
 │  5. Report + sync                           │
 └─────────────────────────────────────────────┘
        │
        ▼
 You wake up to a smarter assistant + a report
```

**以下是真實的早報範例：**

```markdown
## Morning Report — 2026-03-22

### What Changed Overnight
- Improved skill: claude-code-reference v4.6 → v4.8
  (added coverage for CC v2.1.77-80 features)
- Archived 3 outdated instincts (covered by evolved skills)
- New experiment passed: eval noise threshold set to 5pp

### Goal Health
- continuous_evolution:  ✅ healthy (10 skills, all 100% eval)
- code_quality:          ✅ healthy (144/144 tests passing)
- resource_awareness:    ⚠️ attention (context usage trending up)
  → Queued experiment: split large skill into chapters

### Research Findings
- Claude Code v2.1.81: new --bare flag could speed up headless mode
  → Experiment queued for tomorrow night
- New pattern detected in community: writer/reviewer agent separation
  → Instinct created, will converge if reinforced

### Suggested Actions (for you)
- Review 2 knowledge card candidates from overnight research
- Approve experiment: context reduction via skill splitting
```

在我們的參考系統中，夜間 agent 產生了 **1,026 次自主 commit**——路由 instinct 到正確的機制、演化 skill、執行實驗、研究更好的方法、歸檔過時的模式。全部無需任何人為輸入。

夜間 agent 是將 Homunculus 從「你使用的工具」變成「自己成長的系統」的關鍵。

詳見 [docs/nightly-agent.md](../../docs/nightly-agent.md) 了解設定方式。

---

## 真實世界的成果

在真實的個人 AI 助理上建置和測試。**3 週**內（從零開始）：

| 演化的產物 | 數量 | 詳細 |
|-------------|-------|---------|
| Goal tree | **10 個 goal / 46+ 個子目標** | 每個都有 health check 和 metrics |
| Instinct | **200** | 35 個活躍 + 165 個自動歸檔（系統自我修剪） |
| Skill | **10** | 全部 100% eval 通過率（179 個測試情境） |
| 實驗 | **15** | 結構化 A/B 測試，含通過/失敗追蹤 |
| Subagent | **5** | 從重複的主執行緒模式中自動提取 |
| 排程 agent | **5** | 夜間 heartbeat、Discord bridge、每日新聞、交易 × 2 |
| Hook | **12** | 觀察、壓縮、品質門檻 |
| Script | **33** | Session 生命週期、健康檢查、演化報告 |
| Slash command | **17** | 工作流自動化（forge-dev、quality-gate、eval...） |
| Rule | **7** | 核心模式、演化系統、知識管理 |
| ADR | **9** | 架構決策記錄 |
| 總 commit 數 | **1,505+** | 大部分由夜間 agent 自動完成 |

夜間 agent 單獨貢獻：**1,026 次自主 commit**。

系統甚至演化出了自己的任務管理面板：

<table align="center">
  <tr>
    <td><img src="https://github.com/user-attachments/assets/5828b1e7-5808-478d-9340-505480a41a2c" alt="Jarvis Dashboard" width="520"></td>
    <td><img src="https://github.com/user-attachments/assets/69c397ab-dde7-4dae-968b-9f7cf9b24e01" alt="Quest Board" width="200"></td>
  </tr>
  <tr>
    <td align="center"><em>Jarvis Dashboard</em></td>
    <td align="center"><em>Quest Board</em></td>
  </tr>
</table>

[查看完整參考實作 →](../../examples/reference/)

---

## 與其他工具的差異

| | Homunculus | OpenClaw | Cursor Rules | Claude Memory |
|---|---|---|---|---|
| **目標驅動** | Goal tree + metrics + health check | 否 | 否 | 否 |
| **從使用中學習** | 自動觀察 → instinct → 8 種機制 | 自我擴展 | 手動 | 自動記憶 |
| **品質控管** | Eval spec + 情境測試 | 無 | 無 | 無 |
| **自主夜間運作** | 夜間 agent：eval + improve + 研究 + 實驗 | 否 | 否 | 否 |
| **自我改善** | Eval → improve → replace 迴圈 | 部分 | 否 | 否 |
| **元演化** | 演化機制自身也在演化 | 否 | 否 | 否 |
| **實作無關** | Skill、agent、hook、script、MCP、cron... | 僅 Skill | 僅 Rule | 僅 Memory |

OpenClaw 擅長自我擴展。Homunculus 更進一步：它根據 goal 健康度決定*要改善什麼*、用 eval *驗證*改善、並在夜間*自主*完成一切。兩者解決不同問題。OpenClaw 是強力工具。Homunculus 是演化的作業系統。

---

## 產生的檔案結構

`npx homunculus-code init` 之後：

```
your-project/
├── architecture.yaml           # 你的 goal tree（大腦）
├── evolution-config.yaml       # 層級 + 預算設定
├── homunculus/
│   ├── instincts/
│   │   ├── personal/           # 自動提取的模式
│   │   └── archived/           # 自動修剪的舊模式
│   ├── evolved/
│   │   ├── skills/             # 收斂、經測試的知識
│   │   ├── agents/             # 專門化 subagent
│   │   └── evals/              # Skill 評估規格
│   ├── experiments/            # A/B 測試追蹤
│   ├── reports/                # 演化循環報告
│   └── scripts/
│       ├── observe.sh          # 觀察 hook
│       ├── evaluate-session.js # 模式提取
│       └── prune-instincts.js  # 自動清理
├── .claude/
│   ├── rules/
│   │   └── evolution-system.md # Claude 應如何演化
│   └── commands/
│       ├── hm-goal.md          # /hm-goal — 定義或檢視目標
│       ├── hm-night.md         # /hm-night — 執行演化循環
│       ├── hm-status.md        # /hm-status — 演化儀表板
│       ├── eval-skill.md       # /eval-skill
│       ├── improve-skill.md    # /improve-skill
│       └── evolve.md           # /evolve
└── .gitignore                  # 排除 runtime 資料
```

---

## 進階：元演化

演化機制本身也在演化：

- **Instinct 存活率**太低？→ 自動提高提取門檻
- **Eval discrimination** 太低？→ 加入更難的邊界情境
- **Skill 收斂**太慢？→ 調整聚合觸發條件
- **機制覆蓋率**低？→ 標記僅依賴 prompt 的 goal 以進行升級
- **Dispatch 合規率**偏低？→ 檢視 agent dispatch 是否遵循 token 決策樹

透過五個指標追蹤：
1. `instinct_survival_rate` — 存活超過 14 天的 instinct 百分比
2. `skill_convergence` — 從第一個 instinct 到演化出 skill 的時間
3. `eval_discrimination` — 實際能區分版本差異的 eval 情境百分比
4. `mechanism_coverage` — 擁有非 prompt 實作的 goal 百分比
5. `compliance_rate` — 在適當 context 壓力下執行的 agent dispatch 百分比

---

## 系統需求

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) v2.1.70+
- Node.js 18+
- macOS 或 Linux

---

## 常見問題

<details>
<summary><strong>這只能用在 Claude Code 上嗎？</strong></summary>

概念（goal tree、eval 驅動演化、可替換實作）不依賴特定工具。目前的實作針對 Claude Code 的 hook 和 command，但核心流程可以適配到其他 AI 框架。
</details>

<details>
<summary><strong>需要額外的 API 費用嗎？</strong></summary>

觀察 hook 很輕量（無 API 呼叫）。Instinct 提取每個 session 使用一次短 Claude 呼叫（約 $0.01）。夜間 agent 是可選的且可設定預算。
</details>

<details>
<summary><strong>可以保留我既有的 CLAUDE.md 和 rule 嗎？</strong></summary>

可以。`npx homunculus-code init` 在不覆蓋既有檔案的情況下加入你的專案。你目前的設定會成為演化的起點。
</details>

<details>
<summary><strong>這和 Claude Code 內建的 memory 有什麼不同？</strong></summary>

Claude 的 memory 記錄事實。Homunculus 演化*行為*——經過測試的 skill、自動化 hook、專門化 agent——全部由你定義的目標驅動，並有品質門檻防止退化。
</details>

<details>
<summary><strong>這和 OpenClaw 有什麼不同？</strong></summary>

OpenClaw 擅長自我擴展。Homunculus 解決不同的問題：自主、目標導向的演化。它決定什麼需要改善（透過 goal 健康度）、驗證改善（透過 eval）、並在夜間完成工作（透過夜間 agent）。你可以兩者並用：OpenClaw 做隨需能力擴展、Homunculus 做上層的自主演化。
</details>

<details>
<summary><strong>啟動時看到 hook 錯誤（SessionStart / Stop）</strong></summary>

那些來自你自己的使用者層級 hook（`~/.claude/settings.json`），不是 Homunculus 的。如果你的 hook 使用相對路徑如 `node scripts/foo.js`，它們會在沒有那些 script 的專案中失敗。修復方式是加入防護：

```json
"command": "test -f scripts/foo.js && node scripts/foo.js || true"
```

Homunculus 只會將 hook 加入專案層級的 `.claude/settings.json`。
</details>

---

## 部落格文章

- [Stop Tuning Your AI. Let It Tune Itself.](../../docs/stop-tuning-your-ai.md) — Homunculus 背後的故事，以及為什麼 goal tree 比手動設定更好。

---

## 理念

> 「你的 AI 助理應該是一顆種子，而不是一座雕像。」

別再把晚上的時間花在調教 AI 上。種下一顆種子，定義你的目標，讓它成長。你使用得越多，它就越好——而且它會透過 eval 分數、goal 健康檢查和早報，清楚地告訴你它如何改善以及為什麼。

---

## 致謝

Homunculus 建立在以下專案和研究的理念之上：

- **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)** — Continuous Learning 模式和 Skill Creator 的 eval → improve 迴圈。Homunculus 採納並延伸這些，成為目標樹驅動的自主演化系統。
- **[OpenClaw](https://github.com/openclaw/openclaw)** — 證明 AI 助理可以擴展自身能力。Homunculus 增加了目標方向、eval 品質門檻、以及自主夜間運作。
- **[Karpathy's Autoresearch](https://x.com/karpathy)** — 證明 AI 可以執行自主實驗迴圈（118 次迭代、12+ 小時）。啟發了夜間 agent 的研究循環。
- **[Anthropic's Eval Research](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)** — Eval 方法論、雜訊容忍度（±6pp）、以及 pass@k / pass^k 指標。

---

## 貢獻

詳見 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 授權

MIT

---

**由 [Javan](https://github.com/JavanC) 和他的自我演化 AI 助理共同建造。**
