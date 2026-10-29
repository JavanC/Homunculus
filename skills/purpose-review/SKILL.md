---
name: purpose-review
description: Build a purpose tree for a project that has none, or review an existing one as a whole — tree-wide gaps, implementations that no longer exist, stale nodes, failing health checks. Use only when the human asks to build, bootstrap, or review the purpose tree (e.g. "build a purpose tree", "review the tree").
---

Build or review a project's purpose tree. Uses the [purpose-tree](../purpose-tree/SKILL.md)
method; read it first. Runs only when the human asks — it may change purposes, so the
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
   Do not draft deeper levels now; a later full review grows them (purpose-structure pass).
   `purpose-sync` never adds purposes.

**Empty or near-empty repo** (no intent docs and almost no inventory): there is nothing to
draft from. Ask exactly one question — "Why does this project exist? (one sentence)" —
use the answer as the root, then continue from step 2 for the first layer.

## Unparseable tree (`mode: unparseable` — exit 4)

The tree file exists but cannot be read; `error` says why. Show one numbered list:
first the error (if it is a small fix, such as a tab or a `{...}` mapping, propose that fix),
then the offer to rebuild the tree through Bootstrap, reading the old file as one more
intent doc. Ask once. On rebuild, rename the old file to `<name>.old` first — never delete
it — then follow Bootstrap with the `intent_docs` and `inventory` in this output.

## Full review (`mode: review`)

Turn the facts into items. Skip anything with nothing to say.

| Fact | Item |
|---|---|
| `problems` | Fix proposal for each validation error. |
| `missing_paths` | The implementation is gone: update `realized_by`, or flag the node as a gap. |
| `nodes_without_implementation` | Gap: build something, mark it `planned` with a `paused_reason`, or delete the purpose. |
| `coarse_implementations` | One directory realizes a node but holds 3+ feature areas. Look at whether the areas serve different whys; if they all serve this purpose, say nothing. Not by itself a reason to split. Any other item about the same node joins this one. |
| `unowned` | Gap: which purpose does this serve? If none, should it exist? |
| `stale` (paused/planned) | Resume, keep with an updated reason, or delete. |
| `stale` (active) | Is this purpose still true? |
| `health_checks` with non-zero `exit` | The purpose is not being met, or the check is wrong. Say which you think. |
| `health_checks` that pass | Would it fail if its data were empty? If not, it is a false green: propose a stronger check. |

These are **health facts**. They are shown every run until fixed or the node is `paused`;
`reviewed` never hides them, and a check that keeps failing is not new evidence for a
suggestion.

### Improvement pass (suggestions)

After the facts, look for **suggestions**: changes nobody asked for that would serve a purpose
better. Evidence comes only from the last `window_days` (default 30, `--days N`);
`commits_by_node` lists each node's commits in that window. A review run less than monthly
may miss some.

| Kind | Raise it when | Item |
|---|---|---|
| `better_means` | A node's check fails or is a false green, `commits_by_node` shows repeated fixes, or another finding in the window shows the current means is the wrong kind. No evidence → no item. | Replace the means with …, and why. |
| `ticket` | A finding in the window (failing check, repeated fixes, a problem stated in a session) is worth tracking. | Title · purpose id · evidence (commit / file:line / session) · done when. If the host has a tracker, search it and drop duplicates; otherwise mark "not checked for duplicates". |
| `repeated_work` | Only with `--sessions`: the same manual work in 3+ sessions that nothing in the tree realizes yet. | The means that fits: fixed steps → script or hook; needs judgment → skill; a constraint kept every time → rule; periodic → scheduled job; a manual check → `health_check`. Rare or not worth automating → no item. |

### Purpose-structure pass (suggestions)

Layers below the first grow here, and only here. Every item is a **draft with sources**
(paths, areas, commits) that the human confirms by an explicit answer; "accept all" does
not cover it. Same `reviewed` check and order rules as the improvement pass.

