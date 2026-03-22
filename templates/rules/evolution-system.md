# Evolution System (Homunculus)

## Evolution Artifacts (all in `homunculus/evolved/`)

| Artifact | Location | Evolution Method |
|----------|----------|-----------------|
| **Skills** | `evolved/skills/` | Instinct aggregation (`/evolve`), eval→improve loop |
| **Agents** | `evolved/agents/` | Extract repetitive main-thread patterns into subagents |
| **Evals** | `evolved/evals/` | Accompany each skill, scenario-based testing |

## Evolution Flow

```
Observe (observations.jsonl) → Pattern detection (confidence > 0.7) → instincts/personal/*.md
                                                                            ↓
                                                               /evolve → evolved/skills/*.md
                                                                            ↓
                                                               eval → improve loop → 100% pass
```

## Manual Triggers
- `/evolve` — Aggregate instincts into a skill
- `/eval-skill` — Test a skill against its eval spec
- `/improve-skill` — Auto-improve until eval passes

## Automatic Maintenance
- Instinct extraction from session observations
- Instinct pruning (confidence decay, skill coverage check)
- Skill eval → improve pipeline
