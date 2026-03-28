**语言：** [English](../../README.md) | [繁體中文](../zh-TW/README.md) | [简体中文](README.md)

# Homunculus for Claude Code

[![npm version](https://img.shields.io/npm/v/homunculus-code)](https://www.npmjs.com/package/homunculus-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.70+-blue)](https://docs.anthropic.com/en/docs/claude-code)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)

**别再调教你的 AI。让它自己进化。**

<p align="center">
  <img src="https://github.com/user-attachments/assets/b3ce6017-02de-44a4-a3c6-8d45765c1693" alt="Homunculus Demo — goal setup + evolution cycle in 60 seconds" width="700">
</p>

你花了大量时间调整 prompt、编写规则、研究新功能、配置工具。Homunculus 颠覆了这个模式：定义你的目标，系统自己进化——skill、agent、hook、script，一切——而你只需专注于实际工作。

```bash
npx homunculus-code init
```

一条命令。定义你的目标。你的助手开始进化。

> **实际验证：** 一位开发者运行了这个系统 3 周。它自动生成了 190 个行为模式，汇聚成 10 个经过测试的 skill，创建了 3 个专业 agent、15 个命令和 24 个自动化脚本。夜间 agent 进行了 368 次自主 commit——在开发者睡觉时持续改进系统。[查看成果 →](#实际成果)

---

## 为什么需要它

每个 Claude Code 资深用户都会遇到同样的瓶颈：

```
第 1 周：「Claude 太棒了！」
第 2 周：「让我加一些规则和 hook...」
第 3 周：「我需要 skill、agent、MCP server、自定义命令...」
第 4 周：「我花在配置 Claude 上的时间比实际使用还多。」
```

听起来很熟悉？即使是 [OpenClaw](https://github.com/openclaw/openclaw)——拥有 300K+ star 和自扩展能力——仍然需要*你*来决定改进什么、何时改进、以及改进是否有效。编辑 `SOUL.md`、调整 `AGENTS.md`、搞坏了什么、再开一个 AI session 来修复。AI 可以扩展自己，但它无法设定自己的方向或验证自己的质量。

**关键区别在于：**

```
没有 Homunculus：                        有了 Homunculus：

  你发现测试不断失败                      目标树检测到 test_pass_rate 下降
  → 你研究测试模式                        → 夜间 agent 自动演化 tdd skill
  → 你编写一个 pre-commit skill           → Eval 确认 100% 通过率
  → 你手动测试它                          → 晨报：「已修复。以下是变更内容。」
  → Claude 更新后它坏了                   → 下次更新？系统重新评估并适配
  → 你再修一次...                         → 而你在整个过程中都在睡觉
```

---

## 核心理念：目标树

大多数 AI 工具只做局部优化——「你做了 X，所以我记住 X。」Homunculus 做**全局**优化——朝你在树中定义的目标前进：

```
🎯 my-project
├── code_quality — 减少 bug
│   ├── testing — 维护测试覆盖率
│   │   └── realized_by: jest.config.js, tests/ (42 tests) ✓
│   └── linting — 统一代码风格
│       └── realized_by: .eslintrc.js, .prettierrc ✓
├── speed — 更快交付
│   └── deploy_automation — 一条命令部署
│       └── realized_by: # will evolve ○
└── knowledge — 学习与记忆
    ├── research — 发现更好的方法
    │   └── realized_by: nightly agent ✓
    └── memory — 记住重要的事
        └── realized_by: homunculus/instincts/ ✓
```

每个节点定义了**为什么**存在、**如何**衡量、以及**什么**在当前实现它。**目标是稳定的。实现会进化。** 系统自动将每个行为路由到最优机制——实现被替换和升级，而目标保持不变。

<details>
<summary>📖 <code>architecture.yaml</code> 中的目标节点长什么样？</summary>

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

`realized_by` 字段可以指向**任何东西**：

| 类型 | 示例 | 适用场景 |
|------|---------|-------------|
| Skill | `skills/tdd-workflow.md` | 行为知识 |
| Agent | `agents/code-reviewer.md` | 专业化 AI 子代理 |
| Hook | `hooks/pre-commit.sh` | 自动化触发器 |
| Script | `scripts/deploy.sh` | Shell 自动化 |
| Cron | `launchd/nightly-check.plist` | 定时任务 |
| MCP | `mcp-servers/github` | 外部集成 |
| Rule | `rules/security.md` | Claude Code 行为规则 |
| Command | `commands/quality-gate.md` | Slash command 工作流 |

</details>

---

## 进化机制

```
          你正常使用 Claude Code
                      │
           ┌──────────┼──────────┐
           │          │          │
        观察       健康检查      研究
       (hook)     (目标树)     (夜间)
           │          │          │
           └──────────┼──────────┘
                      │
                      ▼
               ┌────────────┐
               │   进化     │   目标不变。
               │  ────────  │   实现越来越好。
               │   提取     │
               │   汇聚     │
               │   评估     │
               │   替换     │
               └────────────┘
```

**三个输入，一个引擎：**

1. **观察** — hook 监控你的工具使用，将重复模式提取为「instinct」
2. **健康检查** — 目标树识别哪些目标不健康 → 聚焦于此
3. **研究** — 夜间 agent 扫描更好的方法并提出实验

进化引擎随后：
- 提取行为模式 → **instinct**（标记最佳机制 + 目标路径）
- 将每个 instinct 路由到最优机制 → **hook、rule、skill、script、agent 或 system**
- 对于 skill：**eval → improve 循环**直到 100% 通过率
- 每晚审查所有目标 → 当前机制是否仍是最优选择？
- Instinct 实现后归档 → 机制本身成为事实来源

---

## 更新日志

### v0.9.0 — 进化引擎升级 (Mar 2026)

- **智能观察** — `observe.sh` 现在过滤噪音（跳过 Read/Glob/Grep，写入操作只记录 post-phase）并追踪引用频率——哪些 instinct 和 skill 实际被读取
- **三层提取** — `evaluate-session.js` 现在一次性提取 instinct + 记忆建议 + 研究主题。记忆和研究写入 `homunculus/reports/` 供你审查（非侵入式）
- **语义去重** — 新 instinct 可以声明 `supersedes` 来自动归档它所替代的旧 instinct
- **写入门控** — 提取 prompt 现在包含质量标准（必须改变未来行为、记录承诺或保存决策依据）
- **动态每日上限** — Instinct 提取限制随 session 大小缩放（短 session 1 个，长 session 最多 5 个）
- **更智能的修剪** — `prune-instincts.js` 现在使用引用频率评分（常用 +25，从未引用 -15）、3 级 skill 覆盖检测（直接演化 / 高重叠 / 部分覆盖）、14 天宽限期后才开始信心衰减、以及高风险警告
- **幂等性** — 提取追踪扫描状态以避免重复处理相同的观察
- **`--json` 输出** — `prune-instincts.js` 支持 `--json` 用于程序化调用

### v0.8.0 — 升级机制 (Mar 2026)

- **`homunculus-code upgrade`** — 新命令，升级 npm 包后更新托管文件。核心脚本（observe.sh 等）自动替换并备份为 `.bak`；命令和规则仅在你未自定义时才替换——否则写入 `.new` 文件供手动合并
- **安装清单** — `init` 现在生成 `homunculus/.manifest.json`，追踪所有托管文件的 SHA256 哈希，实现安全的差异感知升级

### v0.7.0 — 非侵入式安装 & 主动性设计指南 (Mar 2026)

- **非侵入式安装** — 脚本现在位于 `homunculus/scripts/` 而非项目根目录 `scripts/`，避免与现有项目工具冲突
- **安全命令安装** — Slash command 逐文件安装；已有命令以警告方式保留而非覆盖
- **Hook 合并** — 如果 `.claude/settings.json` 中已存在 `PostToolUse` hook，观察 hook 会合并到数组中而非跳过整个设置
- **主动性设计指南** — 新增 [docs/proactivity.md](../proactivity.md)，涵盖主动式 AI 助手的三个核心概念：Memory Flush、Research Queue 和 Periodic Heartbeat

### v0.6.3 — 项目感知目标 & 进化层级 (Mar 2026)

- **项目扫描** — `/hm-goal` 现在在提问前检测你的技术栈、测试、CI 和目录结构。目标树预填你已有的内容
- **通用机制路由** — `/evolve` 将 instinct 路由到最佳机制（hook、rule、skill、script、agent），而不仅仅是 skill
- **进化强度层级** — 在 `evolution-config.yaml` 中配置 `minimal` / `standard` / `full`，控制深度、频率和成本
- **夜间 agent 设置** — 首次 `/hm-night` 运行时正确提供自动夜间进化配置

### v0.5.0 — 初始版本 (Mar 2026)

- **目标树** — 在 `architecture.yaml` 中定义你想要的
- **观察 hook** — 自动捕获 session 中的行为模式
- **夜间进化** — `/hm-night` 运行健康检查、提取 instinct、演化 skill 并生成报告
- **6 个 slash command** — `/hm-goal`、`/hm-night`、`/hm-status`、`/evolve`、`/eval-skill`、`/improve-skill`

---

## 快速开始

### 1. 安装

在你的项目目录中运行（`CLAUDE.md` 或 `.claude/` 所在位置）：

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

### 2. 定义你的目标

打开 Claude Code 并输入 `/hm-goal`。Claude 会先扫描你的项目，然后根据发现的内容提出针对性问题：

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

对于没有现有文件的新项目，Claude 会退回到关于项目类型和目标的通用问题。

### 3. 运行你的第一个进化周期

```
> /hm-night
```

观看 Claude 检查你的目标、将 instinct 路由到正确的机制（hook/rule/skill/script/agent）、评估和改进实现、并生成报告——全在一个命令中完成。这就是夜间 agent 在你睡觉时自主执行的操作。

### 4. 升级

新版本发布后，更新你的托管文件：

```bash
npx homunculus-code@latest upgrade
```

- **核心脚本** → 自动替换（备份保存为 `.bak`）
- **你未修改的命令/规则** → 自动替换
- **你已自定义的命令/规则** → 跳过，新版本保存为 `.new` 供你手动合并

### 5. 继续使用 Claude Code

观察 hook 自动监控你的使用情况。随着模式出现，instinct 被提取并路由到正确的机制：

```
/hm-goal        定义或优化你的目标
/hm-night       运行完整进化周期（可手动运行，但最好设为夜间 agent）
/hm-status      查看进化进度
```

`/hm-night` 执行完整的进化流水线：将 instinct 路由到最佳机制（hook/rule/skill/script/agent）、对 skill 运行 eval + improve、审查目标健康度、并生成报告。你可以随时手动运行，但真正的威力在于让它每晚自主运行。

> 第一次运行 `/hm-night` 时，它会询问你是否要设置夜间 agent 以实现自动夜间进化。

---

## 关键概念

### 目标树（`architecture.yaml`）

中枢神经系统。每个目标都有 purpose、metrics 和健康检查。进化系统读取它来决定**改进什么**以及**如何衡量成功**。

### Instinct

从你的使用中自动提取的小型行为模式。每个 instinct 标记有：
- **置信度分数** — 随强化增长，随时间衰减（半衰期：90 天）
- **建议机制** — 哪种实现类型最合适（hook/rule/skill/script/...）
- **目标路径** — 在目标树中服务于哪个目标

把 instinct 想象成原材料。它们被路由到正确的机制，实现后即归档。

### 实现路由

系统为每种行为选择最佳机制：

| 行为类型 | 机制 |
|--------------|-----------|
| 确定性的，每次都执行 | **Hook**（零 AI 判断） |
| 绑定特定文件/目录 | **Rule**（路径范围） |
| 可复用的知识集合 | **Skill**（带 eval 规范） |
| 周期性自动化 | **Script + 调度器** |
| 外部服务连接 | **MCP** |
| 需要隔离上下文 | **Agent** |

### Skill & Eval 规范

当多个 instinct 覆盖同一领域且路由结果为「skill」时，它们汇聚成一个经过测试、有版本控制的知识模块。每个 skill 都有包含场景测试的 eval 规范。未通过 eval 的 skill 会自动改进。

### 可替换的实现

核心原则：**同一目标，进化的实现。**

```
目标：「在合并前发现 bug」

  v1: instinct → 「记得运行测试」
  v2: rule     → .claude/rules/testing.md（路径范围指导）
  v3: skill    → tdd-workflow.md（带 eval 规范）
  v4: hook     → pre-commit.sh（确定性，自动化）
```

系统每晚审查这些——如果一个 skill 应该变成 hook，它会建议升级。

---

## 夜间 Agent

这是让系统真正自主的关键。夜间 agent 在你睡觉时自动运行 `/hm-night`——路由 instinct 到正确的机制、评估 skill、审查目标健康度、以及研究更好的方法。

**设置：** 第一次运行 `/hm-night` 时，它会询问你是否启用自动夜间运行。同意后，它会配置调度器（macOS 上的 `launchd`，Linux 上的 `cron`）每晚运行。

你也可以随时手动运行 `/hm-night` 按需触发一个周期。

### 进化层级

通过 `evolution-config.yaml`（`init` 时创建）控制助手每晚进化的深度：

| | Minimal | Standard | Full |
|---|---------|----------|------|
| Instinct 收割 + 路由 | ✅ | ✅ | ✅ |
| Skill eval（仅变更部分） | ✅ | ✅ | ✅ |
| 研究 | — | 2 个主题 | 3-5 个主题 |
| 实验 | — | 每晚 1 个 | 每晚 3 个 |
| 额外循环 | — | — | 可选 |
| **预估费用/晚** | **~$0.5** | **~$2-3** | **~$5-10** |

每周深度模式（可配置日期）额外执行：完整 skill 重新评估、目标树机制审查、深度健康检查。

```bash
# 随时切换层级
# 编辑 evolution-config.yaml → tier: minimal | standard | full
```

订阅用户（Max/Team）可以运行 `full` 而无需额外 API 费用。

```
 你去睡觉
        │
        ▼
 ┌─────────────────────────────────────────────┐
 │  夜间 Agent（阶段流水线）                    │
 │                                             │
 │  1. 健康检查（目标状态）                     │
 │                                             │
 │  2. 进化周期                                │
 │    路由 instinct → 8 种机制                  │
 │    评估 + 改进实现                           │
 │    审查：每个目标的最佳机制？                 │
 │                                             │
 │  3. 研究（跨夜去重）                         │
 │                                             │
 │  4. 行动（实验 + 快速修复）                  │
 │                                             │
 │  5. 报告 + 同步                             │
 └─────────────────────────────────────────────┘
        │
        ▼
 你醒来时拥有一个更聪明的助手 + 一份报告
```

**以下是真实的晨报示例：**

```markdown
## 晨报 — 2026-03-22

### 夜间变更
- 改进 skill：claude-code-reference v4.6 → v4.8
  （添加了 CC v2.1.77-80 功能的覆盖）
- 归档 3 个过时的 instinct（已被 evolved skill 覆盖）
- 新实验通过：eval 噪声阈值设为 5pp

### 目标健康度
- continuous_evolution:  ✅ 健康（10 个 skill，全部 100% eval）
- code_quality:          ✅ 健康（144/144 测试通过）
- resource_awareness:    ⚠️ 需关注（context 使用量趋势上升）
  → 已排队实验：将大型 skill 拆分为章节

### 研究发现
- Claude Code v2.1.81：新的 --bare 标志可加速 headless 模式
  → 实验已排队至明晚
- 社区中检测到新模式：写作者/审查者 agent 分离
  → 已创建 instinct，如果被强化将进行汇聚

### 建议操作（给你的）
- 审查夜间研究产出的 2 个知识卡片候选
- 批准实验：通过 skill 拆分减少 context
```

在我们的参考系统中，夜间 agent 产出了 **155 次自主 commit**——路由 instinct 到正确的机制、演化 skill、运行实验、研究更好的方法、以及归档过时的模式。全部无需任何人工输入。

夜间 agent 是将 Homunculus 从「一个你使用的工具」变为「一个自行成长的系统」的关键。

参见 [docs/nightly-agent.md](../nightly-agent.md) 了解设置方法。

---

## 实际成果

在真实的个人 AI 助手上构建和测试。在 **3 周**内（从零开始）：

| 进化产物 | 数量 | 详情 |
|-------------|-------|---------|
| 目标树 | **10 个目标 / 46+ 子目标** | 每个都有健康检查和指标 |
| Instinct | **190** | 33 个活跃 + 157 个自动归档（系统自我修剪） |
| Skill | **10** | 全部 100% eval 通过率（152 个测试场景） |
| 实验 | **15** | 结构化 A/B 测试，带通过/失败追踪 |
| 子代理 | **3** | 从重复的主线程模式中自动提取 |
| 定时 agent | **5** | 夜间心跳、Discord bridge、每日新闻、交易 × 2 |
| Hook | **11** | 观察、压缩、质量门禁 |
| 脚本 | **24** | Session 生命周期、健康检查、进化报告 |
| Slash command | **15** | 工作流自动化（forge-dev、quality-gate、eval...） |
| Rule | **6** | 核心模式、进化系统、知识管理 |
| ADR | **8** | 架构决策记录 |
| 总 commit 数 | **1,367+** | 大部分由夜间 agent 自动完成 |

仅夜间 agent：**368 次自主 commit**。

系统甚至演化出了自己的任务管理面板：

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

[查看完整参考实现 →](../../examples/reference/)

---

## 差异对比

| | Homunculus | OpenClaw | Cursor Rules | Claude Memory |
|---|---|---|---|---|
| **目标驱动** | 带指标 + 健康检查的目标树 | 否 | 否 | 否 |
| **从使用中学习** | 自动观察 → instinct → 8 种机制 | 自扩展 | 手动 | 自动记忆 |
| **质量控制** | Eval 规范 + 场景测试 | 无 | 无 | 无 |
| **自主夜间运行** | 夜间 agent：eval + 改进 + 研究 + 实验 | 否 | 否 | 否 |
| **自我改进** | Eval → improve → replace 循环 | 部分 | 否 | 否 |
| **元进化** | 进化机制自身也在进化 | 否 | 否 | 否 |
| **实现无关性** | Skill、agent、hook、script、MCP、cron... | 仅 skill | 仅 rule | 仅 memory |

OpenClaw 擅长自扩展。Homunculus 更进一步：它基于目标健康度决定*改进什么*，通过 eval *验证*改进效果，并在夜间*自主*完成所有工作。它们解决不同的问题。OpenClaw 是一个强大的工具。Homunculus 是一个进化操作系统。

---

## 生成内容

运行 `npx homunculus-code init` 后：

```
your-project/
├── architecture.yaml           # 你的目标树（大脑）
├── evolution-config.yaml       # 层级 + 预算设置
├── homunculus/
│   ├── instincts/
│   │   ├── personal/           # 自动提取的模式
│   │   └── archived/           # 自动修剪的旧模式
│   ├── evolved/
│   │   ├── skills/             # 汇聚的、经测试的知识
│   │   ├── agents/             # 专业化子代理
│   │   └── evals/              # Skill 评估规范
│   ├── experiments/            # A/B 测试追踪
│   ├── reports/                # 进化周期报告
│   └── scripts/
│       ├── observe.sh          # 观察 hook
│       ├── evaluate-session.js # 模式提取
│       └── prune-instincts.js  # 自动清理
├── .claude/
│   ├── rules/
│   │   └── evolution-system.md # Claude 应如何进化
│   └── commands/
│       ├── hm-goal.md          # /hm-goal — 定义或查看目标
│       ├── hm-night.md         # /hm-night — 运行进化周期
│       ├── hm-status.md        # /hm-status — 进化仪表盘
│       ├── eval-skill.md       # /eval-skill
│       ├── improve-skill.md    # /improve-skill
│       └── evolve.md           # /evolve
└── .gitignore                  # 排除运行时数据
```

---

## 进阶：元进化

进化机制本身也在进化：

- **Instinct 存活率**太低？ → 自动提高提取阈值
- **Eval 区分度**太低？ → 添加更难的边界场景
- **Skill 汇聚**太慢？ → 调整聚合触发条件
- **机制覆盖率**低？ → 标记仅依赖 prompt 的目标以进行升级
- **调度合规率**偏低？ → 审查 agent 调度是否遵循 token 决策树

通过五个指标追踪：
1. `instinct_survival_rate` — 存活超过 14 天的 instinct 百分比
2. `skill_convergence` — 从首个 instinct 到 evolved skill 的时间
3. `eval_discrimination` — 实际能区分版本差异的 eval 场景百分比
4. `mechanism_coverage` — 拥有非 prompt 实现的目标百分比
5. `compliance_rate` — 在适当 context 压力下执行 agent 调度的百分比

---

## 系统要求

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) v2.1.70+
- Node.js 18+
- macOS 或 Linux

---

## 常见问题

<details>
<summary><strong>这只能用于 Claude Code 吗？</strong></summary>

概念（目标树、eval 驱动的进化、可替换的实现）是工具无关的。当前实现针对 Claude Code 的 hook 和 command，但核心流水线可以适配其他 AI 框架。
</details>

<details>
<summary><strong>需要额外的 API 费用吗？</strong></summary>

观察 hook 是轻量级的（不调用 API）。Instinct 提取每个 session 使用一次简短的 Claude 调用（约 $0.01）。夜间 agent 是可选的，且预算可配置。
</details>

<details>
<summary><strong>可以保留我现有的 CLAUDE.md 和规则吗？</strong></summary>

可以。`npx homunculus-code init` 会在不覆盖现有文件的情况下添加到你的项目中。你当前的设置成为进化的起点。
</details>

<details>
<summary><strong>这与 Claude Code 内置的记忆有什么不同？</strong></summary>

Claude 的记忆记录事实。Homunculus 进化*行为*——经过测试的 skill、自动化的 hook、专业化的 agent——全部由你定义的目标驱动，并通过质量门禁防止回退。
</details>

<details>
<summary><strong>这与 OpenClaw 相比如何？</strong></summary>

OpenClaw 擅长自扩展。Homunculus 解决不同的问题：自主的、目标导向的进化。它决定什么需要改进（通过目标健康度）、验证改进效果（通过 eval）、并在夜间完成工作（通过夜间 agent）。你可以两者兼用：OpenClaw 用于按需能力扩展，Homunculus 用于顶层的自主进化层。
</details>

<details>
<summary><strong>启动时看到 hook 错误（SessionStart / Stop）</strong></summary>

那些来自你自己的用户级 hook（`~/.claude/settings.json`），不是来自 Homunculus。如果你的 hook 使用相对路径如 `node scripts/foo.js`，它们在没有这些脚本的项目中会失败。修复方法是添加守卫：

```json
"command": "test -f scripts/foo.js && node scripts/foo.js || true"
```

Homunculus 只向项目级 `.claude/settings.json` 添加 hook。
</details>

---

## 博客文章

- [Stop Tuning Your AI. Let It Tune Itself.](../stop-tuning-your-ai.md) — Homunculus 背后的故事，以及为什么目标树胜过手动配置。

---

## 理念

> 「你的 AI 助手应该是一颗种子，而不是一座雕像。」

别再花晚上的时间调教 AI 了。种下一颗种子，定义你的目标，让它成长。你用得越多，它就越好——它通过 eval 分数、目标健康检查和晨报准确告诉你它是如何进步的以及为什么。

---

## 致谢

Homunculus 建立在多个项目和研究的思想之上：

- **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)** — Continuous Learning 模式和 Skill Creator 的 eval → improve 循环。Homunculus 采纳并扩展了这些，发展为目标树驱动的自主进化系统。
- **[OpenClaw](https://github.com/openclaw/openclaw)** — 证明了 AI 助手可以扩展自己的能力。Homunculus 在此基础上增加了目标方向、eval 质量门禁和自主夜间运行。
- **[Karpathy 的 Autoresearch](https://x.com/karpathy)** — 证明了 AI 可以运行自主实验循环（118 次迭代，12+ 小时）。启发了夜间 agent 的研究周期。
- **[Anthropic 的 Eval 研究](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)** — Eval 方法论、噪声容忍度（±6pp）、以及 pass@k / pass^k 指标。

---

## 贡献

参见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 许可证

MIT

---

**由 [Javan](https://github.com/JavanC) 和他的自我进化 AI 助手构建。**