| Kind | Trigger | Item |
|---|---|---|
| `grow_children` | The node is in `spread` (its implementations fall in 3+ feature areas) or `coarse_implementations`. | Draft sub-purposes only where the areas serve **different whys**; areas serving the same why stay together, and then say nothing. Directory layout is the trigger, not the answer. |
| `split` | The node's implementations serve clearly different whys (with or without a trigger). | Two or more purposes, each with the implementations it takes. |
| `merge` | Siblings in `shared_implementations`, or siblings that the same work would satisfy. | One purpose, with the wording drafted. |
| (gap) | `unowned` entries, using their `areas`. | Group them by area and draft the purpose each group suggests, with sources; or ask whether it should exist. |

For one node, `coarse_implementations`, `spread` and any structure item are one item.

**`--sessions` (opt-in, off by default).** Add it only when the human asks for repeated-work
detection. The script reads this host's local transcripts for this repo (Claude Code only;
`~/.claude/projects/`) and prints, per session, its date, the first line of each request
(secrets, emails and handles replaced) and each shell command cut to command + subcommand.
That output reaches the model as tool output, like any file you read; the skill stores and
sends nothing else. Patterns miss some secrets, so say so when you use it.
`session_signals.supported: false` means it could not read them — say that, never "no
repeats".

**Before listing a suggestion, check `reviewed`** (that node's answered suggestions):
- Same suggestion, same kind, no evidence beyond what the entry cites → do not show it.
- A different suggestion of the same kind → show it.
- Unsure → show it, marked "may repeat <on>: <said>". A repeat costs one line; a wrong
  suppression hides an item silently.
- An entry with `reask: true` (a `stale` answer older than the stale threshold) → ask again.
- An entry whose evidence is clearly gone (paths, check or siblings removed) → you may
  propose dropping it, as an item in the same list. Being outside the window is not "gone".

### One list, top down

1. **Order.** Health facts first. Then suggestions by depth (`nodes.<id>.depth`): root, then
   layer 1, and so on.
2. **Hold descendants of an open change.** If an item would change a node's purpose or
   structure, or replace its means, leave out suggestions about its descendants and say
   "N items under `<id>` held until it is settled". Health facts under it still show. Held
   items are not recorded; next run recomputes them.
3. **Budget: at most 10 items.** Health facts take at most 6; if there are more, the 6th is
   one summary item ("N more health issues: …"). At least 4 slots stay for suggestions when
   there are any. Say how many suggestions were left for next time.
4. Ask once: "Accept all? (or e.g. 'reject 2', '4: …', 'open 3, 5')". No follow-up
   questions. Unanswered items count as declined.
5. **Authorization.** "Accept all" covers `realized_by` changes only. A purpose's wording,
   or adding, splitting, merging or deleting a purpose, needs an explicit answer to that
   item. A ticket is opened only when the human names its number ("open 3"); "accept all"
   never opens tickets.

### Apply

1. Apply only accepted items. Purposes change only with an explicit answer.
2. **Record every suggestion item you showed** under its node's `reviewed` (block mappings
   only, never `{...}`):

   ```yaml
   reviewed:
     - kind: better_means
       said: replace the hourly poll with a webhook
       answer: declined        # declined (rejected or unanswered) | kept | accepted
       on: 2026-10-29
       evidence: scripts/poll.js, 4 fixes in 30 days
   ```

   If an entry for the same suggestion exists, update its `answer` and `on` instead of
   adding one. Health facts and held items are not recorded.
3. Validate. Never leave an invalid tree:

   ```bash
   node <purpose-tree-skill>/scripts/validate.cjs
   ```

4. End with one line:

   ```
   purpose-review: mode=<bootstrap|review> items=<N> accepted=<N> rejected=<N>
   ```

## Rules

- Never write a purpose the human has not confirmed. Draft with sources; the human decides.
- Commit nothing unless asked.
- Do not re-review nodes the human already kept in this run.
