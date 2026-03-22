#!/usr/bin/env bash
# observe.sh — Observe tool usage for evolution
# Usage: observe.sh <pre|post> [tool_name]
# Called by Claude Code PostToolUse hook

set -euo pipefail

# Configuration — override these with environment variables
HOMUNCULUS_DIR="${HOMUNCULUS_DIR:-$(pwd)/homunculus}"
OBS_FILE="${HOMUNCULUS_DIR}/observations.jsonl"
MAX_SIZE=$((10 * 1024 * 1024))  # 10MB
COUNTER_FILE="/tmp/homunculus-tool-count-$$"

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

# Only observe post-tool usage
[ "$PHASE" != "post" ] && exit 0

# Rotate if too large
if [ -f "$OBS_FILE" ] && [ "$(stat -f%z "$OBS_FILE" 2>/dev/null || stat -c%s "$OBS_FILE" 2>/dev/null || echo 0)" -gt "$MAX_SIZE" ]; then
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  gzip -c "$OBS_FILE" > "${OBS_FILE}.${TIMESTAMP}.gz"
  : > "$OBS_FILE"
fi

# Write observation
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
mkdir -p "$(dirname "$OBS_FILE")"

if command -v jq &>/dev/null; then
  jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg phase "$PHASE" \
    --arg tool "$TOOL_NAME" \
    '{timestamp: $ts, phase: $phase, tool: $tool}' >> "$OBS_FILE"
else
  echo "{\"timestamp\":\"$TIMESTAMP\",\"phase\":\"$PHASE\",\"tool\":\"$TOOL_NAME\"}" >> "$OBS_FILE"
fi
