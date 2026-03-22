# Homunculus

**A self-evolving AI assistant that grows smarter every night.**

Your AI assistant starts the same every day. Homunculus makes it evolve — automatically observing your patterns, extracting reusable skills, and improving itself while you sleep.

```
npx homunculus init
```

That's it. Start using Claude Code normally. Your assistant begins evolving.

---

## What It Does

Homunculus adds a **goal-tree-driven evolution loop** to Claude Code:

```
You use Claude Code normally
        │
        ▼
  ┌─────────────┐
  │   Observe    │  ← hooks watch every tool call
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   Extract    │  ← patterns become "instincts" (confidence-scored)
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   Converge   │  ← related instincts merge into tested "skills"
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │    Eval      │  ← skills are validated against scenario tests
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   Improve    │  ← failed evals trigger automatic refinement
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │    Prune     │  ← outdated instincts are automatically archived
  └─────────────┘
```

Everything is driven by your **goal tree** — a YAML file where you define what matters to you. The system evolves toward your goals, not randomly.

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

## How It Evolves

### Instincts (Automatic)

Every session, the system observes your tool usage patterns. Recurring patterns become **instincts** — small behavioral rules with confidence scores.

```
Session observation → Pattern detected (3+ occurrences)
                    → Instinct created (confidence: 0.7)
                    → Confidence grows with reinforcement
                    → Confidence decays over time (half-life: 90 days)
```

### Skills (Converged)

When multiple instincts cover the same area, they **converge** into a skill — a tested, versioned knowledge module.

```
instinct: "always run tests before committing"  ─┐
instinct: "check for regressions after refactor" ─┼─→ skill: development-verification
instinct: "validate syntax before git add"       ─┘    (eval: 100%, 8 scenarios)
```

### Eval-Driven Quality

Every skill has an **eval spec** — scenario tests that validate the skill works correctly:

```yaml
scenarios:
  - id: pre-commit-check
    context: "User asks to commit changes"
    expected_behavior: "Run tests and syntax check before committing"
    anti_patterns:
      - "Commit without running tests"
      - "Skip syntax validation"
```

Skills that fail eval are automatically improved until they pass.

### Goal Tree

The **goal tree** (`architecture.yaml`) drives all evolution decisions:

- Which instincts to keep? → Do they serve a goal?
- Which skills to improve? → Which goals are unhealthy?
- What to research at night? → Where are the gaps?

```yaml
# The system checks each goal's health and focuses improvement
# on the weakest areas — automatically.
health_check:
  command: "test $(wc -l < coverage.txt) -gt 80"
  expected: "test coverage above 80%"
```

---

## The Goal Tree Philosophy

Most AI assistants optimize locally — they remember what you did and repeat it. Homunculus optimizes **globally** — toward goals you define.

```
Without goal tree:          With goal tree:

  "User did X a lot"        "Goal: code quality"
  → Do more X               → Is code quality healthy?
  → Maybe X was a mistake   → No: test coverage dropped
  → System reinforces bad   → Focus evolution on testing
    habits too               → Improve testing skills
                             → Measure improvement
```

The goal tree makes evolution **intentional**, not just reactive.

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
