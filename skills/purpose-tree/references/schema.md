# Purpose Tree Schema v3.0

A tree file has two top-level keys: `version: "3.0"` and `root` (a node). Other top-level
keys are allowed and ignored by the validator (projects may keep their own config there),
except these, which the skills read (the validator checks `sync_ignore`):

| Key | Type | Meaning |
|---|---|---|
| `last_synced` | commit | Written by `purpose-sync`: changes up to this commit have been synced. |
| `sync_ignore` | list of directories ending in `/` | Noise directories (generated data, drafts) that sync never looks at, relative to the repo root. Default `[data/, drafts/]`; `[]` turns it off. Do not list a directory a node realizes. |

## Node fields

| Field | Required | Type | Meaning |
|---|---|---|---|
| `id` | sub-purposes only | string | Unique across the tree. Used to reference the node. |
| `purpose` | yes | string | **Why** this exists. One sentence. No tools, files, schedules, or numbers. |
| `realized_by` | no | string or list | **How, right now.** Each item is an implementation (string) or a sub-purpose (node). |
| `status` | no | `active` \| `paused` \| `planned` | Default `active`. A retired purpose is deleted, not kept. |
| `paused_reason` | when paused/planned | string | Why it is not active, and what would resume it. |
| `status_note` | no | string | Current state, known gaps. |
| `metrics` | no | list of `{name, source, healthy}` | **What to achieve.** `healthy` is the target. |
| `tests` | no | list of strings | Test file patterns: **the implementation is correct**. Unit tests go here, never in `health_check`. |
| `health_check` | no | `{command, fails_when, expected?}` or `{kind: manual, owner, last_run, every_days?}` | **The purpose is met on real data.** Exit 0 = healthy. Counts only with `fails_when`. See below. |
| `agents` | no | list | Legacy: agents serving this purpose. Prefer listing them in `realized_by`. |
| `goals` | no | map | Legacy: `{id: node}` children. Read as sub-purposes. |
| `reviewed` | no | list of block mappings | Suggestions a full review showed about this node, with the answer. Written by `purpose-review`; see below. |
| `confirmed` | no | `{by, on}` | A human confirmed this node's purpose. Missing = draft: a warning, not an error. See below. |
| `source` | no | list of `{kind, ref, note?}` | Where a drafted purpose was inferred from. See below. |

Any other field is an error, so typos surface.

## `realized_by`: one list, two kinds

```yaml
realized_by:
  - scripts/sync.js                 # implementation: a string
  - id: offline_first               # sub-purpose: has `purpose`
    purpose: Work stays usable without a network.
    realized_by:
      - local SQLite cache
```

- An object without `purpose` is an error: it is neither kind.
- All items are needed together (AND). Alternatives (OR) are not modeled yet.
- A single implementation may be written as a plain string instead of a list.

## `health_check` must fail on missing data (and prove it)

The check judges the data the purpose depends on, not that a file exists.

| Not a check (passes on empty data) | A check |
|---|---|
| `test -f data/log.jsonl` | `node scripts/check-log.js --require-entries-since 24h` |
| `test -x scripts/run.sh` | `scripts/run.sh --dry-run && test -s out/result.json` |
| `ls logs/ \| head` | `find logs -name '*.log' -mtime -1 \| grep -q .` |
| `wc -l data.jsonl` | `test "$(wc -l < data.jsonl)" -gt 0` |

`fails_when` is how a check proves it can fail. It is one of:

- an env assignment such as `HEALTH_EMPTY=1` (plain `NAME=value` tokens, no quotes): the check is run again with it set, and the check script must honor it;
- a shell command that empties the data (`: > data/log.jsonl`): `review --run-checks` runs it, then the check, in a throwaway copy of the project (regular files only: no `.git`, `node_modules` or symlinks). Use paths relative to the project: an absolute path or `~` is not isolated and acts on the real file.

The check must also pass in that copy before `fails_when` is applied; if not, the status is `negative_error` (a check that needs `.git` or a symlinked file belongs in the env form).

