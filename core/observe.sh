#!/usr/bin/env bash
# observe.sh — Observe tool usage for evolution
# Usage: observe.sh <pre|post> [tool_name]
# Called by Claude Code PostToolUse hook
#
# v0.9.0: Added noise filtering, reference tracking, skill name enrichment

set -euo pipefail

# Configuration — override these with environment variables
HOMUNCULUS_DIR="${HOMUNCULUS_DIR:-$(pwd)/homunculus}"
OBS_FILE="${HOMUNCULUS_DIR}/observations.jsonl"
REF_FILE="${HOMUNCULUS_DIR}/reference-tracking.jsonl"
MAX_SIZE=$((10 * 1024 * 1024))  # 10MB

PHASE="${1:-unknown}"

# Read stdin (hook input JSON)
INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat)
fi

# Extract tool_name from stdin JSON
TOOL_NAME="unknown"
if command -v jq &>/dev/null && [ -n "$INPUT" ]; then
  EXTRACTED=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
  [ -n "$EXTRACTED" ] && TOOL_NAME="$EXTRACTED"
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Noise filter ──
# Skip low-value observations to keep observations.jsonl meaningful.
# Read-only tools provide no actionable patterns for evolution.
# Exception: Read calls targeting instinct/skill files are tracked for reference analysis.
case "$TOOL_NAME" in
  Read)
    # Track instinct/skill reads for reference analysis (used by prune-instincts.js)
    if command -v jq &>/dev/null && [ -n "$INPUT" ]; then
      FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
      case "$FILE_PATH" in
        */instincts/personal/*|*/instincts/archived/*|*/evolved/skills/*|*/evolved/agents/*)
          mkdir -p "$(dirname "$REF_FILE")"
          echo "$INPUT" | jq -c --arg ts "$TIMESTAMP" --arg path "$FILE_PATH" \
            '{timestamp: $ts, type: "reference", path: $path}' \
            >> "$REF_FILE" 2>/dev/null || true
          ;;
      esac
    fi
    exit 0
    ;;
  # Skip entirely: read-only tools provide no actionable patterns
  Glob|Grep|TodoWrite|TodoRead)
    exit 0
    ;;
  Skill)
    # Enrich tool name with specific skill for evolution stats
    if command -v jq &>/dev/null && [ -n "$INPUT" ]; then
      SKILL_NAME=$(echo "$INPUT" | jq -r '.tool_input.skill // empty' 2>/dev/null)
      [ -n "$SKILL_NAME" ] && TOOL_NAME="Skill:${SKILL_NAME}"
    fi
    ;;
  # Skip pre-phase: we only care about results (post) for write operations
  Bash|Write|Edit|NotebookEdit)
    [ "$PHASE" = "pre" ] && exit 0
    ;;
esac

# Only observe post-tool usage (after noise filter, so Skill enrichment runs on post)
[ "$PHASE" != "post" ] && exit 0

# ── Write observation ──
mkdir -p "$(dirname "$OBS_FILE")"

if command -v jq &>/dev/null && [ -n "$INPUT" ]; then
  # Include agent context for pattern analysis
  echo "$INPUT" | jq -c --arg ts "$TIMESTAMP" --arg phase "$PHASE" --arg tool "$TOOL_NAME" \
    '{timestamp: $ts, phase: $phase, tool: $tool,
      agent_id: (.agent_id // null), agent_type: (.agent_type // null)}' \
    >> "$OBS_FILE" 2>/dev/null || true
else
  echo "{\"timestamp\":\"$TIMESTAMP\",\"phase\":\"$PHASE\",\"tool\":\"$TOOL_NAME\"}" >> "$OBS_FILE"
fi

# ── Auto-archive if too large ──
if [ -f "$OBS_FILE" ] && [ "$(stat -f%z "$OBS_FILE" 2>/dev/null || stat -c%s "$OBS_FILE" 2>/dev/null || echo 0)" -gt "$MAX_SIZE" ]; then
  ARCHIVE="$OBS_FILE.$(date +%Y%m%d%H%M%S).gz"
  gzip -c "$OBS_FILE" > "$ARCHIVE"
  : > "$OBS_FILE"
fi
