---
title: Error Handling Patterns (Go)
source: starter-pack
confidence: 0.6
category: development_quality
mechanism: skill
goal_path: code_quality.reliability
tags: [error-handling, go]
---

Idiomatic Go error handling:

- **Always check errors**: `if err != nil` — never `_` an error you care about
- **Wrap with context**: `fmt.Errorf("loading config from %s: %w", path, err)` — `%w` enables `errors.Is`/`errors.As`
- **Return early on error**: keep the happy path at the lowest indent level
- **Sentinel errors**: use `errors.Is(err, ErrNotFound)` not string matching

```go
// Good
cfg, err := loadConfig(path)
if err != nil {
    return fmt.Errorf("init: %w", err)
}

// Bad
cfg, _ := loadConfig(path)
```

Use `log/slog` for structured logging when an error is handled (not returned).
