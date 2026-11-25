---
name: purpose-tree
description: The purpose-tree method — how to read, write, and check a project's tree of purposes (why each part exists) separately from its implementations (what currently realizes them). Use when creating, reading, editing, or validating purpose-tree.yaml or architecture.yaml, or when deciding whether a change serves a project's purposes.
---

A project's **purpose tree** records *why* each part of the project exists. Implementations
change often; purposes rarely do. Keeping them apart lets you replace any implementation
without losing sight of what it was for.

## Where the tree lives

- In the project, never in this skill: `purpose-tree.yaml` at the project root.
- If it is missing, look for the legacy name `architecture.yaml`. Read and update whichever
  exists; do not rename it unless asked.
- Create the file lazily: only when the human states the first (root) purpose.

## Purpose, metric, realization

Each node separates three things that change at different speeds:

| Question | Field | Example | Changes |
|---|---|---|---|
| **Why** | `purpose` | "The user never drops a commitment, without having to remember it." | rarely |
| **What to achieve** | `metrics[].healthy` | "0 dropped commitments per week" | sometimes |
| **How, right now** | `realized_by` | "a morning brief at 08:00" | often |

If a `purpose` names a number or target, move it to `metrics`. If it names a tool, file, or
schedule, move it to `realized_by`. Then ask what it is *for*.

## Node format (v3.0)

A purpose is realized by a list of means. A means is either a **concrete implementation**
(a string) or a **sub-purpose** (an object with `purpose`). One list, two kinds — an item
with a `purpose` field is a sub-purpose; anything else is an implementation.

```yaml
version: "3.0"
root:
  id:            root
  purpose:       Why this exists (one sentence)
  status:        active | paused | planned   # default active; retired nodes are deleted
  status_note:   Current state, known gaps
  paused_reason: Required when paused or planned: why, and how to resume
  confirmed:                                 # a human's sign-off; no confirmed = draft
    by: Javan
    on: 2026-11-19
  source:                                    # where a drafted purpose came from
    - kind: doc                              # doc | code | commit | ticket | conversation | other
      ref: README.md:3
  metrics:                                   # list of block mappings, not {...}
    - name: …
      source: …
      healthy: …
  tests:         [test file patterns]
  health_check:                              # the purpose is met on real data; exit 0 = healthy
    command: …
    fails_when: …                            # makes the data empty / env like HEALTH_EMPTY=1; without it, no check
    expected: …
  # or, a check only a human can run:  health_check: {kind: manual, owner, last_run}
  realized_by:
    - scripts/capture.js                     # implementation
    - id: daily_awareness                    # sub-purpose: same node format, recursive
      purpose: Know what matters before the day starts
      realized_by:
        - morning brief job
```

- Every sub-purpose needs a unique `id` so it can be referenced.
- All items in `realized_by` are needed together (AND). Alternatives (OR) are not modeled yet.
- If a sub-purpose is later replaced by a single tool, swap the object for a string.
- Top-level `sync_ignore:` lists noise directories (default `data/`, `drafts/`) that
  sync skips; see the schema.
- **Legacy trees:** a `goals:` map (key = id, value = node) is read as sub-purposes
  appended to `realized_by`. Do not convert unless asked.

Field details and examples: [references/schema.md](references/schema.md).
Blank starting tree: [templates/purpose-tree.yaml](templates/purpose-tree.yaml).

## Draft and confirmed

A node with no `confirmed: {by, on}` is a **draft**: the AI inferred it and no human has said
yes. Drafts are legal, so a dispatched agent that cannot ask still writes the tree. The
validator gives each draft a warning (never an error) and `purpose-review` lists them first
on every run, so they do not sit there unnoticed. Never write `confirmed` on your own; it
records the human's answer. When they confirm, write it with:

```bash
node <this-skill>/scripts/confirm.cjs [tree] --by <name> [--on YYYY-MM-DD] (--all | <node-id>...)
```

Use `source:` on a drafted node instead of a `# src:` comment, so tools can read it.

## When nobody can be asked

A skill run by a dispatched agent (no human in the session) does not ask and does not guess
an answer. It writes the question to `purpose-tree.pending.yaml` at the repo root, commits it
with the work, and reports it:

```bash
echo '{"items":[{"kind":"question","node":"billing","text":"..."}]}' \
  | node <this-skill>/scripts/pending.cjs --source sync|bootstrap|review
```

Any later session reads the file (plain YAML: `items[].text` is the question as asked),
asks the human, applies the answers, then deletes it with `pending.cjs --clear`.
`purpose-review` shows pending items in its output.

## Top-down rule

Two kinds of node, two kinds of authority:

1. **Purposes** (the root and every sub-purpose, at any depth) belong to the human. You may
   draft one — its wording, or a new, split, merged or removed purpose — with each line labeled
   by its source (a doc line or "inferred from code"). The human confirms each by an explicit
   answer. Never write or reword a purpose the human has not confirmed.
2. **Implementations** (the strings in `realized_by`) are yours to propose; the human accepts
   or rejects, and "accept all" covers them.
3. A child must serve its parent. If you cannot say how, it does not belong there.
4. Purposes change only in an explicit review — never as a side effect of daily work.

## Health rules

- **No false greens.** A `health_check` must fail when the data it judges does not exist, and must say how to prove it with `fails_when`:
  `review --run-checks` runs the check again with `fails_when` applied, and a check that still exits 0 is a `false_green`. No `fails_when` = no check.
  Unit tests go in `tests`, not `health_check`. A check only a human can run is `kind: manual` with `owner` and `last_run`.
- **No empty husks.** A `paused` or `planned` node must have a `paused_reason`.
- **No orphans.** Every node except root sits under a parent purpose.

## Validate

```bash
node <this-skill>/scripts/validate.cjs [path-to-tree]
```

Exit 0 = valid; exit 1 prints each problem. Run it after every edit to the tree.
