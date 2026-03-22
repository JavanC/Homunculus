# ch04: MCP 設定 + MCP 進階設定

## 5. MCP 設定

```json
// .claude/settings.json （project scope，推薦）
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright"]
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/jinx"]
    },
    "my-local-tool": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/jinx/tools/my-mcp.js"]
    }
  }
}
```

**Scope 層級**：
- **User（全域）**：`~/.claude/settings.json` → 所有專案可用
- **Project（專案）**：`.claude/settings.json` → 只此專案有效（推薦隔離）
- **CLI 覆蓋**：`claude --mcp-config ./custom.json`；`--strict-mcp-config` 只用指定設定

**MCP Tool Search**：預設啟用，最多載入 **10% context** 的 MCP tools，其餘延遲載入直到需要。

**MCP 精選原則**：只啟用當前任務需要的，不要全開（省 context）

---


---

## 20. MCP 進階設定（2026）

```bash
# Scope（注意：名稱已更改）
claude mcp add --scope user playwright -- npx @playwright/mcp@latest     # 跨專案
claude mcp add --scope project --transport http github https://...       # 共享

# Claude Code 作為 MCP server（供 Claude Desktop 連接）
claude mcp serve

# 從 Claude Desktop 匯入
claude mcp add-from-claude-desktop
```

**.mcp.json 環境變數展開**：
```json
{
  "mcpServers": {
    "api": {
      "type": "http",
      "url": "${API_BASE:-https://api.example.com}/mcp",
      "headers": {"Authorization": "Bearer ${API_KEY}"}
    }
  }
}
```

| 環境變數 | 用途 |
|---------|------|
| `MCP_TIMEOUT` | server 啟動 timeout（ms）|
| `MAX_MCP_OUTPUT_TOKENS` | 輸出上限（預設 25000）|
| `ENABLE_CLAUDEAI_MCP_SERVERS=false` | 不自動載入 claude.ai servers |

⚠️ SSE transport 已棄用，改用 HTTP

---

