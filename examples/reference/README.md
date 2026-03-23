# Reference Implementation

This is a snapshot of a real Homunculus system after **16 days of evolution** (1,270 commits).

## What's Here

```
reference/
├── architecture.yaml          # Real goal tree (9 goals, 46+ sub-goals)
├── evolved-skills/            # 10 evolved skills (all 100% eval pass)
│   ├── api-system-diagnosis.md
│   ├── assistant-system-management.md
│   ├── claude-code-reference/    # Split into index + 11 chapters (95% context reduction)
│   │   ├── index.md              # Routing table — loads chapters on demand
│   │   ├── ch01-extensions.md
│   │   ├── ch02-agents.md
│   │   ├── ch03-hooks.md
│   │   ├── ch04-mcp.md
│   │   ├── ch05-ui.md
│   │   ├── ch06-rules-security.md
│   │   ├── ch07-model-memory.md
│   │   ├── ch08-workflows.md
│   │   ├── ch09-integrations.md
│   │   ├── ch10-cli-sdk.md
│   │   └── ch11-output-versions.md
│   ├── development-verification-patterns.md
│   ├── multi-agent-design-patterns.md
│   ├── shell-automation-patterns.md
│   ├── tdd-workflow.md
│   └── workflows.md
├── evolved-agents/            # 3 specialized subagents
│   ├── assistant-explorer.md  (Haiku — fast, read-only exploration)
│   ├── shell-debugger.md      (Sonnet — shell script diagnosis)
│   └── tdd-runner.md          (Sonnet — TDD red-green cycles)
└── evolved-evals/             # 10 eval specs (117 total scenarios)
```

## Key Numbers

| Metric | Value |
|--------|-------|
| System age | 15 days |
| Total instincts generated | 174 (90 active + 84 auto-archived) |
| Evolved skills | 10, all 100% eval pass |
| Eval scenarios | 117 total |
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
