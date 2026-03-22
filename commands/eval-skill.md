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

## After Evaluation

- Update `last_eval` and `pass_rate` in the eval spec
- Append result to `homunculus/evolved/evals/history.jsonl`
- Suggest improvements for FAIL/PARTIAL/GAP scenarios
