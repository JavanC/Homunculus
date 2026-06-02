---
title: Test Coverage Awareness (Python)
source: starter-pack
confidence: 0.6
category: development_quality
mechanism: skill
goal_path: code_quality.testing
tags: [testing, pytest, python]
---

For Python projects, maintain meaningful test coverage:

- New functions with branching logic should have tests for each branch
- Use `pytest` fixtures to share setup, not global state
- When fixing a bug, add a regression test first (red → green)
- Prefer `pytest.raises` for testing expected exceptions

**Running coverage:**
```bash
pytest --cov=src --cov-report=term-missing
```

Mark tests with `@pytest.mark.slow` if they take >1s, so they can be skipped in fast feedback loops.
