**Language:** [English](README.md) | [繁體中文](docs/zh-TW/README.md) | [简体中文](docs/zh-CN/README.md)

# Homunculus for Claude Code

[![npm version](https://img.shields.io/npm/v/homunculus-code)](https://www.npmjs.com/package/homunculus-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.70+-blue)](https://docs.anthropic.com/en/docs/claude-code)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)

**Stop tuning your AI. Let it tune itself.**

<p align="center">
  <img src="https://github.com/user-attachments/assets/b3ce6017-02de-44a4-a3c6-8d45765c1693" alt="Homunculus Demo — goal setup + evolution cycle in 60 seconds" width="700">
</p>

You spend hours tweaking prompts, writing rules, researching new features, configuring tools. Homunculus flips this: define your goals, and the system evolves itself — skills, agents, hooks, scripts, everything — while you focus on actual work.

```bash
npx homunculus-code init
```

One command. Define your goals. Your assistant starts evolving.

> **Proof it works:** One developer ran this system for 3 weeks. It auto-generated 190 behavioral patterns, routed them into 10 tested skills, created 3 specialized agents, 15 commands, and 24 automation scripts. The nightly agent made 368 autonomous commits — improving the system while the developer slept. [See results →](#real-world-results)

---

## Why

Every Claude Code power user hits the same wall:

```
Week 1:  "Claude is amazing!"
Week 2:  "Let me add some rules and hooks..."
Week 3:  "I need skills, agents, MCP servers, custom commands..."
Week 4:  "I spend more time configuring Claude than using it."
```

Sound familiar? Even [OpenClaw](https://github.com/openclaw/openclaw) — with 300K+ stars and self-extending capabilities — still needs *you* to decide what to improve, when to improve it, and whether the improvement worked. Edit `SOUL.md`, tweak `AGENTS.md`, break something, open another AI session to fix it. The AI can extend itself, but it can't set its own direction or validate its own quality.

**Here's the difference:**

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

## The Core Idea: Goal Tree

Most AI tools optimize locally — "you did X, so I'll remember X." Homunculus optimizes **globally** — toward goals you define in a tree:

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

Each node defines **why** it exists, **how** to measure it, and **what** currently implements it. **Goals are stable. Implementations evolve.** The system automatically routes each behavior to its optimal mechanism — implementations get replaced and upgraded while goals stay intact.

<details>
<summary>📖 What does a goal node look like in <code>architecture.yaml</code>?</summary>

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

The `realized_by` field can point to **anything**:

| Type | Example | When to use |
|------|---------|-------------|
| Skill | `skills/tdd-workflow.md` | Behavioral knowledge |
| Agent | `agents/code-reviewer.md` | Specialized AI subagent |
| Hook | `hooks/pre-commit.sh` | Automated trigger |
| Script | `scripts/deploy.sh` | Shell automation |
| Cron | `launchd/nightly-check.plist` | Scheduled task |
| MCP | `mcp-servers/github` | External integration |
| Rule | `rules/security.md` | Claude Code behavioral rule |
| Command | `commands/quality-gate.md` | Slash command workflow |

</details>

---

## How It Evolves

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

**Three inputs, one engine:**

1. **Observe** — hooks watch your tool usage, extract recurring patterns into "instincts"
2. **Health check** — the goal tree identifies which goals are unhealthy → focus there
3. **Research** — a nightly agent scans for better approaches and proposes experiments

The evolution engine then:
- Extracts behavioral patterns → **instincts** (tagged with best mechanism + goal path)
- Routes each instinct to its optimal mechanism → **hook, rule, skill, script, agent, or system**
- For skills: **eval → improve loop** until 100% pass rate
- Reviews all goals nightly → is the current mechanism still the best one?
- Archives instincts once implemented → the mechanism is the source of truth now

---

## What's New

### v0.9.0 — Evolution Engine Upgrade (Mar 2026)

- **Smart observation** — `observe.sh` now filters noise (skips Read/Glob/Grep, only records post-phase for writes) and tracks reference frequency — which instincts and skills are actually being read
- **Three-layer extraction** — `evaluate-session.js` now extracts instincts + memory suggestions + research topics in a single pass. Memory and research are written to `homunculus/reports/` for you to review (non-invasive)
- **Semantic dedup** — New instincts can declare `supersedes` to auto-archive older instincts they replace
- **Write Gate** — Extraction prompt now includes quality criteria (must change future behavior, capture a commitment, or preserve a decision rationale)
- **Dynamic daily cap** — Instinct extraction limit scales with session size (1 for short sessions, up to 5 for long ones)
- **Smarter pruning** — `prune-instincts.js` now uses reference frequency scoring (+25 for frequently used, -15 for never referenced), 3-tier skill coverage detection (direct evolved / high overlap / partial), 14-day grace period before confidence decay, and at-risk warnings
- **Idempotency** — Extraction tracks scan state to avoid reprocessing the same observations
- **`--json` output** — `prune-instincts.js` supports `--json` for programmatic use

### v0.8.0 — Upgrade Mechanism (Mar 2026)

- **`homunculus-code upgrade`** — New command to update managed files when you upgrade the npm package. Core scripts (observe.sh, etc.) are auto-replaced with `.bak` backup; commands and rules are only replaced if you haven't customized them — otherwise a `.new` file is written for manual merge
- **Install manifest** — `init` now generates `homunculus/.manifest.json` tracking SHA256 hashes of all managed files, enabling safe diff-aware upgrades

### v0.7.0 — Non-Invasive Install & Proactivity Design Guide (Mar 2026)

- **Non-invasive install** — Scripts now live in `homunculus/scripts/` instead of the project root `scripts/`, avoiding collisions with existing project tooling
- **Safe command install** — Slash commands are installed file-by-file; existing commands are preserved with a warning instead of being overwritten
- **Hook merging** — If `PostToolUse` hooks already exist in `.claude/settings.json`, the observation hook is merged into the array rather than skipping setup entirely
- **Proactivity design guide** — New [docs/proactivity.md](docs/proactivity.md) covering the three core concepts behind proactive AI assistants: Memory Flush, Research Queue, and Periodic Heartbeat

### v0.6.3 — Project-Aware Goals & Evolution Tiers (Mar 2026)

- **Project scanning** — `/hm-goal` now detects your tech stack, tests, CI, and directory structure before asking questions. Goal trees start pre-filled with what you already have
- **Universal mechanism routing** — `/evolve` routes instincts to the best mechanism (hook, rule, skill, script, agent), not just skills
- **Evolution intensity tiers** — Configure `minimal` / `standard` / `full` in `evolution-config.yaml` to control depth, frequency, and cost
- **Nightly agent setup** — First `/hm-night` run properly offers to configure automatic overnight evolution

### v0.5.0 — Initial Release (Mar 2026)

- **Goal tree** — Define what you want in `architecture.yaml`
- **Observation hook** — Automatically captures behavioral patterns from your sessions
- **Nightly evolution** — `/hm-night` runs health checks, extracts instincts, evolves skills, and generates reports
- **6 slash commands** — `/hm-goal`, `/hm-night`, `/hm-status`, `/evolve`, `/eval-skill`, `/improve-skill`

---

## Quick Start

### 1. Install

Run in your project directory (where your `CLAUDE.md` or `.claude/` lives):

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

### 2. Define Your Goals

Open Claude Code and type `/hm-goal`. Claude scans your project first, then asks targeted questions based on what it finds:

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

For new projects with no existing files, Claude falls back to general questions about your project type and goals.

### 3. Run Your First Evolution Cycle

```
> /hm-night
```

Watch Claude check your goals, route instincts to the right mechanisms (hook/rule/skill/script/agent), evaluate and improve implementations, and generate a report — all in one command. This is what the nightly agent does autonomously while you sleep.

### 4. Upgrade

When a new version is published, update your managed files:

```bash
npx homunculus-code@latest upgrade
```

- **Core scripts** → auto-replaced (backup saved as `.bak`)
- **Commands/rules you haven't modified** → auto-replaced
- **Commands/rules you customized** → skipped, new version saved as `.new` for you to merge

### 5. Keep Using Claude Code

The observation hook watches your usage automatically. As patterns emerge, instincts are extracted and routed to the right mechanism:

```
/hm-goal        Define or refine your goals
/hm-night       Run a full evolution cycle (can run manually, but best set up as nightly agent)
/hm-status      Check evolution progress
```

`/hm-night` performs the complete evolution pipeline: routes instincts to the best mechanism (hook/rule/skill/script/agent), runs eval + improve on skills, reviews goal health, and generates a report. You can run it manually anytime, but the real power is letting it run autonomously every night.

> The first time you run `/hm-night`, it will ask if you want to set up the nightly agent for automatic overnight evolution.

---

## Key Concepts

### Goal Tree (`architecture.yaml`)

The central nervous system. Every goal has a purpose, metrics, and health checks. The evolution system reads this to decide **what** to improve and **how** to measure success.

### Instincts

Small behavioral patterns auto-extracted from your usage. Each instinct is tagged with:
- **Confidence score** — grows with reinforcement, decays over time (half-life: 90 days)
- **Suggested mechanism** — which implementation type fits best (hook/rule/skill/script/...)
- **Goal path** — which goal in the tree this serves

Think of instincts as raw material. They get routed to the right mechanism and archived once implemented.

### Implementation Routing

The system chooses the best mechanism for each behavior:

| Behavior type | Mechanism |
|--------------|-----------|
| Deterministic, every time | **Hook** (zero AI judgment) |
| Tied to specific files/dirs | **Rule** (path-scoped) |
| Reusable knowledge collection | **Skill** (with eval spec) |
| Periodic automation | **Script + scheduler** |
| External service connection | **MCP** |
| Needs isolated context | **Agent** |

### Skills & Eval Specs

When multiple instincts cover the same area and routing says "skill," they converge into a tested, versioned knowledge module. Every skill has an eval spec with scenario tests. Skills that fail eval get automatically improved.

### Replaceable Implementations

The core principle: **same goal, evolving implementation.**

```
Goal: "Catch bugs before merge"

  v1: instinct → "remember to run tests"
  v2: rule     → .claude/rules/testing.md (path-scoped guidance)
  v3: skill    → tdd-workflow.md (with eval spec)
  v4: hook     → pre-commit.sh (deterministic, automated)
```

The system reviews these nightly — if a skill should be a hook, it suggests the upgrade.

---

## Nightly Agent

This is what makes the system truly autonomous. The nightly agent runs `/hm-night` automatically while you sleep — routing instincts to the right mechanism, evaluating skills, reviewing goal health, and researching better approaches.

**Setup:** The first time you run `/hm-night`, it asks if you want to enable automatic nightly runs. Say yes, and it configures a scheduler (`launchd` on macOS, `cron` on Linux) to run every night.

You can also run `/hm-night` manually anytime to trigger a cycle on demand.

### Evolution Tiers

Control how deeply your assistant evolves each night via `evolution-config.yaml` (created during `init`):

| | Minimal | Standard | Full |
|---|---------|----------|------|
| Instinct harvest + routing | ✅ | ✅ | ✅ |
| Skill eval (changed only) | ✅ | ✅ | ✅ |
| Research | — | 2 topics | 3-5 topics |
| Experiments | — | 1/night | 3/night |
| Bonus loop | — | — | Optional |
| **Est. cost/night** | **~$0.5** | **~$2-3** | **~$5-10** |

Weekly deep mode (configurable day) adds: full skill re-eval, goal tree mechanism review, deep health check.

```bash
# Change tier anytime
# Edit evolution-config.yaml → tier: minimal | standard | full
```

Subscription users (Max/Team) can run `full` at no extra API cost.

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

**Here's what a real morning report looks like:**

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

In our reference system, the nightly agent produced **155 autonomous commits** — routing instincts to the right mechanisms, evolving skills, running experiments, researching better approaches, and archiving outdated patterns. All without any human input.

The nightly agent is what turns Homunculus from "a tool you use" into "a system that grows on its own."

See [docs/nightly-agent.md](docs/nightly-agent.md) for setup.

---

## Real-World Results

Built and tested on a real personal AI assistant. In **3 weeks** (starting from zero):

| What evolved | Count | Details |
|-------------|-------|---------|
| Goal tree | **10 goals / 46+ sub-goals** | Each with health checks and metrics |
| Instincts | **190** | 33 active + 157 auto-archived (system prunes itself) |
| Skills | **10** | All 100% eval pass rate (152 test scenarios) |
| Experiments | **15** | Structured A/B tests with pass/fail tracking |
| Subagents | **3** | Auto-extracted from repetitive main-thread patterns |
| Scheduled agents | **5** | Nightly heartbeat, Discord bridge, daily news, trading × 2 |
| Hooks | **11** | Observation, compaction, quality gates |
| Scripts | **24** | Session lifecycle, health checks, evolution reports |
| Slash commands | **15** | Workflow automations (forge-dev, quality-gate, eval...) |
| Rules | **6** | Core patterns, evolution system, knowledge management |
| ADRs | **8** | Architecture decision records |
| Total commits | **1,367+** | Mostly automated by nightly agent |

The nightly agent alone: **368 autonomous commits**.

The system even evolved its own task management board:

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

[See the full reference implementation →](examples/reference/)

---

## What Makes This Different

| | Homunculus | OpenClaw | Cursor Rules | Claude Memory |
|---|---|---|---|---|
| **Goal-driven** | Goal tree with metrics + health checks | No | No | No |
| **Learns from usage** | Auto-observation → instincts → 8 mechanisms | Self-extending | Manual | Auto-memory |
| **Quality control** | Eval specs + scenario tests | None | None | None |
| **Autonomous overnight** | Nightly agent: eval + improve + research + experiment | No | No | No |
| **Self-improving** | Eval → improve → replace loop | Partial | No | No |
| **Meta-evolution** | Evolution mechanism evolves itself | No | No | No |
| **Implementation agnostic** | Skills, agents, hooks, scripts, MCP, cron... | Skills only | Rules only | Memory only |

OpenClaw is great at self-extending. Homunculus goes further: it decides *what* to improve based on goal health, *validates* improvements with evals, and does it all *autonomously* overnight. They solve different problems. OpenClaw is a power tool. Homunculus is an operating system for evolution.

---

## What Gets Generated

After `npx homunculus-code init`:

```
your-project/
├── architecture.yaml           # Your goal tree (the brain)
├── evolution-config.yaml       # Tier + budget settings
├── homunculus/
│   ├── instincts/
│   │   ├── personal/           # Auto-extracted patterns
│   │   └── archived/           # Auto-pruned old patterns
│   ├── evolved/
│   │   ├── skills/             # Converged, tested knowledge
│   │   ├── agents/             # Specialized subagents
│   │   └── evals/              # Skill evaluation specs
│   ├── experiments/            # A/B test tracking
│   ├── reports/                # Evolution cycle reports
│   └── scripts/
│       ├── observe.sh          # Observation hook
│       ├── evaluate-session.js # Pattern extraction
│       └── prune-instincts.js  # Automatic cleanup
├── .claude/
│   ├── rules/
│   │   └── evolution-system.md # How Claude should evolve
│   └── commands/
│       ├── hm-goal.md          # /hm-goal — define or view goals
│       ├── hm-night.md         # /hm-night — run evolution cycle
│       ├── hm-status.md        # /hm-status — evolution dashboard
│       ├── eval-skill.md       # /eval-skill
│       ├── improve-skill.md    # /improve-skill
│       └── evolve.md           # /evolve
└── .gitignore                  # Excludes runtime data
```

---

## Advanced: Meta-Evolution

The evolution mechanism itself evolves:

- **Instinct survival rate** too low? → Automatically raise extraction thresholds
- **Eval discrimination** too low? → Add harder boundary scenarios
- **Skill convergence** too slow? → Adjust aggregation triggers
- **Mechanism coverage** low? → Flag goals that only rely on prompts for upgrade
- **Dispatch compliance** off? → Review if agent dispatches follow the token decision tree

Tracked via five metrics:
1. `instinct_survival_rate` — % of instincts that survive 14 days
2. `skill_convergence` — time from first instinct to evolved skill
3. `eval_discrimination` — % of eval scenarios that actually distinguish between versions
4. `mechanism_coverage` — % of goals with non-prompt implementations
5. `compliance_rate` — % of agent dispatches at appropriate context pressure

---

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) v2.1.70+
- Node.js 18+
- macOS or Linux

---

## FAQ

<details>
<summary><strong>Is this only for Claude Code?</strong></summary>

The concepts (goal tree, eval-driven evolution, replaceable implementations) are tool-agnostic. The current implementation targets Claude Code hooks and commands, but the core pipeline could be adapted to other AI harnesses.
</details>

<details>
<summary><strong>Does it cost extra API credits?</strong></summary>

The observation hook is lightweight (no API calls). Instinct extraction uses a short Claude call per session (~$0.01). The nightly agent is optional and budget-configurable.
</details>

<details>
<summary><strong>Can I use my existing CLAUDE.md and rules?</strong></summary>

Yes. `npx homunculus-code init` adds to your project without overwriting existing files. Your current setup becomes the starting point for evolution.
</details>

<details>
<summary><strong>How is this different from Claude Code's built-in memory?</strong></summary>

Claude's memory records facts. Homunculus evolves *behavior* — tested skills, automated hooks, specialized agents — all driven by goals you define, with quality gates that prevent regression.
</details>

<details>
<summary><strong>How does this compare to OpenClaw?</strong></summary>

OpenClaw is excellent at self-extending. Homunculus solves a different problem: autonomous, goal-directed evolution. It decides what needs improving (via goal health), validates improvements (via evals), and does the work overnight (via the nightly agent). You could use both: OpenClaw for on-demand capability extension, Homunculus for the autonomous evolution layer on top.
</details>

<details>
<summary><strong>I see hook errors on startup (SessionStart / Stop)</strong></summary>

Those are from your own user-level hooks (`~/.claude/settings.json`), not from Homunculus. If your hooks use relative paths like `node scripts/foo.js`, they'll fail in projects that don't have those scripts. Fix by adding guards:

```json
"command": "test -f scripts/foo.js && node scripts/foo.js || true"
```

Homunculus only adds hooks to the project-level `.claude/settings.json`.
</details>

---

## Blog Posts

- [Stop Tuning Your AI. Let It Tune Itself.](docs/stop-tuning-your-ai.md) — The story behind Homunculus and why goal trees beat manual configuration.

---

## Philosophy

> "Your AI assistant should be a seed, not a statue."

Stop spending your evenings tuning AI. Plant a seed, define your goals, and let it grow. The more you use it, the better it gets — and it tells you exactly how and why through eval scores, goal health checks, and morning reports.

---

## Acknowledgments

Homunculus builds on ideas from several projects and research:

- **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)** — Continuous Learning pattern and Skill Creator's eval → improve loop. Homunculus adopted and extended these into a goal-tree-driven, autonomous evolution system.
- **[OpenClaw](https://github.com/openclaw/openclaw)** — Demonstrated that AI assistants can extend their own capabilities. Homunculus adds goal direction, eval quality gates, and autonomous overnight operation.
- **[Karpathy's Autoresearch](https://x.com/karpathy)** — Proved AI can run autonomous experiment loops (118 iterations, 12+ hours). Inspired the nightly agent's research cycle.
- **[Anthropic's Eval Research](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)** — Eval methodology, noise tolerance (±6pp), and pass@k / pass^k metrics.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

---

**Built by [Javan](https://github.com/JavanC) and his self-evolving AI assistant.**
