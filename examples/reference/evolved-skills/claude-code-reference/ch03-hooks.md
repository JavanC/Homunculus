# ch03: Hooks 系統

## 4. Hooks 系統

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{"type": "command", "command": "echo 'About to run bash'"}]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{"type": "command", "command": "npm run lint:fix"}]
      }
    ],
    "Stop": [
      {
        "hooks": [{"type": "command", "command": "./scripts/session-end.js"}]
      }
    ]
  }
}
```

**Hook 事件（完整，22 種）**：
`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `SubagentStart`, `SubagentStop`, `Stop`, `StopFailure`（API 錯誤時，v2.1.78）, `TeammateIdle`（exit 2 = 繼續工作）, `TaskCompleted`（exit 2 = 阻止完成）, `InstructionsLoaded`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`（v2.1.76）, `Elicitation`（exit 2 = deny MCP input）, `ElicitationResult`（exit 2 = block）, `SessionEnd`

**四種 Hook 類型**：
```json
// 1. Shell command（最常用）
{"type": "command", "command": "bash script.sh", "async": true}

// 2. HTTP endpoint（POST JSON，非 2xx 不阻塞）
{
  "type": "http",
  "url": "http://localhost:3000/hooks/pre-tool-use",
  "headers": {"Authorization": "Bearer $MY_TOKEN"},
  "allowedEnvVars": ["MY_TOKEN"]
}

// 3. Claude model 判斷
{"type": "prompt", "prompt": "Should this tool be allowed? $ARGUMENTS"}

// 4. Subagent 驗證（可用 Read/Grep/Glob）
{"type": "agent", "prompt": "Validate: $ARGUMENTS"}
```

**控制 Claude 行為**（exit code）：
- `exit 0` = 繼續
- `exit 2` + `stdout` = 阻擋（輸出作為 Claude 的 feedback）

**額外欄位**：`async: true`（背景）、`timeout`（秒）、`statusMessage`（spinner 文字）、`once: true`（只執行一次，Skills 專用）

**進階 Hook 模式**：

```bash
# SessionStart compact matcher — compact 後重新注入 context（高價值！）
# settings.json hooks.SessionStart[{matcher: "compact"}]

# 結構化 JSON 輸出（比 exit code 更細緻）
echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Use rg instead of grep"}}'
# permissionDecision: "allow" | "deny" | "ask"

# Stop hook — 防無限迴圈
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then exit 0; fi
echo '{"decision": "block", "reason": "Tests not passing yet"}'

# Agent-based Stop hook — spawn subagent 驗證程式碼狀態
# {"type": "agent", "prompt": "Verify all unit tests pass.", "timeout": 120}

# MCP 工具 matcher
# {"matcher": "mcp__github__.*"}  {"matcher": "mcp__playwright__.*"}

# UserPromptSubmit 注入 context
echo '{"additionalContext": "Current git branch: main, last deploy: 2h ago"}'
```

**進階 hookSpecificOutput 欄位**：
```bash
# 1. CLAUDE_ENV_FILE（SessionStart 專用）— 持久化 env vars 到所有 Bash 呼叫
echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"

# 2. updatedInput（PreToolUse）— 執行前修改工具輸入
echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow", "updatedInput": {"command": "safe-cmd"}}}'

# 3. updatedPermissions（PermissionRequest）— 自動批准不再提示
echo '{"hookSpecificOutput": {"hookEventName": "PermissionRequest", "decision": {"behavior": "allow", "updatedPermissions": [{"type": "toolAlwaysAllow", "tool": "Bash"}]}}}'

# 4. updatedMCPToolOutput（PostToolUse，MCP 工具專用）— 過濾 MCP 回應
echo '{"hookSpecificOutput": {"hookEventName": "PostToolUse", "updatedMCPToolOutput": "sanitized output"}}'
```

**⚠️ Shell profile 陷阱**：hook 在非互動 shell 執行，`~/.zshrc` 中的 `echo` 會污染 JSON：
```bash
if [[ $- == *i* ]]; then echo "Shell ready"; fi  # 只在互動 shell echo
```

---

