# Reference Implementation

This is a snapshot of a real Homunculus system after **15 days of evolution** (1,235 commits).

## What's Here

```
reference/
├── architecture.yaml          # Real goal tree (9 goals, 46+ sub-goals)
├── evolved-skills/            # 7 evolved skills (all 100% eval pass)
│   ├── api-system-diagnosis.md
│   ├── assistant-system-management.md
│   ├── claude-code-reference.md
│   ├── development-verification-patterns.md
│   ├── multi-agent-design-patterns.md
│   ├── shell-automation-patterns.md
│   ├── tdd-workflow.md
│   └── workflows.md
├── evolved-agents/            # 3 specialized subagents
│   ├── assistant-explorer.md  (Haiku — fast, read-only exploration)
│   ├── shell-debugger.md      (Sonnet — shell script diagnosis)
│   └── tdd-runner.md          (Sonnet — TDD red-green cycles)
└── evolved-evals/             # 8 eval specs (93 total scenarios)
```

## Key Numbers

| Metric | Value |
|--------|-------|
| System age | 15 days |
| Total instincts generated | 168 (84 active + 84 auto-archived) |
| Evolved skills | 7, all 100% eval pass |
| Eval scenarios | 93 total |
| Evolved agents | 3 |
| Goal tree | 9 root goals, 46+ sub-goals |
| Nightly agent commits | 134 across 11 nights |

## How to Use This

Browse these files to understand what a mature Homunculus system looks like. Key things to notice:

1. **architecture.yaml** — See how goals cascade into sub-goals, each with `purpose`, `metrics`, `health_check`, and `realized_by`
2. **Evolved skills** — See how instincts converge into tested knowledge modules
3. **Eval specs** — See how scenarios test skills with expected behaviors and anti-patterns
4. **Agents** — See how specialized subagents are defined with model choice and tool restrictions

Your system will evolve differently based on your goals and usage patterns. This is just one possible outcome.
