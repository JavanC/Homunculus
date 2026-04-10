---
disable-model-invocation: true
---
# /eval-skill — Evaluate an Evolved Skill

Run scenario-based tests on a skill to measure its quality.

## Steps

1. List eval specs: `ls homunculus/evolved/evals/*.eval.yaml 2>/dev/null`
2. If user specified a skill name, use that eval spec; otherwise let user choose
3. Read the skill file (`homunculus/evolved/skills/<name>.md`) and its eval spec

## Evaluation

For each scenario, act as a **developer who doesn't know the answer** — only reference the skill document. Then compare against expected_behavior and anti_patterns.

## Results

| Result | Condition |
|--------|-----------|
| **PASS** | Skill guides all expected behaviors, no anti-patterns triggered |
| **PARTIAL** | Skill guides some expected behaviors, or misses important details |
| **FAIL** | Skill fails to guide correct behavior, or would cause anti-patterns |
| **GAP** | Scenario knowledge is completely absent from skill |

## Report Format

```
🔬 Skill Eval: <name> v<version>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scenario                Result   Notes
──────────────────────────────────────
<scenario.name>         PASS     -
<scenario.name>         PARTIAL  Missing X
<scenario.name>         FAIL     Would cause Y

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pass rate: X/Y (Z%)
Grade: ⭐⭐⭐⭐⭐ (>= 90)
```

## Noise Tolerance

**5pp rule**: score delta < 5pp is statistical noise, not a real change. From Anthropic infrastructure noise research — environment variance alone can cause ±5pp swings.

- `|delta| < 5pp` → `not_significant` (treat as flat)
- `delta >= 5pp` → real improvement
- `delta <= -5pp` → real regression

## Multiple-Run Modes

Three optional flags reduce measurement noise. Use independently or combined.

### --runs N (eliminate infra noise)

`/eval-skill my-skill --runs 3` — runs the full eval N times independently, reports mean ± σ.

- Eliminates session-to-session infrastructure variance
- **Recommended for nightly agent evals**: `--runs 3`
- Daily manual evals: default N=1 is fine

```
📊 Multi-Run Summary (runs=3):
Run 1: 85%  Run 2: 87%  Run 3: 83%
Mean: 85.0% | σ: 1.6pp
Verdict: not_significant vs baseline 84% (delta=1pp < 5pp threshold)
```

### --passes N (reduce per-scenario LLM noise)

`/eval-skill my-skill --passes 3` — each scenario evaluated N times, majority vote decides.

- PASS in >N/2 runs → final PASS (PARTIAL counts as 0.5)
- **Recommended: N=3** — reduces misjudgment from p to 3p²-2p³

### --pass-k K (measure reliability distribution)

`/eval-skill my-skill --pass-k 3` — reports pass@k and pass^k per scenario.

| Metric | Meaning |
|--------|---------|
| `pass@k` | At least 1 pass in k tries (exploration rate) |
| `pass^k` | All k passes (reliability rate) |

Use to distinguish "sometimes works" from "always works".

### Combining flags

`--runs R --passes P --pass-k K` = R × P × K × scenarios. Use sparingly — `--runs 3` alone is usually enough.

## Majority Vote (--passes)

Use `--passes <N>` to reduce LLM-judge noise (e.g., `/eval-skill my-skill --passes 3`).

- Each scenario is evaluated **N times** independently
- **Majority vote** decides the final result: PASS in >N/2 runs → final PASS, otherwise FAIL
- PARTIAL counts as 0.5 vote toward PASS
- N=1 is the default (standard eval)
- **Recommended: N=3** — reduces single-run noise at only 3x cost

### Report (appended when passes > 1)
```
📊 Majority Vote (passes=3):
Scenario                Votes     Final   Confidence
───────────────────────────────────────────
<scenario.name>        3/3 PASS   PASS   unanimous
<scenario.name>        2/3 PASS   PASS   majority
<scenario.name>        1/3 PASS   FAIL   majority
```

## Gaming Gate

Score jumps >5pp but net new lines ≤ 3 → `gaming_suspected`, discard the improvement.

Real skill improvement requires substantive additions (new patterns, new examples, new sections). Rephrasing existing content to match scenario wording inflates LLM-judge scores without adding knowledge.

**Signs of gaming:**
- Score +8pp but skill only changed 2 lines
- New wording mirrors scenario's `expected_behavior` verbatim
- Discrimination rate unchanged despite score increase

When `gaming_suspected`: revert, add genuinely missing knowledge instead.

## Anti-Gaming Scenario Design

1. **Boundary scenarios are key** — discrimination comes from edge cases the skill uniquely handles
2. **Don't mirror expected_behavior wording** — scenarios should test understanding, not recall
3. **Discrimination > 30%** is healthy — if all scenarios pass without the skill, eval isn't testing anything
4. **Gradual improvement** — legitimate gains are 2-5pp per round, not 15pp jumps

## After Evaluation

- Update `last_eval` and `pass_rate` in the eval spec
- Append result to `homunculus/evolved/evals/history.jsonl`
- Suggest improvements for FAIL/PARTIAL/GAP scenarios
