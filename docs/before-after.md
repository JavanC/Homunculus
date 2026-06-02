# Before & After: What Homunculus Actually Changes

Real data from a 5-week reference implementation. Same developer. Same workflow. Different assistant.

---

## Day 1 vs Day 35: By the Numbers

| Metric | Day 1 | Day 35 | Change |
|--------|-------|--------|--------|
| Behavioral patterns (instincts) | 0 | 229 extracted → 1 active + 228 archived | System learned and absorbed |
| Tested skills | 0 | 10 (all 100% eval pass rate) | Bottom-up, from real usage |
| Specialized subagents | 0 | 4 | Auto-extracted from repetitive patterns |
| Automation scripts | 0 | 37 | Hooks, health checks, lifecycle mgmt |
| Slash commands | 6 (installed) | 18 (10 evolved) | 10 new commands evolved from patterns |
| Eval discrimination | — | 38.9% (49/126 scenarios) | Evals that actually distinguish behavior |
| Autonomous commits (nightly) | 0 | 1,500+ | Made while developer slept |
| Goal health checks | 0 | 9 automated checks | Every goal has a verifiable health signal |

---

## What the Evolution Looks Like in Practice

### Week 1: Observation starts, nothing visible yet

The `observe.sh` hook silently records tool usage patterns. No instincts yet — the system is watching.

You use Claude Code normally. Maybe you notice Claude sometimes forgets to run tests before committing. You manually remind it. Again. Again.

### Week 2: First instincts appear

`/hm-night` runs. The system extracts its first behavioral pattern:

```
instinct: run-tests-before-commit
confidence: 0.72
mechanism: hook (pre-commit, deterministic)
goal: code_quality.testing
source: 3 sessions where test-reminder was needed
```

The instinct is routed to a pre-commit hook — not a skill (that would require AI judgment), but a deterministic shell script. Lighter. Faster. More reliable.

**Day 14:** The pre-commit hook runs automatically. You never manually remind Claude to run tests again.

### Week 3: First skill converges

Five instincts about Claude Code features accumulate. The system aggregates them:

```
skill: claude-code-reference v1.0
instincts merged: 5
eval scenarios: 12
pass rate: 83% → improved → 100%
discrimination: 41%
```

Claude now answers CC-specific questions without searching docs. Reliably.

### Week 4: Nightly agent takes over

You stop manually running `/hm-night`. The launchd schedule handles it:

```
Morning report — Week 4:
  ✅ claude-code-reference upgraded v1.0 → v2.1 (new CC features)
  ✅ Archived 8 outdated instincts (absorbed into skills)
  ✅ New experiment passed: eval discrimination threshold raised to 30%
  ⚠️ Goal: test_coverage showing low health → queued skill improvement
```

You wake up to a report. You review it in 3 minutes. Done.

### Week 5: The system evolves its own evolution

The meta-evolution layer kicks in:

- `instinct_survival_rate` too low → extraction threshold raised automatically
- `eval_discrimination` plateau detected → boundary scenarios added to evals
- 3 instincts flagged for convergence → new skill proposed overnight

**Day 35:** The system has more context about your coding patterns than you do. It knows which goals are healthy, which implementations are stale, and what to improve next.

---

## The "Aha" Moment

Most developers report the same inflection point around **Day 10–14**:

> "I realized I hadn't manually written a rule or tuned a hook in a week. The system just... did it."

This is the shift from *configuring an assistant* to *having an assistant that configures itself*.

---

## What Doesn't Change

Homunculus doesn't change how you use Claude Code day-to-day. You still write code, run commands, ask questions. The difference is what happens *between* your sessions — the extraction, the eval, the improvement, the replacement.

You define what "good" looks like (the goal tree). The system figures out how to get there.

---

## Want to See the Reference Implementation?

The full 5-week evolution is documented in [examples/reference/](../examples/reference/). You can browse the actual instincts, skills, and evolution reports that produced these numbers.
