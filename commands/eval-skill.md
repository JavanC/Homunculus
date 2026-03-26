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

### Theory
From Majority Voting / pass@k research: N=3 majority vote reduces misjudgment rate from p to 3p²-2p³ (at p=0.3: from 30% to 22%).

## After Evaluation

- Update `last_eval` and `pass_rate` in the eval spec
- Append result to `homunculus/evolved/evals/history.jsonl`
- Suggest improvements for FAIL/PARTIAL/GAP scenarios
