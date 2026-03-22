# Architecture: Goal-Tree-Driven Evolution

This document explains the design philosophy behind Homunculus.

## The Problem

AI assistants are statically configured. You write rules, add skills, configure hooks — but the AI never improves on its own. Every improvement requires human effort:

1. Notice something could be better
2. Research the solution
3. Implement it (skill, hook, rule, script)
4. Test it manually
5. Maintain it when things change

This doesn't scale. As your system grows, maintenance becomes a full-time job.

## The Solution: Goal Trees

Instead of configuring individual behaviors, you define **what you want** in a tree of goals. The system figures out **how to achieve it** — and keeps improving the "how" over time.

### Why a Tree?

Goals are naturally hierarchical:

```
"Ship better software"
├── "Write fewer bugs"
│   ├── "Every change has tests"
│   └── "Catch issues before merge"
└── "Move faster"
    ├── "Automate repetitive tasks"
    └── "Debug faster"
```

A tree structure gives you:
- **Decomposition** — Break big goals into measurable sub-goals
- **Priority** — Unhealthy sub-goals bubble up to their parent
- **Independence** — Each sub-goal can be implemented differently
- **Replaceability** — Swap implementations without affecting goals

### Goal Node Schema

Every node in the tree follows the same schema:

```yaml
goal_name:
  purpose: "Why this goal exists"           # Never changes
  realized_by: path/to/implementation       # Changes as system evolves
  metrics:
    - name: metric_name
      source: where to get the data
      healthy: "what healthy looks like"    # Defines success
  health_check:
    command: "shell command"                # Machine-executable
    expected: "human description"           # For readability
  goals:
    sub_goal_1: ...                         # Recursive
    sub_goal_2: ...
```

### The `realized_by` Field

This is the key innovation. It decouples **what** (the goal) from **how** (the implementation). The value can be:

- A skill: `skills/tdd-workflow.md`
- An agent: `agents/code-reviewer.md`
- A hook: `hooks/pre-commit.sh`
- A script: `scripts/deploy.sh`
- A cron job: `launchd/nightly.plist`
- An MCP server: `mcp-servers/github`
- A rule: `rules/security.md`
- A slash command: `commands/quality-gate.md`
- Or anything else

The evolution system can **replace** the implementation at any time, as long as the goal's health check still passes. This is what makes the system truly self-improving — it's not locked into any particular approach.

## Evolution Pipeline

### Layer 1: Observation → Instincts

```
Tool usage → observe.sh (hook) → observations.jsonl
                                        │
                         evaluate-session.js (SessionEnd)
                                        │
                                        ▼
                              instincts/personal/*.md
                              (confidence-scored patterns)
```

Instincts are small behavioral patterns with:
- **Confidence scores** — increase with reinforcement, decay over time
- **Half-life decay** — unused instincts fade (default: 90 days)
- **Automatic archival** — `prune-instincts.js` archives low-value ones

### Layer 2: Convergence → Skills

```
Related instincts (3+)  →  /evolve  →  evolved/skills/*.md
                                              │
                                    eval spec (scenarios)
                                              │
                                    /eval-skill → score
                                              │
                                    /improve-skill → iterate
                                              │
                                        100% pass rate
```

Skills are:
- **Tested** — every skill has an eval spec with scenario tests
- **Versioned** — changes tracked with semver
- **Quality-gated** — must pass eval before adoption
- **Regression-protected** — rollback if quality drops

### Layer 3: Goal-Directed Evolution

```
architecture.yaml
       │
       ▼
health_check.command → pass/fail per goal
       │
       ▼
Unhealthy goals get priority
       │
       ▼
Evolution engine focuses improvement
on the weakest areas
```

The goal tree adds **direction** to evolution. Without it, the system learns whatever patterns happen to occur. With it, the system asks: "which goals are failing?" and focuses there.

### Layer 4: Autonomous Operation (Nightly Agent)

```
launchd/cron → heartbeat.sh (scheduled)
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
Health Check    Evolve Pipeline   Research
    │               │               │
    ▼               ▼               ▼
Identify weak   eval → improve    Scan for better
goals            → prune          approaches
    │               │               │
    └───────────────┼───────────────┘
                    ▼
            Morning Report
```

The nightly agent closes the loop — no human intervention needed for routine evolution.

### Layer 5: Meta-Evolution

The evolution mechanism itself is measured and adjusted:

| Metric | What it measures | Action if unhealthy |
|--------|-----------------|-------------------|
| `instinct_survival_rate` | % of instincts surviving 14 days | Raise extraction thresholds |
| `skill_convergence` | Time from first instinct to skill | Adjust aggregation triggers |
| `eval_discrimination` | % of scenarios that distinguish versions | Add harder boundary scenarios |

This prevents the system from degenerating — if it's extracting too many low-quality instincts, it automatically becomes more selective.

## Design Principles

### 1. Goals Over Implementations

Never optimize an implementation directly. Always ask: "which goal does this serve?" If there's no goal, the implementation shouldn't exist.

### 2. Measure Everything

If you can't measure it, you can't evolve it. Every goal should eventually have a `health_check` or `metrics` entry. Start with approximate metrics and refine them.

### 3. Replaceable Everything

No implementation is sacred. A skill can be replaced by a hook. A script can be replaced by an agent. The only constant is the goal tree.

### 4. Safe Evolution

- Eval specs prevent regression
- Experiments run in isolated worktrees
- Rollback if quality drops
- Noise tolerance (5pp) prevents chasing statistical artifacts

### 5. Progressive Complexity

Start simple:
1. Just the goal tree + observation hook
2. Let instincts accumulate naturally
3. Evolve first skill when you have enough instincts
4. Add eval spec for quality control
5. Set up nightly agent when you're ready for autonomy

Don't try to build the full system on day one. Let it grow.

## Comparison with Other Approaches

| Approach | Optimizes | Direction | Quality Control | Autonomous |
|----------|-----------|-----------|----------------|------------|
| Manual rules | Individual behaviors | Human-directed | None | No |
| Claude Memory | Fact recall | Usage-driven | None | No |
| OpenClaw skills | Skill generation | Human-triggered | None | Partial |
| **Homunculus** | **Goal achievement** | **Goal-tree-driven** | **Eval specs** | **Yes (nightly)** |

## Further Reading

- [README.md](README.md) — Quick start and overview
- [docs/nightly-agent.md](docs/nightly-agent.md) — Setting up autonomous operation
- [examples/reference/](examples/reference/) — Real-world system after 15 days
