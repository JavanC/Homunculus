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

`--run-checks` runs each node's `health_check` command (30 s limit each), then runs it again with its `fails_when` applied (a negative control: the second run must fail). These are the
project's own commands; if any looks destructive, run without the flag and ask first.
The output's `mode` decides the next step.

## Bootstrap (`mode: bootstrap` — no tree yet)

The AI may **draft** the root and first layer, labeled by source. The human confirms
every line; until then a node is a draft (no `confirmed`). Do not open with "Why does this project exist?" when the repo has material
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
   with the accepted nodes, set `last_synced:` to the current `HEAD`, and validate. Give each
   accepted node `confirmed` with `confirm.cjs --by <the human>`; give each drafted line a
   `source:` list instead of a comment.
   Do not draft deeper levels now; a later full review grows them (purpose-structure pass).
   `purpose-sync` never adds purposes.

**Nobody to ask?** If no human can answer in this session (you were dispatched by another
agent, or the run is non-interactive), still write the tree: the drafted root and first
layer as drafts, with `source:` and no `confirmed`. Put the numbered questions and gap lines
of step 5 in the pending file instead of asking:

```bash
echo '{"items":[{"kind":"question","text":"Is the root: \"...\"?"}, {"kind":"draft","node":"sync","text":"..."}]}' \
  | node <purpose-tree-skill>/scripts/pending.cjs --source bootstrap
```

Commit both files and report. A later session with a human asks the questions from the file,
confirms the nodes they accept, and clears the file.

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
| `unconfirmed` (always first) | Nodes no human has confirmed, shallowest first. One item: list them and ask which to confirm; an answer "confirm" is recorded with `--record` (`confirm`). Shown every run, so drafts do not sit quietly. |
| `pending` | Items an earlier run left in `purpose-tree.pending.yaml`: show their `text` as asked, with the other items, then clear the file once answered. |
| `changes_since_synced` | The diff since `last_synced` (noise left out: sync_ignore, lockfiles, tests, docs). Use it as evidence: `unmatched` paths and `moved_or_deleted` become gap and `realized_by` items. `over_limit` means the tree is far behind: say so. `null` when purpose-sync is not installed. |
| `problems` | Fix proposal for each validation error. |
| `missing_paths` | The implementation is gone: update `realized_by`, or flag the node as a gap. |
| `nodes_without_implementation` | Gap: build something, mark it `planned` with a `paused_reason`, or delete the purpose. |
| `coarse_implementations` | One directory realizes a node but holds 3+ feature areas. Look at whether the areas serve different whys; if they all serve this purpose, say nothing. Not by itself a reason to split. Any other item about the same node joins this one. |
| `unowned` | Gap: which purpose does this serve? If none, should it exist? An entry with `noted_by` is already named in those nodes' `status_note` or `paused_reason`: read the note first. If it records a decision, raise nothing; raise it only if the note is out of date or the decision was never carried out. |
| `stale` (paused/planned) | Resume, keep with an updated reason, or delete. Skip it if `reviewed` has a `stale` entry without `reask`. |
| `stale` (active) | Is this purpose still true? Skip it if `reviewed` has a `stale` entry without `reask`. |
| `health_checks` with `status: failing` | The purpose is not being met, or the check is wrong. Say which you think. |
| `status: false_green` | The check exits 0 even with its `fails_when` applied. It judges nothing: propose a check that would fail, or a better `fails_when`. |
| `status: no_check` | The node claims a `health_check` without `fails_when`. It counts as no check: propose a `fails_when`, `kind: manual`, or move it to `tests`. |
| `status: negative_error` | The `fails_when` itself failed or timed out. Fix it. |
| `status: manual_overdue` | A manual check is older than its `every_days`. Ask the `owner` to run it and update `last_run`. |
| `status: ok` / `manual_ok` | Nothing to raise. |

These are **health facts**. They are shown every run until fixed or the node is `paused`;
`reviewed` never hides them, and a check that keeps failing is not new evidence for a
suggestion.

### Improvement pass (suggestions)

After the facts, look for **suggestions**: changes nobody asked for that would serve a purpose
better. Evidence comes only from the last `window_days` (default 30, `--days N`);
`commits_by_node` lists each node's commits in that window. It is `null` with `commits_error` when git log failed: say the commit evidence is unavailable, never "no commits". A review run less than monthly
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

**Before listing a suggestion, check `reviewed`** (what `--record` wrote) (that node's answered suggestions):
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
2. **Record every suggestion item you showed** with `--record`; do not edit `reviewed` by
   hand. Write the answers as JSON, then:

   ```bash
   node <this-skill>/scripts/review.cjs --record answers.json     # or: --record - < answers.json
   ```

   ```json
   {"on": "2026-10-29",
    "answers": [{"node": "poller", "kind": "better_means", "said": "replace the hourly poll with a webhook",
                 "answer": "declined", "evidence": "scripts/poll.js, 4 fixes in 30 days"}],
    "confirm": [{"node": "sync", "by": "Javan"}]}
   ```

   `answer` is `declined` (rejected or unanswered), `kept` or `accepted`. An entry for the
   same `kind` and `said` is updated, not duplicated. `confirm` lists nodes the human said
   yes to. It writes the tree, checks it stays valid and writes nothing otherwise. Health
   facts and held items are not recorded, except a `stale` answer: record it as
   `kind: stale`, so the node is asked again only after the stale threshold.
3. Validate. Never leave an invalid tree:

   ```bash
   node <purpose-tree-skill>/scripts/validate.cjs
   ```

4. End with one line:

   ```
   purpose-review: mode=<bootstrap|review> items=<N> accepted=<N> rejected=<N>
   ```

**Nobody to ask?** Do not ask and do not apply. Put each item you would have shown in
the pending file (`pending.cjs --source review`), commit it, and report. Do not record
`reviewed` answers for items nobody answered.

## Rules

- Never write a purpose the human has not confirmed. Draft with sources; the human decides.
- Commit nothing unless asked.
- Do not re-review nodes the human already kept in this run.
