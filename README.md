# Homunculus for Claude Code

**Stop tuning your AI. Let it tune itself.**

You spend hours tweaking prompts, writing rules, researching new features, configuring tools. Homunculus flips this: define your goals, and the system evolves itself — skills, agents, hooks, scripts, everything — while you focus on actual work.

```bash
npx homunculus init
```

One command. Answer a few questions. Start using Claude Code. Your assistant begins evolving.

---

## Why

Every Claude Code power user hits the same wall:

```
Week 1:  "Claude is amazing!"
Week 2:  "Let me add some rules and hooks..."
Week 3:  "I need skills, agents, MCP servers, custom commands..."
Week 4:  "I spend more time configuring Claude than using it."
```

Sound familiar? Even with tools like OpenClaw that can generate new skills, you're still the one deciding *what* to improve, *when* to improve it, and *whether* the improvement actually worked. The AI can write code, but it can't set its own direction.

**You're the bottleneck in your own AI workflow.** You read changelogs, tune prompts, test new patterns, troubleshoot regressions — all to make your AI slightly better. Meanwhile, your AI sits idle every night doing nothing.

Homunculus flips this: you define goals, and the system evolves itself — creating skills, agents, hooks, and scripts on its own. It evaluates its own improvements, rolls back regressions, and researches better approaches. While you sleep.

---

## The Core Idea: Goal Tree

Most AI tools optimize locally — "you did X, so I'll remember X." Homunculus optimizes **globally** — toward goals you define in a tree:

```
                        🎯 My AI Assistant
                     ┌──────────┼──────────┐
                     │          │          │
                 Code Quality  Speed   Knowledge
                 ┌───┴───┐     │      ┌───┴───┐
              Testing  Review  Tasks  Research  Memory
```

Each node in the tree has:

```yaml
# architecture.yaml
code_quality:
  purpose: "Ship fewer bugs"                     # WHY this goal exists
  metrics:
    - name: test_pass_rate
      healthy: "> 95%"                            # HOW to measure success
  health_check:
    command: "npm test"                           # Machine-verifiable check
  goals:
    testing:
      purpose: "Every change has tests"
      realized_by: skills/tdd-workflow.md         # WHAT currently implements it
    review:
      purpose: "Catch issues before merge"
      realized_by: hooks/pre-commit.sh            # Can be ANYTHING
```

The `realized_by` field is the key — it can point to **any implementation**:

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
    ┌───────────┼───────────┐
    ▼           ▼           ▼
 Observe    Health Check  Research
 (hooks)    (goal tree)   (nightly)
    │           │           │
    └───────────┼───────────┘
                ▼
         ┌────────────┐
         │  Evolve     │   Goals stay the same.
         │  ────────── │   Implementations get better.
         │  Extract    │
         │  Converge   │
         │  Eval       │
         │  Replace    │
         └────────────┘
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
npx homunculus init
```

The wizard asks you a few questions and sets everything up:

```
🧬 Homunculus — Self-evolving AI Assistant

? What's your project name? my-app
? What's your main goal? Build a reliable SaaS product

✅ Created homunculus/ structure
✅ Generated architecture.yaml with your goals
✅ Added observation hook to Claude Code
✅ Copied evolution scripts

Done! Start using Claude Code. Your assistant will evolve.
```

### 2. Use Claude Code Normally

That's it. The system observes, extracts, and evolves in the background. Check progress anytime:

```bash
claude "/eval-skill"         # Run skill evaluations
claude "/improve-skill"      # Auto-improve a skill
claude "/evolve"             # Converge instincts into skills
```

### 3. Refine Your Goals (Optional)

As you use the system, refine `architecture.yaml` — add sub-goals, metrics, and health checks. The more specific your goals, the smarter the evolution.

---

## What Gets Generated

After `npx homunculus init`:

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
│       ├── eval-skill.md       # /eval-skill
│       ├── improve-skill.md    # /improve-skill
│       └── evolve.md           # /evolve
└── scripts/
    ├── observe.sh              # Observation hook
    ├── evaluate-session.js     # Pattern extraction
    └── prune-instincts.js      # Automatic cleanup
```

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

### Nightly Agent

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
 │     Generate morning report with:            │
 │     - What changed overnight                 │
 │     - New skills/instincts created           │
 │     - Experiments run and results            │
 │     - Suggested actions for you              │
 └──────────────────────────────────────────────┘
        │
        ▼
 You wake up to a smarter assistant + a report
```

**Real example:** In our reference system, the nightly agent produced **134 commits across 11 nights** — evolving skills, running experiments, researching Claude Code updates, and archiving outdated patterns. All without any human input.

The nightly agent is what turns Homunculus from "a tool you use" into "a system that grows on its own."

See [docs/nightly-agent.md](docs/nightly-agent.md) for setup.

### Meta-Evolution (Advanced)

The evolution mechanism itself evolves:
- Instinct survival rate too low? → Raise extraction thresholds
- Eval discrimination too low? → Add harder scenarios
- Tracked via: `instinct_survival_rate`, `skill_convergence`, `eval_discrimination`

---

## Real-World Results

Built and tested on a real personal AI assistant. In **15 days**:

| What evolved | Count | Details |
|-------------|-------|---------|
| Instincts | **168** | 84 active + 84 auto-archived |
| Skills | **7** | All 100% eval pass (93 scenarios) |
| Subagents | **3** | Auto-extracted from patterns |
| Slash commands | **15** | Workflow automations |
| Scripts | **19** | Session lifecycle, health checks |
| Hooks | **11** | Observation, compaction, quality gates |
| Commits | **1,235** | System iterates fast |

The nightly agent alone: **134 commits across 11 nights** — evolving the system while the developer slept.

[See the full reference implementation →](examples/reference/)

---

## What Makes This Different

| | Homunculus | OpenClaw | Cursor Rules | Claude Memory |
|---|---|---|---|---|
| **Goal-driven** | Goal tree with metrics + health checks | No | No | No |
| **Learns from usage** | Auto-observation → instincts → skills | Skill generation | Manual | Auto-memory |
| **Quality control** | Eval specs + scenario tests | None | None | None |
| **Self-improving** | Eval → improve → replace loop | Partial | No | No |
| **Autonomous** | Nightly agent + experiments | Partial | No | No |
| **Meta-evolution** | Evolution mechanism evolves itself | No | No | No |
| **Implementation agnostic** | Skills, agents, hooks, scripts, MCP... | Skills only | Rules only | Memory only |

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

Yes. `npx homunculus init` adds to your project without overwriting existing files. Your current setup becomes the starting point for evolution.
</details>

<details>
<summary><strong>How is this different from Claude Code's built-in memory?</strong></summary>

Claude's memory records facts. Homunculus evolves *behavior* — tested skills, automated hooks, specialized agents — all driven by goals you define, with quality gates that prevent regression.
</details>

---

## Philosophy

> "Your AI assistant should be a seed, not a statue."

Stop spending your evenings tuning AI. Plant a seed, define your goals, and let it grow. The more you use it, the better it gets — and it tells you exactly how and why through eval scores, goal health checks, and evolution reports.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

---

**Built by [Javan](https://github.com/JavanC) and his self-evolving AI assistant.**