The check must exit 0 on real data and non-zero with `fails_when` applied. If it still exits 0, `review` reports `false_green`.
Without `fails_when` the check counts as no check (`no_check`), not as green. The validator warns about it, and about a command that is only an existence or count probe.

```yaml
health_check:
  command: test -s data/log.jsonl
  fails_when: ": > data/log.jsonl"
```

`fails_when` must be a string.

A check a machine cannot run is written as a manual check. `review` reports `manual_overdue` when `last_run` is older than `every_days` (default 30):

```yaml
health_check:
  kind: manual
  owner: Javan
  last_run: 2026-11-20
  every_days: 14
```

## `tests` vs `health_check`

| | `tests` | `health_check` |
|---|---|---|
| Question | Is the implementation correct? | Is the purpose met right now? |
| Runs on | Fixtures | Real data |
| Fails when | The code is wrong | The world is not as the purpose wants (e.g. continuity over target) |
| Example | `tests/test_parse.py` | `test -s data/log.jsonl` with `fails_when: ": > data/log.jsonl"` |

A unit-test or validator run in `health_check` is a false green: it goes green on any real data. Move it to `tests`.
Only write `health_check` for a purpose you want watched, so the cost of `fails_when` is paid where it matters.

## `confirmed`: who said yes

```yaml
confirmed:
  by: Javan
  on: 2026-11-19
```

`by` is a name, `on` is `YYYY-MM-DD`; block mapping only. A node without `confirmed` is a
draft: the validator warns, `purpose-review` lists it first in `unconfirmed`. It says nothing
about whether the node is built (that is `status`). Write it only on the human's answer
(`scripts/confirm.cjs`). Do not use `status: proposed` for this.

## `source`: where a draft came from

```yaml
source:
  - kind: doc            # doc | code | commit | ticket | conversation | other
    ref: README.md:3
    note: stated in the intro   # optional
```

Replaces `# src:` comments. `kind` and `ref` are required.

## `purpose-tree.pending.yaml`: unanswered questions

Written next to the tree when no human could be asked (`scripts/pending.cjs`); not part of
the tree and not validated with it. Fields: `repo`, `tree`, `head`, optional
`last_synced_on_apply`, and `items`, each `{n, source: sync|bootstrap|review, kind:
proposal|gap|review|question|draft, node?, text}`. Delete the file once its answers are applied.

## `reviewed`: answered suggestions

One entry per suggestion item `purpose-review` showed about the node, so the same
suggestion is not raised again without new evidence. Block mappings only.

| Field | Required | Meaning |
|---|---|---|
| `kind` | yes | `better_means`, `ticket`, `repeated_work`, `grow_children`, `split`, `merge`, or `stale` |
| `said` | yes | One line: what was suggested. |
| `answer` | yes | `declined` (rejected or unanswered), `kept` (confirmed, no change), or `accepted` |
| `on` | yes | Date answered, `YYYY-MM-DD`. |
| `evidence` | no | Paths, check, commits or sessions the item cited. |

The same suggestion answered again updates its entry. A `stale` entry older than the stale
threshold (60 days) is asked again. Health facts (validation errors, missing paths, failing
checks) are never recorded here. The list moves with the node and goes when it is deleted.

```yaml
- id: trustworthy_data
  purpose: Numbers can be trusted.
  reviewed:
    - kind: split
      said: split into price vs attribution sources
      answer: declined
      on: 2026-10-29
      evidence: src/price/, src/attribution/
```

## Example

```yaml
version: "3.0"
root:
  purpose: Readers can follow a long serial without losing their place.
  metrics:
    - name: resume_success
      source: analytics event resume_opened
      healthy: ">= 95% of sessions"
  realized_by:
    - app/reader/
    - id: sync_progress
      purpose: Progress follows the reader across devices.
      realized_by:
        - cloud sync service
      health_check:
        command: node scripts/check-sync.js --require-recent
        expected: at least one sync in the last 24h
    - id: offline_reading
      purpose: Reading never depends on a network.
      status: planned
      paused_reason: After sync ships. Resume when sync_progress is active.
```
