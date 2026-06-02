---
title: Verify Before Marking Done
source: starter-pack
confidence: 0.6
category: development_quality
mechanism: rule
goal_path: code_quality.testing
tags: [verification, testing, universal]
---

Before marking any task as complete, run the relevant verification step:

- **Code change** → run the test suite (or at minimum the tests for the changed module)
- **Config change** → validate syntax (`jq`, `python -c`, `node -e`, `yaml lint`, etc.)
- **Shell script** → `zsh -n` or `bash -n` syntax check + `shellcheck` if available
- **API change** → `curl` the endpoint and verify the response shape

"It looks right" is not verification. A command that exits 0 is.

If no automated verification exists for something, note it explicitly as "manually verified" with what you checked.
