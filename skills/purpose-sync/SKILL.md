---
name: purpose-sync
description: At the end of a work session, propose updates to a project's purpose tree so each purpose's realized_by matches what the code now does, and flag changes that serve no purpose. Use when wrapping up a session in a project that has purpose-tree.yaml or architecture.yaml, or when asked to sync the purpose tree.
---

Keep the project's purpose tree in step with its implementations. Uses the
[purpose-tree](../purpose-tree/SKILL.md) method; read it first if you have not.

You touch `realized_by` and `last_synced`. A `purpose` changes only when the human
explicitly accepts a session-end review item (step 2b); never edit one on your own.

## Steps

1. **Collect changes.** Run:

   ```bash
   node <this-skill>/scripts/changes.cjs [--session-base <commit>]
   ```

   `--session-base` is the commit `HEAD` was at when this session started (for a branch made
   for this task: `git merge-base HEAD <main branch>`). Without it, "this session" means the
   uncommitted and untracked files only.

   It prints JSON: the tree file, the base commit (the tree's `last_synced`, or the last
   commit that touched the tree), every changed path since then (committed and not), and
   for each path the node ids whose `realized_by` mentions it. `touched_any` lists every
   path changed by any commit in the range (plus uncommitted ones), with its nodes; a path
   changed and then reverted still appears there. Paths under the tree's `sync_ignore`
   directories (default `data/`, `drafts/`) are left out everywhere; `ignored` counts them.
   Exit 2 = no tree here: stop silently.
   Exit 4 = the tree exists but does not parse: print exactly
   `purpose-sync: skipped reason=unparseable file=<tree>` as your last line, change
   nothing, and let the session end continue (`purpose-review` can rebuild the tree).
   Exit 3 = setup problem (skill missing, not a git repo, unknown `--session-base`): report
   it in one line and stop.

   **Far behind?** `lag` is the number of changed files that reach a node's `realized_by`
   (noise directories excluded). When `over_limit` is true (`lag` > `lag_limit`, 50), the
   range is too old to sync item by item, so narrow it; still propose:
   - only `session_unmatched` (this session's files that match no node), and
   - `moved_or_deleted` (renames and deletions, anywhere in the range, that leave a
     `realized_by` entry pointing at nothing).

   Say in one line that the tree is `<lag>` files behind and a tree review
   (`purpose-review`) catches it up. Do not move `last_synced` in this mode (step 5). Reset
   the baseline only when the human explicitly asks for it.

2. **Decide proposals.** Work from that JSON, not from memory of the session. Use the
   conversation only to understand *why* something changed.
   - A node's implementation was renamed, moved, or deleted → update its `realized_by`.
   - A node gained a new implementation → add it to that node's `realized_by`.
   - A changed path matches no node (`unmatched`) and is real functionality → propose
     which existing purpose it serves. If none fits, flag it as a **gap**; do not invent
     a purpose.
   - A node now has no implementation left → flag it as a **gap**.
   - A change with `match: coarse` reached its node only through a directory prefix, inside
     a subdirectory that is new since base. Ask: "does `<subdir>` serve `<node>`, or another
     purpose?". Exact matches and renames are never marked.
   - Tests, formatting, lockfiles, and docs-only edits are not proposals.

2b. **Session-end review.** Look only at the nodes this session touched and their parents:
   start from the nodes in `touched_any` (the range can include other sessions' commits),
   and narrow them to this session using the conversation.
   Raise a **review** item when one of these holds:
   - (a) Several implementations of the same purpose were replaced in this session.
   - (b) The node is in `churn`: its `realized_by` already changed 3+ times in 30 days.
     Endless tweaking usually means the purpose is unclear (rabbit-holing).
   - (c) New functionality fits no purpose and looks like a new direction, not a stray file.
   A review item is a question, not an edit: "Is `<id>` still about '<purpose>'?" or "Is
   this a new purpose, or should it not exist?". If the human answers with a new wording,
   apply it; otherwise change nothing. Use the conversation to judge (a) and (c); do not
   go back to older sessions.

3. **If there is nothing to show (no proposal, gap or review): say nothing.** Skip
   step 5 and leave the tree file untouched; print the summary line.

4. **Otherwise ask once.** One numbered list, then one question:

   ```
   Purpose tree — 3 proposals
   1. daily_awareness: realized_by "cron brief" → "scripts/brief.js"
   2. offline_reading: add "app/cache/"
   3. gap: scripts/export.js serves no purpose — which purpose is it for?
   4. review: daily_awareness changed 4 times in 30 days — still "Know what matters before the day starts"?
   Accept all? (or e.g. "reject 2", "3: serves sync_progress")
   ```

   Do not ask follow-up questions. Anything left unanswered counts as rejected.

   **Nobody to ask?** If no human can answer in this session (you were dispatched by
   another agent, your instructions say to report to a lead or not to ask, or the run is
   non-interactive), do not ask and do not write the tree. Record the items as pending:

   ```bash
   echo '{"items":[{"kind":"proposal","text":"offline_reading: add \"app/cache/\""},
                   {"kind":"gap","text":"scripts/export.js serves no purpose — which purpose is it for?"}]}' \
     | node <this-skill>/scripts/pending.cjs
   ```

   `kind` is `proposal`, `gap` or `review`; `text` is the line you would have shown. It
   prints a `purpose-sync-pending` block and, as its last line,
   `purpose-sync: pending proposed=<N> gaps=<N> reviews=<N>`. Put the whole output, block
   included, in your report to whoever dispatched you, and end there: skip steps 5 and 6.
   The lead asks the human (several projects' blocks can go in one batch) and passes the
   answers back to a session in this repo, which does step 5 with them.

5. **Apply.** Edit only the accepted `realized_by` entries. Set the top-level
   `last_synced:` to the current `HEAD` commit when at least one item was shown (answered
   or not, so the same items are not raised again), or when the human asked to reset the
   baseline. Otherwise do not write the file. When `over_limit` was true, do not move
   `last_synced` unless the human asked for a reset: the backlog stays visible.

   **Answers to a pending block** (from a lead): check that `repo:` and `tree:` name this
   project and tree. Apply the accepted items; an item whose path no longer exists or whose
   node is gone counts as rejected. Set `last_synced` to the block's `last_synced_on_apply`
   commit (not the current `HEAD`: later commits were not shown to the human); `keep` means
   leave it, and so does a `last_synced` already at or past that commit (never move it back). Then validate as below and print the summary line of step 6, counting the
   block's items.

   ```bash
   node <purpose-tree-skill>/scripts/validate.cjs
   ```

   If validation fails, fix your edit or revert it. Never leave an invalid tree.

6. **Print the summary line** as the last line of your output, exactly:

   ```
   purpose-sync: proposed=<N> accepted=<N> rejected=<N> gaps=<N> reviews=<N>
   ```

   `reviews` counts the review items raised in step 2b. A pending run prints the pending
   line instead (step 4); applying its answers later prints this line.

   This skill stores nothing else. A host that wants to learn from these numbers reads
   this line.

## Rules

- Propose implementations only: paths added to or removed from `realized_by`. To change a
  purpose (its wording, or adding, splitting, merging or removing one), use 2b or raise a
  review item instead.
- For a tree-wide check (gaps outside this session, stale nodes, failing health checks),
  the human runs the `purpose-review` skill. Do not do that here.
- Commit nothing yourself unless the user asks; the tree edit is part of their work.
