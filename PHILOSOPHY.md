# Philosophy

The principles behind Homunculus. These aren't aspirational — they're the constraints we actually use when making design decisions.

---

## The Evolution Manifesto

Most AI assistant tools are **static**: you write rules, add skills, configure hooks — and the system stays exactly as you left it. Some tools (like [gstack](https://github.com/garrytan/gstack)) provide opinionated role templates. Others (like [OpenClaw](https://github.com/openclaw/openclaw)) can self-extend by generating new skills. These are useful — but they share a fundamental limitation: **the human is still the quality bottleneck**.

Homunculus is different because it closes the loop:

```
Static tools:    Human writes → AI uses → Human reviews → Human improves
Self-extending:  Human writes → AI uses → AI extends → Human hopes it's good
Homunculus:      Human sets goals → AI observes → AI evolves → AI validates → AI replaces
```

The four properties that make this work:

1. **Dynamic evolution, not static configuration.** Behaviors emerge from real usage patterns (instincts), converge into tested knowledge (skills), and get routed to the lightest mechanism that works. What starts as a prompt hint today becomes a pre-commit hook tomorrow — automatically.

2. **Instinct → Skill closed loop.** Raw observations are extracted into instincts (confidence-scored behavioral patterns). Multiple instincts with overlapping themes are aggregated into skills. Each skill is eval-tested to 100% pass rate before it's considered stable. Instincts get archived once their knowledge lives in a mechanism. Nothing accumulates forever.

3. **Eval discrimination prevents gaming.** A 100% pass rate is meaningless if every answer passes trivially. Homunculus tracks *discrimination* — the percentage of eval scenarios where having the skill produces meaningfully different behavior than not having it. In the reference system: **38.9% discrimination rate** (49 of 126 scenarios are genuinely discriminating) and **61.2% boundary scenario coverage** (156 of 255 edge cases tested). These numbers keep the system honest.

4. **Nightly autonomy.** A dedicated agent runs while you sleep — reviewing session patterns, evolving skills, running experiments in isolated worktrees, researching better approaches, and generating morning reports. In the reference system, the nightly agent made 1,500+ autonomous commits over 5 weeks. You wake up to a system that improved overnight.

**The result:** 229 behavioral patterns observed → converged to 10 skills at 100% eval pass rate → 4 specialized agents → 18 slash commands → 37 automation scripts. Not designed top-down. Evolved bottom-up from real usage, validated by real evals, maintained by real autonomy.

This is what we mean by *self-evolving*: not "AI writes code for itself" — but **observe, converge, validate, replace** in a continuous loop where quality is measured, not assumed.

---

## 1. Goals Are Permanent; Implementations Are Temporary

Your goals ("ship tested code", "respond in the user's language", "stay within budget") rarely change. But the *how* changes constantly — what starts as a prompt tweak becomes a rule, then a skill, then a hook, then a script.

Homunculus encodes this directly: `architecture.yaml` defines stable goals; everything else (instincts, skills, agents, hooks) is disposable implementation that evolves toward those goals. When an implementation stops serving its goal, it gets archived — no attachment, no ceremony.

**In practice:** Before building anything, ask "which goal does this serve?" If you can't answer, don't build it.

## 2. Observe First, Implement Second

The system watches what actually happens in sessions before deciding what to improve. Instincts are extracted from real usage patterns, not imagined requirements. Skills are aggregated from multiple instincts that proved useful, not designed top-down.

This means:
- **No speculative features.** If a pattern hasn't been observed at least twice, it's not worth codifying.
- **Confidence decays.** An instinct that hasn't been referenced in 90 days loses relevance and gets pruned.
- **Evolution is pull-based.** The system improves where friction is observed, not where we guess it might be.

**In practice:** Run the system for a week before customizing. Your actual usage patterns are more valuable than your predictions about them.

## 3. Quality Gates, Not Quality Hopes

Every evolved skill has an eval spec with scenario tests. Pass rate must hit 100% before a skill is considered stable. Discrimination (can the eval distinguish "has this skill" from "doesn't have it"?) is monitored to prevent gaming.

This means:
- A skill that passes eval is **proven useful** — not just written down.
- Evals that everything passes trivially are **worse than no evals** — they create false confidence.
- The eval system itself evolves (meta-evaluation) to stay honest.

**In practice:** If you can't write a scenario where the skill makes a difference, the skill probably doesn't matter.

## 4. Mechanism-Agnostic Routing

The same behavioral improvement can be implemented as an instinct, a rule, a skill, a hook, a script, an agent, or an MCP integration. Homunculus picks the lightest mechanism that works:

| Need | Mechanism |
|------|-----------|
| Deterministic, no AI judgment needed | Hook or script |
| Path-specific guidance | Rule |
| Reusable knowledge with nuance | Skill (with eval) |
| Isolated, parallelizable work | Subagent |
| Scheduled automation | Cron / launchd |

Over time, implementations naturally migrate toward more deterministic mechanisms — an instinct becomes a rule, a rule becomes a hook. This is intentional: deterministic beats probabilistic when you know the answer.

**In practice:** Don't reach for the most powerful mechanism. Reach for the simplest one that handles the case.

## 5. The Developer Decides

The system suggests; the human approves. Nightly evolution reports are *reports*, not automated deployments. Instinct extraction writes to a staging area, not directly to production rules. Research findings are tagged `[adoptable]` / `[informational]` — the developer chooses what to act on.

Autonomy is a spectrum, not a switch. The system earns trust incrementally:
- **Day 1:** Everything is a suggestion.
- **Week 2:** Proven patterns get auto-applied within guardrails.
- **Month 2:** The nightly agent handles routine evolution autonomously.

But the developer can always `git revert` any autonomous change. Reversibility is non-negotiable.

**In practice:** If you're not comfortable with a nightly agent making commits, start with `BUDGET_LEVEL=minimal`. Trust is built, not configured.

## 6. Completeness Over Cleverness

In the AI era, the marginal cost of "complete and tested" vs. "works but fragile" is near zero. A 150-line implementation with tests beats an 80-line clever hack every time.

This applies to the evolution system itself:
- Skills include anti-patterns, not just expected behavior.
- Evals include boundary scenarios that probe edge cases.
- Reports include what was *rejected* and why, not just what was done.

**In practice:** When in doubt, add the test. When in doubt, document the decision. The cost of doing it now is always less than the cost of debugging it later.

---

## Non-Goals

Things we deliberately don't optimize for:

- **Magic generality.** Homunculus works across Claude Code, Cursor, and Codex CLI via adapter layers (`core/adapters/`), and supports any LLM via provider abstraction (`core/providers/`). But the *evolution engine* — instinct extraction, eval discrimination, nightly autonomy — remains Claude Code-first. Cross-host adapters handle hook routing and config paths; they don't replicate the full evolution loop on other platforms. Generality at the infrastructure layer; depth at the evolution layer.
- **Speed of evolution.** Slow, correct evolution beats fast, noisy evolution. One high-quality instinct per week is better than ten low-confidence ones per day.
- **Zero-config magic.** You need to define goals. You need to review reports. The system augments your judgment, not replaces it.
- **Backward compatibility.** This is a single-developer system by design. When a better approach exists, migrate fully — no shims, no dual paths, no deprecated aliases.
