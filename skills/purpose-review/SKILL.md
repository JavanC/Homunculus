---
name: purpose-review
description: Build a purpose tree for a project that has none, or review an existing one as a whole — tree-wide gaps, implementations that no longer exist, stale nodes, failing health checks. Use only when the human asks to build, bootstrap, or review the purpose tree (e.g. "build a purpose tree", "review the tree").
---

Build or review a project's purpose tree. Uses the [purpose-tree](../purpose-tree/SKILL.md)
method; read it first. Runs only when the human asks — it may change upper purposes, so the
human must be present.

Session-end checks belong to `purpose-sync`. This skill covers what a single session
cannot see.

## Step 1 — Collect facts

```bash
node <this-skill>/scripts/review.cjs --run-checks
```

`--run-checks` runs each node's `health_check` command (30 s limit each). These are the
project's own commands; if any looks destructive, run without the flag and ask first.
The output's `mode` decides the next step.

## Bootstrap (`mode: bootstrap` — no tree yet)

1. Ask exactly one question: **"Why does this project exist? (one sentence)"**. That
   answer is the root `purpose`. Never infer the root from the code: code shows what a
   project does, not why.
2. Read the `inventory` entries (and the README) to understand the main areas.
3. Propose first-layer purposes — each one a *why* that serves the root — and list under
   each the inventory entries that realize it. Aim for 3–6. Put entries that fit none
   under a **gap** line instead of inventing a purpose for them.
4. Show the draft as one numbered list and ask once: "Accept all? (or e.g. 'reject 2',
   '3: reword to …')". Unanswered items count as rejected.
5. Write `purpose-tree.yaml` from the [template](../purpose-tree/templates/purpose-tree.yaml)
   with the accepted nodes, set `last_synced:` to the current `HEAD`, and validate.
   Deeper levels grow later through `purpose-sync`; do not draft them now.

## Full review (`mode: review`)

Turn the facts into items. Skip anything with nothing to say.

| Fact | Item |
|---|---|
| `problems` | Fix proposal for each validation error. |
| `missing_paths` | The implementation is gone: update `realized_by`, or flag the node as a gap. |
| `nodes_without_implementation` | Gap: build something, mark it `planned` with a `paused_reason`, or delete the purpose. |
| `unowned` | Gap: which purpose does this serve? If none, should it exist? |
| `stale` (paused/planned) | Resume, keep with an updated reason, or delete. |
| `stale` (active) | Is this purpose still true? |
| `health_checks` with non-zero `exit` | The purpose is not being met, or the check is wrong. Say which you think. |
| `health_checks` that pass | Would it fail if its data were empty? If not, it is a false green: propose a stronger check. |

Then:

1. Show **one numbered list**, most important first, at most 10 items. If there are more,
   say how many were left for next time.
2. Ask once: "Accept all? (or e.g. 'reject 2', '4: …')". No follow-up questions.
3. Apply only accepted items. Upper purposes change only with an explicit answer.
4. Validate. Never leave an invalid tree:

   ```bash
   node <purpose-tree-skill>/scripts/validate.cjs
   ```

5. End with one line:

   ```
   purpose-review: mode=<bootstrap|review> items=<N> accepted=<N> rejected=<N>
   ```

## Rules

- Never invent an upper purpose. Propose; the human decides.
- Commit nothing unless asked.
- Do not re-review nodes the human already kept in this run.
