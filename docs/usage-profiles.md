# Usage Profiles

Homunculus is designed to run on both subscription plans and API billing.
Subscription users should optimize for quota headroom, not dollar cost.

## Profiles

| Profile | Best for | Default behavior |
|---------|----------|------------------|
| `pro` | $20 Pro users, small repos, light nightly automation | Minimal evolution: harvest, route, sync. Research and experiments off by default. |
| `max5x` | $100 Max users doing daily coding | Standard evolution: 1-2 research topics, 1 experiment, no unbounded bonus loop. |
| `max20x` | $200 Max users and large repos | Full evolution with bounded parallelism and optional bonus loop. |
| `api` | Pay-as-you-go users | Standard evolution; enforce spend caps outside Homunculus. |

Install with:

```bash
npx homunculus-code init --plan pro
npx homunculus-code init --plan max5x
npx homunculus-code init --plan max20x
npx homunculus-code init --plan api
```

## Guardrails

Homunculus classifies quota into four levels:

| Level | Meaning | Behavior |
|-------|---------|----------|
| `full` | Plenty of quota remains | Run configured phases. |
| `half` | Session or weekly usage is tight | Bound optional work to small batches. |
| `skip` | Weekly usage is over budget | Skip optional research and experiments. |
| `mp_empty` | 5-hour session is nearly exhausted | Stop and wait for reset. |

Usage cache data is optional. When it is absent, `status` and `night` report
`unknown` and continue with conservative defaults.

## Practical Guidance

- Pro: keep `tier: minimal`; run research manually or weekly.
- Max 5x: use `tier: standard`; keep bonus loop off.
- Max 20x: use `tier: full`; cap parallel agents and reserve Opus for planning or review.
- API: track spend externally; Homunculus cannot infer your billing policy.

Claude Code subscription usage is shared with Claude.ai and Claude Desktop.
Long conversations, large file attachments, tool use, model choice, and parallel
Claude Code instances all consume quota faster.
