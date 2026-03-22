# Homunculus

**A self-evolving AI assistant that grows smarter every night.**

Your AI assistant starts the same every day. Homunculus makes it evolve — automatically observing your patterns, extracting reusable skills, and improving itself while you sleep.

```
npx homunculus init
```

That's it. Start using Claude Code normally. Your assistant begins evolving.

---

## What It Does

### The Core Idea: Goal Tree

You define **what you want** in a goal tree. The system figures out **how to get there** — and keeps improving the "how" while the "what" stays stable.

```yaml
# architecture.yaml — your goals, not your tools
root:
  purpose: "My evolving AI assistant"

  goals:
    code_quality:
      purpose: "Ship fewer bugs"
      metrics:
        - name: test_coverage
          healthy: "> 80%"
      health_check:
        command: "npm test"             # machine-verifiable
      goals:
        testing:
          purpose: "Every change has tests"
          realized_by: skills/tdd-workflow.md    # ← HOW (can be replaced)
        review:
          purpose: "Catch issues before merge"
          realized_by: hooks/pre-commit.sh       # ← HOW (can be replaced)

    productivity:
      purpose: "Complete tasks faster"
      goals:
        automation:
          realized_by: scripts/auto-deploy.sh    # ← HOW
        debugging:
          realized_by: agents/shell-debugger.md  # ← HOW
```

Each goal has a **purpose** (why), **metrics** (how to measure), and **realized_by** (current implementation). The implementations can be anything:

| Implementation | Example |
|---------------|---------|
| **Skills** | Evolved knowledge modules with eval specs |
| **Agents** | Specialized subagents (different models, tools) |
| **Hooks** | Pre/post tool-use automation |
| **Scripts** | Shell/Node automation |
| **Cron / LaunchAgents** | Scheduled tasks (nightly research, health checks) |
| **MCP Servers** | External tool integrations |
| **Rules** | Claude Code behavioral rules |
| **Slash Commands** | Custom workflow triggers |

**The evolution system keeps goals stable while evolving implementations.** If a skill isn't working, it gets improved. If a script is better replaced by an agent, the system can restructure. Goals are the constant; everything else is a means.

### How It Evolves

```
                    ┌─────────────────────────────┐
                    │   Goal Tree                  │
                    │   (what you want)            │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │  Observe  │    │  Health   │    │ Research │
        │  usage    │    │  checks   │    │ (nightly)│
        └────┬─────┘    └────┬─────┘    └────┬─────┘
             │               │               │
             ▼               ▼               ▼
        ┌─────────────────────────────────────────┐
        │         Evolution Engine                 │
        │                                          │
        │  • Extract patterns → instincts          │
        │  • Converge instincts → skills           │
        │  • Eval skills → improve or replace      │
        │  • Prune outdated implementations        │
        │  • Propose new tools (agents, scripts)   │
        └─────────────────────────────────────────┘
             │
             ▼
        Goals stay the same.
        Implementations get better.
```

Three inputs drive evolution:

1. **Observation** — hooks watch your tool usage, extract recurring patterns
2. **Health checks** — each goal has metrics; unhealthy goals get priority
3. **Research** — nightly agent scans for better approaches, proposes experiments

---

## What Makes This Different

| | Homunculus | OpenClaw | Cursor Rules | Claude Memory |
|---|---|---|---|---|
| **Learns from usage** | Automatic observation → instincts | Skill generation | Manual rules | Auto-memory |
| **Quality control** | Eval specs + scenario tests | None | None | None |
| **Goal-driven** | Goal tree architecture | No | No | No |
| **Self-improving** | Eval → improve loop | Partial | No | No |
| **Autonomous** | Nightly agent research | Partial | No | No |
| **Meta-evolution** | Evolution mechanism evolves itself | No | No | No |

---

## Quick Start

### 1. Install

```bash
npx homunculus init
```

This creates the evolution structure in your project and configures Claude Code hooks.

### 2. Define Your Goals

Edit `architecture.yaml` — tell the system what you care about:

```yaml
version: "1.0"

root:
  purpose: "My evolving AI assistant"

  goals:
    code_quality:
      purpose: "Write better, more maintainable code"
      metrics:
        - name: test_coverage
          healthy: "> 80%"

    productivity:
      purpose: "Complete tasks faster with fewer iterations"
      metrics:
        - name: avg_tool_calls_per_task
          healthy: "decreasing trend"

    # Add your own goals...
```

### 3. Use Claude Code Normally

That's it. The system observes, extracts patterns, and evolves. Check progress anytime:

