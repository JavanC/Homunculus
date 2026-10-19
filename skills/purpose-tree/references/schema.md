# Purpose Tree Schema v3.0

A tree file has two top-level keys: `version: "3.0"` and `root` (a node). Other top-level
keys are allowed and ignored by the validator (projects may keep their own config there).

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
| `tests` | no | list of strings | Test file patterns that verify this node. |
| `health_check` | no | `{command, expected}` | Shell command; exit 0 = healthy. |
| `agents` | no | list | Legacy: agents serving this purpose. Prefer listing them in `realized_by`. |
| `goals` | no | map | Legacy: `{id: node}` children. Read as sub-purposes. |

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

## `health_check` must fail on missing data

The check judges the data the purpose depends on, not that a file exists.

| Not a check (passes on empty data) | A check |
|---|---|
| `test -f data/log.jsonl` | `node scripts/check-log.js --require-entries-since 24h` |
| `test -x scripts/run.sh` | `scripts/run.sh --dry-run && test -s out/result.json` |
| `ls logs/ \| head` | `find logs -name '*.log' -mtime -1 \| grep -q .` |
| `wc -l data.jsonl` | `test "$(wc -l < data.jsonl)" -gt 0` |

The validator rejects a command that is only an existence or count probe.

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
