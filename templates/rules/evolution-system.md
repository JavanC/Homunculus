# Evolution System (Homunculus)

## Evolution Artifacts (all in `homunculus/evolved/`)

| Artifact | Location | Evolution Method |
|----------|----------|-----------------|
| **Skills** | `evolved/skills/` | Instinct aggregation (`/evolve`), eval→improve loop |
| **Agents** | `evolved/agents/` | Extract repetitive main-thread patterns into subagents |
| **Evals** | `evolved/evals/` | Accompany each skill, scenario-based testing |

## Evolution Flow

```
Observe (observations.jsonl) → Three-layer extraction:
  ├── Instincts (behavioral patterns, confidence > 0.7, Write Gate)
  │       ↓ supersedes check → auto-archive replaced instincts
  │       ↓ /evolve → route to best mechanism (hook/rule/skill/script/agent/...)
  │       ↓ if skill → eval → improve loop → 100% pass
  ├── Memory suggestions → reports/memory-suggestions.jsonl (user reviews)
  └── Research topics → reports/research-queue.jsonl (nightly agent picks up)
```

## Manual Triggers
- `/evolve` — Route instincts to the best mechanism (skill is just one of 8)
- `/eval-skill` — Test a skill against its eval spec
- `/improve-skill` — Auto-improve until eval passes

## Automatic Maintenance
- Three-layer extraction: instincts + memory + research from sessions
- Semantic dedup: new instincts auto-archive superseded ones
- Smart pruning: reference frequency + 3-tier skill coverage + confidence decay (14-day grace)
- Skill eval → improve pipeline
