# Architecture: Goal-Tree-Driven Evolution

This document explains the design philosophy behind Homunculus.

## The Problem

AI assistants are statically configured. You write rules, add skills, configure hooks — but the AI never improves on its own. Every improvement requires human effort:

1. Notice something could be better
2. Research the solution
3. Figure out the right mechanism (hook? skill? script?)
4. Implement it
5. Test it manually
6. Maintain it when things change

This doesn't scale. As your system grows, maintenance becomes a full-time job.

## The Solution: Goal Trees + Implementation Routing

Instead of configuring individual behaviors, you define **what you want** in a tree of goals. The system figures out **how to achieve it** — choosing the right mechanism automatically — and keeps improving the "how" over time.

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

This is the key innovation. It decouples **what** (the goal) from **how** (the implementation). The system supports 8 implementation mechanisms:

| Mechanism | When to use | Example |
|-----------|------------|---------|
| **Hook** | Deterministic, every time, zero AI judgment | Lint after edit, auto-commit on session end |
| **Rule** | Path-scoped guidance for specific directories | "Use TDD when touching quest-board/" |
| **CLAUDE.md** | Always-on core rules (< 200 lines) | Language preference, tool priorities |
| **Skill** | Reusable knowledge collections with eval specs | Shell automation patterns, TDD workflow |
| **Script + scheduler** | Periodic automation, no AI needed | Daily snapshots, weekly pruning |
| **MCP** | External service connections | Semantic search, native app control |
| **Agent** | Isolated context, specialist roles | TDD runner, shell debugger |
| **System** | Infrastructure, always-on services | API server, Discord bridge |

The evolution system can **replace** the implementation at any time, as long as the goal's health check still passes.

### Implementation Routing

When a new behavior needs to be implemented, the system uses a decision tree:

```
Is it deterministic? (every time, no AI judgment)
├── Yes → Hook
└── No → Needs AI judgment
    ├── Tied to specific files/dirs? → Rule (path-scoped)
    ├── Every session needs it? → CLAUDE.md
    ├── Reusable knowledge collection? → Skill
    ├── Needs periodic execution? → Script + scheduler
    ├── Connects to external service? → MCP
    ├── Needs isolated context? → Agent
    └── Infrastructure-level → System
```

This routing happens at three points:
1. **User creates a new goal** — `forge-dev evaluate` suggests a mechanism
2. **Instinct is extracted from usage** — `evaluate-session.js` tags it with `suggested_mechanism`
3. **Nightly review** — `goal-mechanism-review.sh` checks if existing implementations are optimal

---

## Evolution Pipeline

### Layer 1: Observation → Instincts

```
Tool usage → observe.sh (hook, noise-filtered) → observations.jsonl
                    |                                     |
                    |→ reference-tracking.jsonl    evaluate-session.js
                       (which instincts/skills           |
                        are actually read)               v
                                              ┌── instincts/personal/*.md
                                              │   (confidence-scored, mechanism-tagged)
                                              ├── reports/memory-suggestions.jsonl
                                              └── reports/research-queue.jsonl
```

Instincts are small behavioral patterns with:
- **Confidence scores** — increase with reinforcement, decay over time (14-day grace period)
- **Mechanism tag** — which implementation type fits best (hook/rule/skill/script/...)
- **Goal path** — which goal in the tree this serves
- **Semantic dedup** — new instincts can `supersede` older ones, auto-archiving them
- **Automatic archival** — archived once implemented by any mechanism

### Layer 2: Implementation Routing → Multi-Mechanism Evolution

Unlike traditional systems that only aggregate instincts into skills, Homunculus routes each instinct to its optimal mechanism:

```
Nightly P1 B1a reads instinct tags
    |
    +-- suggested_mechanism: hook → Write hook → Archive instinct
    +-- suggested_mechanism: rule → Write rule → Archive instinct
    +-- suggested_mechanism: skill → Aggregate into skill → Eval → Improve → Archive
    +-- suggested_mechanism: script → Write script + scheduler → Archive instinct
    +-- goal_path: unrooted → Ask user "do you have this goal?"
```

For skills specifically, the convergence pipeline:
```
Related instincts (5+)  →  /evolve  →  evolved/skills/*.md
                                              |
                                    eval spec (scenarios)
                                              |
                                    /eval-skill → score
                                              |
                                    /improve-skill → iterate
                                              |
                                        100% pass rate → Archive source instincts
```

Skills are:
- **Tested** — every skill has an eval spec with scenario tests
- **Versioned** — changes tracked with semver
- **Quality-gated** — must pass eval before adoption
- **Regression-protected** — rollback if quality drops

