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

> **Proof it works:** One developer ran this system for 16 days. It auto-generated 174 behavioral patterns, converged them into 10 tested skills, created 3 specialized agents, 15 commands, and 19 automation scripts. The nightly agent alone made 134 commits across 11 nights — improving the system while the developer slept. [See results →](#real-world-results)

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
                    🎯 My AI Assistant
              ┌──────────┼──────────┐
              │          │          │
         Code Quality   Speed    Knowledge
          ┌────┴────┐    │     ┌────┴────┐
       Testing  Review  Tasks  Research  Memory
```

Each node defines **why** it exists, **how** to measure it, and **what** currently implements it:

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
      realized_by: scripts/evaluate-session.js    # a Node script
    skill_aggregation:
      purpose: "Converge patterns into tested skills"
      realized_by: homunculus/evolved/skills/      # evolved artifacts
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

**Goals are stable. Implementations evolve.** The same goal can go from a mental note → instinct → skill → hook → agent. The system replaces and upgrades implementations while keeping goals intact.

---

## How It Evolves

```
      You use Claude Code normally
                  │
       ┌──────────┼──────────┐
       │          │          │
       ▼          ▼          ▼
    Observe   Health Check   Research
    (hooks)   (goal tree)    (nightly)
       │          │          │
       └──────────┼──────────┘
                  │
                  ▼
           ┌───────────┐
           │  Evolve    │    Goals stay the same.
           │  ───────── │    Implementations get better.
           │  Extract   │
           │  Converge  │
           │  Eval      │
           │  Replace   │
           └───────────┘
```

**Three inputs, one engine:**

1. **Observe** — hooks watch your tool usage, extract recurring patterns into "instincts"
2. **Health check** — the goal tree identifies which goals are unhealthy → focus there
3. **Research** — a nightly agent scans for better approaches and proposes experiments

The evolution engine then:
- Extracts behavioral patterns → **instincts** (confidence-scored, auto-decay)
- Converges related instincts → **skills** (tested with eval specs)
- Evaluates and improves skills → **eval → improve loop** until 100% pass
- Proposes replacements → instinct becomes hook, script becomes agent
- Prunes outdated implementations → automatic archival

---

## Quick Start

### 1. Install

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

Open Claude Code and type `/hm-goal`. Claude asks one question at a time, then generates your goal tree:

```
> /hm-goal

Claude: What kind of project is this?
You:    A personal AI assistant

Claude: What do you spend most time on that you wish was better?
You:    Keeping up with AI news, too much to follow

Claude: If your AI could fix one thing overnight, what would it be?
You:    Auto fetch new AI news and give me a morning report

Claude: Here's your goal tree:
        🎯 Personal AI Assistant
        ├── ai_intelligence — Stay ahead on AI developments
        │   ├── news_curation — Auto-fetch top AI news daily
        │   └── morning_briefing — Deliver a concise report every morning
        ├── self_improvement — Get smarter over time
        │   ├── skill_evolution — Learn new skills from observations
        │   └── quality — Ensure evolved skills actually work
        └── productivity — Save the user time
            └── automation — Automate repetitive workflows

        Does this look right?
You:    Great!

Claude: ✅ architecture.yaml created with 3 goals!
```

### 3. Run Your First Evolution Cycle

```
> /hm-night
```

Watch Claude check your goals, scan for patterns, evaluate skills, and generate a report — all in one command. This is what the nightly agent does autonomously while you sleep.

### 4. Keep Using Claude Code

The observation hook watches your usage automatically. As patterns emerge:

```
/hm-night       Run an evolution cycle
/hm-status      Check evolution progress
/hm-goal       Refine your goals anytime
/eval-skill     Evaluate a specific skill
/improve-skill  Auto-improve a skill
/evolve         Converge instincts into skills
```

Set up the [nightly agent](docs/nightly-agent.md) to run `/hm-night` autonomously while you sleep.

---

## Key Concepts

### Goal Tree (`architecture.yaml`)

The central nervous system. Every goal has a purpose, metrics, and health checks. The evolution system reads this to decide **what** to improve and **how** to measure success.

### Instincts

Small behavioral patterns auto-extracted from your usage. They have confidence scores that grow with reinforcement and decay over time (half-life: 90 days). Think of them as the system's "muscle memory."

### Skills

When multiple instincts cover the same area, they converge into a skill — a tested, versioned knowledge module. Every skill has an eval spec with scenario tests. Skills that fail eval get automatically improved.

### Eval Specs

Scenario-based tests for skills. Each scenario defines context, expected behavior, and anti-patterns. The system runs evals and auto-improves until 100% pass rate.

### Replaceable Implementations

The core principle: **same goal, evolving implementation.**

```
Goal: "Catch bugs before merge"

  v1: instinct → "remember to run tests"
  v2: skill    → tdd-workflow.md (with eval spec)
  v3: hook     → pre-commit.sh (automated)
  v4: agent    → code-reviewer.md (AI-powered)
```

---

## Nightly Agent

This is what makes the system truly autonomous. Without it, you'd still need to manually run `/eval-skill`, `/improve-skill`, `/evolve`. The nightly agent **does all of that for you** while you sleep.

A scheduled agent (via `launchd` on macOS or `cron` on Linux) runs a heartbeat loop every night:

```
 You go to sleep
        │
        ▼
 ┌──────────────────────────────────────────────┐
 │  Nightly Agent (heartbeat loop)              │
 │                                              │
 │  1. Health Check                             │
 │     Scan goal tree → which goals are red?    │
 │                                              │
 │  2. Evolve                                   │
 │     Run /eval-skill on all skills            │
 │     Run /improve-skill on failing ones       │
 │     Converge new instincts → skills          │
 │     Prune outdated instincts                 │
 │                                              │
 │  3. Research                                 │
 │     Scan tech news, changelogs, community    │
 │     "Is there a better way to achieve X?"    │
 │                                              │
 │  4. Experiment                               │
 │     Generate hypotheses from weak goals      │
 │     Run experiments in isolated worktrees    │
 │     Merge if passed, discard if failed       │
 │                                              │
 │  5. Report                                   │
 │     Generate morning report                  │
 └──────────────────────────────────────────────┘
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

In our reference system, the nightly agent produced **134 commits across 11 nights** — evolving skills, running experiments, researching Claude Code updates, and archiving outdated patterns. All without any human input.

The nightly agent is what turns Homunculus from "a tool you use" into "a system that grows on its own."

See [docs/nightly-agent.md](docs/nightly-agent.md) for setup.

---

## Real-World Results

Built and tested on a real personal AI assistant. In **16 days** (starting from zero):

| What evolved | Count | Details |
|-------------|-------|---------|
| Instincts | **174** | 90 active + 84 auto-archived (system prunes itself) |
| Skills | **10** | All 100% eval pass rate (117 test scenarios) |
| Subagents | **3** | Auto-extracted from repetitive main-thread patterns |
| Slash commands | **15** | Workflow automations (forge-dev, quality-gate, eval...) |
| Scripts | **19** | Session lifecycle, health checks, evolution reports |
| Hooks | **11** | Observation, compaction, quality gates |
| Rules | **6** | Core patterns, evolution system, knowledge management |
| Scheduled agents | **4** | Nightly heartbeat, Discord bridge, daily news, trading |
| ADRs | **8** | Architecture decision records |
| Experiments | **14** | Structured A/B tests with pass/fail tracking |
| Goal tree | **9 goals / 46+ sub-goals** | Each with health checks and metrics |
| Total commits | **1,270** | System iterates fast |

The nightly agent alone: **134 commits across 11 nights**.

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
| **Learns from usage** | Auto-observation → instincts → skills | Self-extending | Manual | Auto-memory |
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
├── homunculus/
│   ├── instincts/
│   │   ├── personal/           # Auto-extracted patterns
│   │   └── archived/           # Auto-pruned old patterns
│   ├── evolved/
│   │   ├── skills/             # Converged, tested knowledge
│   │   ├── agents/             # Specialized subagents
│   │   └── evals/              # Skill evaluation specs
│   └── experiments/            # A/B test tracking
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
└── scripts/
    ├── observe.sh              # Observation hook
    ├── evaluate-session.js     # Pattern extraction
    └── prune-instincts.js      # Automatic cleanup
```

---

## Advanced: Meta-Evolution

The evolution mechanism itself evolves:

- **Instinct survival rate** too low? → Automatically raise extraction thresholds
- **Eval discrimination** too low? → Add harder boundary scenarios
- **Skill convergence** too slow? → Adjust aggregation triggers

Tracked via three metrics:
1. `instinct_survival_rate` — % of instincts that survive 14 days
2. `skill_convergence` — time from first instinct to evolved skill
3. `eval_discrimination` — % of eval scenarios that actually distinguish between versions

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
