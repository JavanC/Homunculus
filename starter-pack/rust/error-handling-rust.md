---
title: Error Handling Patterns (Rust)
source: starter-pack
confidence: 0.6
category: development_quality
mechanism: skill
goal_path: code_quality.reliability
tags: [error-handling, rust]
---

Idiomatic Rust error handling:

- **Use `?` operator** to propagate errors — avoid `unwrap()` in library/application code
- **`unwrap()` is acceptable** only in tests or when the condition is provably impossible
- **Custom error types**: use `thiserror` for libraries, `anyhow` for application binaries
- **Add context**: `file.read_to_string(&mut buf).context("reading config file")?`

```rust
// Good — propagates with context
fn load_config(path: &Path) -> anyhow::Result<Config> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("reading config from {}", path.display()))?;
    Ok(toml::from_str(&content)?)
}

// Bad — panics on error
fn load_config(path: &Path) -> Config {
    let content = fs::read_to_string(path).unwrap();
    toml::from_str(&content).unwrap()
}
```
