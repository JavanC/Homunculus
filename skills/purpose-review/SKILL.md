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

The AI may **draft** the root and first layer, labeled by source. The human confirms
every line. Do not open with "Why does this project exist?" when the repo has material
to draft from.

1. **Read first.** Read every file in `intent_docs` (README, CLAUDE.md/AGENTS.md, product
   brief, ADRs, docs/) and the full `inventory`, including each entry's `areas` (one level
   deeper, e.g. `src/compliance/`). Every area must end up under a purpose or a gap line.
2. **Draft the root and first layer together.** Root = one sentence of *why*. First layer =
   3–6 purposes that serve the root, each with the inventory entries/areas that realize it.
   Every line carries its source: `(from doc: README.md:3)` or `(inferred from code: src/sync/)`.
3. **Self-check the draft before showing it.** Fix, don't just note:
   - **Means as purposes.** A proposed purpose that names a tool, product, platform, or
     file ("iOS app + Supabase", "subscription", "the CLI") is a means: move it into the
     `realized_by` of the purpose it serves.
   - **Sibling overlap.** Two siblings that would be satisfied by the same work are one
     purpose: merge them.
   - **Mixed root.** If the root sentence also carries origin story, constraints, or
     targets, split them out: constraints/targets → `metrics` or children; background →
     `status_note`. The root keeps only the why.
   - **Coverage.** Inventory areas that fit no purpose go under a **gap** line, not into an
     invented purpose.
4. **Ask what code cannot show.** If any draft line is inferred from code, add direct
   questions for what code cannot reveal: profit or revenue goal, the owner's own use,
   community or audience, purposes not built yet.
5. Show root + first layer + gaps + questions as **one numbered list** and ask once:
   "Accept all? (or e.g. 'reject 2', '3: reword to …')". Unanswered items count as rejected.
   A rejected or unanswered root means no tree yet: ask for the root in one sentence.
6. Write `purpose-tree.yaml` from the [template](../purpose-tree/templates/purpose-tree.yaml)
   with the accepted nodes, set `last_synced:` to the current `HEAD`, and validate.
   Deeper levels grow later through `purpose-sync`; do not draft them now.

**Empty or near-empty repo** (no intent docs and almost no inventory): there is nothing to
draft from. Ask exactly one question — "Why does this project exist? (one sentence)" —
use the answer as the root, then continue from step 2 for the first layer.

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

- Never write an upper purpose the human has not confirmed. Draft with sources; the human decides.
- Commit nothing unless asked.
- Do not re-review nodes the human already kept in this run.