### Layer 3: Goal-Directed Review

Two nightly processes keep the goal tree healthy:

**3a. Mechanism Review** — Is each goal using the best implementation?
```
goal-mechanism-review.sh (nightly)
    |
    v
Scan all goals → Classify realized_by mechanism
    |
    v
Flag prompt-only goals → Suggest upgrade via Implementation Routing
```

**3b. Mechanism Health Check** — Is each implementation working correctly?
```
mechanism-health-check.sh (nightly)
    |
    +-- Hooks: check error rate in stderr logs
    +-- Rules: check referenced file paths still exist
    +-- Scripts/scheduler: check files exist and are executable
    +-- MCP: check server connectivity
    +-- CLAUDE.md: check line count < 200 (bloat detection)
    +-- Skills: eval + improve loop (separate pipeline)
    +-- Workflows: skip_rate + success_rate + skip_reasons
    +-- Subagents: model/prompt recommendations + compliance_rate
```

### Layer 4: Autonomous Operation (Nightly Agent)

```
scheduler → heartbeat.sh
                |
    P0: Assigned tasks (priority:high)
    P1: Evolution cycle
        A: Session review + instinct harvesting
        B1a: Implementation Routing (instinct → best mechanism)
        B1b: Skill eval + improve
        B2: Workflow evolution (skip_rate analysis)
        B3: Subagent evolution (compliance analysis)
        C: System health (21 health_checks + mechanism review + hook candidates)
    P2: Research (cross-night dedup)
    P3: Experiments (hypothesis → verify → merge/discard)
    P4: Final sync (CLAUDE.md / MEMORY.md / architecture.yaml)
    Bonus: Extra P2/P3 rounds if budget allows
```

The nightly agent closes the loop — no human intervention needed for routine evolution.

### Layer 5: Meta-Evolution

The evolution mechanism itself is measured and adjusted:

| Metric | What it measures | Action if unhealthy |
|--------|-----------------|-------------------|
| `instinct_survival_rate` | % of instincts surviving 14 days | Raise extraction thresholds |
| `skill_convergence` | Time from first instinct to skill | Adjust aggregation triggers |
| `eval_discrimination` | % of scenarios that distinguish versions | Add harder boundary scenarios |
| `mechanism_coverage` | % of goals with non-prompt implementation | Flag upgrade candidates |
| `compliance_rate` | % of agent dispatches following token decision tree | Review dispatch patterns |

---

## Design Principles

### 1. Goals Over Implementations

Never optimize an implementation directly. Always ask: "which goal does this serve?" If there's no goal, the implementation shouldn't exist.

### 2. Route to the Right Mechanism

Don't default to skills for everything. Deterministic behavior → hook. Path-specific guidance → rule. Periodic automation → script. Use the Implementation Routing decision tree.

### 3. Measure Everything

If you can't measure it, you can't evolve it. Every goal should eventually have a `health_check` or `metrics` entry. Start with approximate metrics and refine them.

### 4. Archive After Implementation

When an instinct is implemented by any mechanism (hook, rule, skill, script), archive it immediately. The implementation is the source of truth now, not the instinct.

### 5. Safe Evolution

- Eval specs prevent regression
- Experiments run in isolated worktrees
- Rollback if quality drops
- Noise tolerance (5pp) prevents chasing statistical artifacts

### 6. Progressive Complexity

Start simple:
1. Just the goal tree + observation hook
2. Let instincts accumulate naturally
3. Evolve first skill when you have enough instincts
4. Add eval spec for quality control
5. Set up nightly agent when you're ready for autonomy

Don't try to build the full system on day one. Let it grow.

## Comparison with Other Approaches

| Approach | Optimizes | Direction | Mechanism Routing | Quality Control | Autonomous |
|----------|-----------|-----------|-------------------|----------------|------------|
| Manual rules | Individual behaviors | Human-directed | Manual | None | No |
| Claude Memory | Fact recall | Usage-driven | N/A | None | No |
| OpenClaw skills | Skill generation | Human-triggered | Skills only | None | Partial |
| **Homunculus** | **Goal achievement** | **Goal-tree-driven** | **8 mechanisms** | **Eval specs** | **Yes (nightly)** |

## Further Reading

- [README.md](README.md) — Quick start and overview
- [docs/nightly-agent.md](docs/nightly-agent.md) — Setting up autonomous operation
- [examples/reference/](examples/reference/) — Real-world system after ~1 month of evolution