```bash
claude "/instinct-status"    # See active instincts
claude "/eval-skill"         # Run skill evaluations
```

---

## Evolution Mechanisms

The goal tree drives evolution, but the actual improvements happen through several mechanisms:

### Instincts → Skills (Behavioral Learning)

The system observes your tool usage. Recurring patterns become **instincts** (confidence-scored). Related instincts converge into **skills** — tested, versioned knowledge modules.

```
observe usage → instinct (confidence: 0.7) → grows with reinforcement
                                            → decays without use (half-life: 90d)

multiple related instincts → converge → skill (with eval spec)
                                      → eval → improve loop until 100%
```

### Health Checks → Targeted Improvement

Each goal can have a machine-executable health check. Unhealthy goals get evolution priority:

```yaml
code_quality:
  health_check:
    command: "npm test && echo healthy"
    expected: "all tests pass"
```

The system asks: *which goals are failing?* → focus improvement there.

### Nightly Agent → Autonomous Research

A scheduled agent runs overnight, checking goal health, researching better implementations, and proposing experiments — all without human intervention.

### Replaceable Implementations

This is the key insight: **goals are stable, implementations are disposable.**

```
Goal: "Catch bugs before merge"

  v1: realized_by: instinct (run tests manually)
  v2: realized_by: skill/pre-commit-checks.md
  v3: realized_by: hooks/pre-commit.sh          ← automated
  v4: realized_by: agents/code-reviewer.md       ← AI-powered

Same goal. Four different implementations.
The system evolved from a mental note → automated agent.
```

The evolution system can restructure, replace, or upgrade any implementation as long as the goal's health check still passes.

---

## Project Structure

After `npx homunculus init`, your project gets:

```
your-project/
├── architecture.yaml           # Your goal tree
├── homunculus/
│   ├── instincts/
│   │   └── personal/           # Auto-generated instincts
│   ├── evolved/
│   │   ├── skills/             # Converged skills
│   │   ├── agents/             # Specialized subagents
│   │   └── evals/              # Skill evaluation specs
│   └── experiments/            # A/B test tracking
├── .claude/
│   ├── rules/
│   │   └── evolution-system.md # Evolution behavior rules
│   └── commands/
│       ├── eval-skill.md       # /eval-skill command
│       ├── improve-skill.md    # /improve-skill command
│       └── evolve.md           # /evolve command
└── scripts/
    ├── observe.sh              # Observation hook
    ├── evaluate-session.js     # Pattern extraction
    └── prune-instincts.js      # Automatic cleanup
```

---

## Real-World Results

This system was built and tested on a real personal AI assistant. In **15 days**:

- **168 instincts** auto-generated from usage (84 active, 84 auto-archived)
- **7 evolved skills** — all passing eval at 100% (93 test scenarios)
- **3 specialized subagents** — auto-extracted from repetitive patterns
- **15 slash commands** — workflow automations
- **19 automation scripts** — session lifecycle, health checks, reports
- **11 hooks** — observation, compaction, quality gates
- **1,235 commits** — the system iterates fast

The nightly agent alone produced **134 commits across 11 nights** — improving the system autonomously while the developer slept.

[See the full reference implementation →](examples/reference/)

---

## Advanced: Nightly Agent

For autonomous overnight evolution, Homunculus supports a **heartbeat** system:

- Scheduled via `launchd` (macOS) or `cron`
- Runs health checks against your goal tree
- Identifies weak goals and proposes improvements
- Executes experiments in isolated worktrees
- Generates morning reports with action items

See [docs/nightly-agent.md](docs/nightly-agent.md) for setup.

---

## Advanced: Meta-Evolution

The evolution mechanism itself evolves:

- **Instinct survival rate** too low? → Raise extraction thresholds
- **Eval discrimination** too low? → Add harder boundary scenarios
- **Skill convergence** too slow? → Adjust aggregation triggers

This is tracked via three metrics:
1. `instinct_survival_rate` — % of instincts that survive 14 days
2. `skill_convergence` — time from first instinct to evolved skill
3. `eval_discrimination` — % of eval scenarios that distinguish versions

---

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (v2.1.70+)
- Node.js 18+
- macOS or Linux

---

## Philosophy

> "Your AI assistant should be a seed, not a statue."

Homunculus is not a framework you configure once. It's a living system that grows with you. The more you use it, the better it gets — and it tells you exactly how and why through eval scores, goal health checks, and evolution reports.

---

## License

MIT

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

Built by [Javan](https://github.com/JavanC) and his AI assistant.
