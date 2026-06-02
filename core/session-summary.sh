#!/usr/bin/env bash
# session-summary.sh — Show a one-line evolution summary at session end
# Called by Claude Code Stop hook (or SessionEnd hook if available)
# Usage: session-summary.sh
#
# Outputs a brief summary of what the system observed and evolved this session.
# Designed to be unobtrusive: one line printed to stdout, exits 0 always.

set -euo pipefail

HOMUNCULUS_DIR="${HOMUNCULUS_DIR:-$(pwd)/homunculus}"
OBS_FILE="${HOMUNCULUS_DIR}/observations.jsonl"
INSTINCTS_DIR="${HOMUNCULUS_DIR}/instincts/personal"
SKILLS_DIR="${HOMUNCULUS_DIR}/evolved/skills"

# Only print if homunculus is installed in this project
if [ ! -d "$HOMUNCULUS_DIR" ]; then
  exit 0
fi

# Count observations in the last hour (rough proxy for "this session")
SESSION_OBS=0
if [ -f "$OBS_FILE" ] && command -v jq &>/dev/null; then
  CUTOFF=$(date -v-1H +%s 2>/dev/null || date -d '1 hour ago' +%s 2>/dev/null || echo 0)
  SESSION_OBS=$(jq -r --argjson cutoff "$CUTOFF" \
    'select(.timestamp != null) | select((.timestamp | strptime("%Y-%m-%dT%H:%M:%SZ") | mktime) > $cutoff) | .tool_name' \
    "$OBS_FILE" 2>/dev/null | wc -l | tr -d ' ' || echo 0)
fi

# Count instincts
INSTINCT_COUNT=0
if [ -d "$INSTINCTS_DIR" ]; then
  INSTINCT_COUNT=$(find "$INSTINCTS_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
fi

# Count skills
SKILL_COUNT=0
if [ -d "$SKILLS_DIR" ]; then
  SKILL_COUNT=$(find "$SKILLS_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
fi

# Print one-line summary (only if there's something to report)
if [ "$SESSION_OBS" -gt 0 ] || [ "$INSTINCT_COUNT" -gt 0 ]; then
  echo "  🧬 Homunculus: ${SESSION_OBS} observations this session | ${INSTINCT_COUNT} instincts | ${SKILL_COUNT} skills"
fi

exit 0
