# ch06: Rules / Plugins / 權限系統 / Sandboxing / 安全

## 9. Path-Scoped Rules

```markdown
<!-- CLAUDE.md -->
<!-- 只在特定目錄生效 -->
<path-rules>
  <rule path="src/legacy/**">
    這個目錄是舊代碼，改動要保守。
  </rule>
  <rule path="scripts/**">
    這裡的腳本要用 zsh，不用 bash。
  </rule>
</path-rules>
```

---

## 10. Plugins 系統

```
my-plugin/
├── .claude-plugin/plugin.json  ← name, version, description
├── skills/<name>/SKILL.md
├── agents/<name>.md
├── hooks/hooks.json
└── .mcp.json
```

用 `claude --plugin-dir ./my-plugin` 測試。
Standalone (`.claude/`) 先用，確定後打包成 plugin 分享。

### 官方 Marketplace 安裝（用戶端）

```bash
/plugin              # Discover/Installed/Marketplaces/Errors 四個 tab

# LSP plugins（前置：export ENABLE_LSP_TOOL=1）
# ⚠️ typescript-lsp 有 bug #15235，改用 vtsls！
/plugin install vtsls@claude-code-lsps             # TypeScript/JS
/plugin install gopls@claude-code-lsps             # Go
/plugin install pyright-lsp@claude-code-lsps       # Python
/plugin install rust-analyzer-lsp@claude-code-lsps # Rust

# 指令有 namespace
/commit-commands:commit   # 不是直接 /commit

/reload-plugins           # 不重啟就套用（LSP 需重啟）
```

**🌟 Code Intelligence Plugins（最高價值）**
安裝對應 Language Server 後，Claude 獲得：
- **自動診斷**：每次 edit 後 LSP 自動報告型別錯誤 → Claude 即時修復（不需手動跑 compiler）
- **程式碼導航**：go-to-definition、find-references、type info

| 語言 | Plugin 安裝名 | 需要 binary |
|------|-------------|-------------|
| TypeScript | `vtsls` ⚠️（非 typescript-lsp） | `typescript-language-server` |
| Python | `pyright-lsp` | `pyright-langserver` |
| Rust | `rust-analyzer-lsp` | `rust-analyzer` |
| Go | `gopls` | `gopls` |

> `Ctrl+O` 在 "diagnostics found" 時顯示 inline 錯誤

**常用整合**：`github`、`linear`、`sentry`、`figma`、`slack`
**工作流**：`commit-commands`（git commit/push/PR）、`pr-review-toolkit`

---

## 決策樹：選什麼擴展方式？

```
要在 Claude 工作時自動觸發某個行為？
└── Hooks（確定性、每次都跑）

要封裝可重用的工作流程？
├── 互動式 → Skills（用戶 /invoke 或 Claude 自動用）
└── 隔離執行 → Subagents

要連接外部工具（DB、API、Slack）？
└── MCP servers

要跨專案分享一組 skills + agents + hooks？
└── Plugin

要定期在 session 內執行某任務？
└── /loop 或 CronCreate
```

---


---

## 13. 權限系統

```json
// settings.json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)", "Bash(git commit *)", "Bash(* --version)",
      "WebFetch(domain:github.com)",
      "mcp__playwright"
    ],
    "deny": [
      "Bash(rm -rf *)", "Bash(git push --force *)",
      "Agent(Explore)"
    ]
  }
}
```

**Permission Modes**：`default` / `acceptEdits` / `plan` / `dontAsk` / `bypassPermissions`

**路徑規則**：`//` = 絕對路徑，`~/` = home，`/` = 專案根目錄，無前綴 = 相對 cwd

**優先順序（高到低）**：Managed → CLI args → Local project → Shared project → User

**互動管理**：`/permissions` — 查看/新增/移除 allow/deny 規則（無需手動編輯 JSON）

**Bash auto-approval 白名單（v2.1.72 擴充）**：`lsof`, `pgrep`, `tput`, `ss`, `fd`, `fdfind` 加入常見唯讀指令白名單，減少確認提示。

---

## 14. Sandboxing（OS 層級隔離）

OS 層級限制 Bash 的 filesystem 和 network 存取，解決 permission 批准疲勞。
- **macOS**：Seatbelt；**Linux/WSL2**：bubblewrap（需 `apt install bubblewrap socat`）
- 所有 subprocess 繼承相同安全邊界

```
/sandbox    # 開啟模式選擇（Auto-allow / Regular permissions）
```

Auto-allow 模式下，sandbox 內的 Bash 自動執行不需確認（含檔案修改）。

### 設定

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "allowWrite": ["~/.kube", "//tmp/build"],
      "denyWrite": ["~/.bashrc", "~/.zshrc"],
      "denyRead": ["//Users/jinx/.ssh"]
    },
    "network": {
      "allowedDomains": ["github.com", "npmjs.com"]
    }
  },
  "allowUnsandboxedCommands": false
}
```

### 路徑前綴規則

| 前綴 | 含義 | 範例 |
|------|------|------|
| `//` | 絕對路徑（不展開 `~`）| `//tmp/build` → `/tmp/build` |
| `~/` | home 相對 | `~/.kube` → `$HOME/.kube` |
| `/` | settings 檔案目錄相對 | `/build` |
| `./` 或無 | 相對於 cwd | `./output` |

多個 settings scope 的 `allowWrite` 會**合併**，不是覆蓋。

### 預設行為

- **寫入**：只允許 cwd 及子目錄
- **讀取**：整個系統（除 denyRead）
- **Network**：只允許明確列出的 domains

### 弱化網路隔離（開發用途）

```json
{ "sandboxEnableWeakerNetworkIsolation": true }
```

讓 sandbox 內可存取 localhost（docker daemon、local DB、dev server）。
⚠️ 降低網路安全邊界，僅在受信任環境使用。

### 安全優勢 — Prompt Injection 防護

Sandbox + Permissions = **Defense-in-depth**：
- **Permissions**：控制 Claude 能用哪些工具（所有工具）
- **Sandbox**：OS 層級強制限制 Bash 能存取的資源（只針對 Bash）

即使攻擊者操控 Claude，sandbox 仍阻止修改 `~/.bashrc`、向外部洩漏資料、下載惡意腳本。

已知限制：廣域 domain（如 `github.com`）可被利用做 data exfiltration；Unix sockets 可能 bypass sandbox。

### 逃生出口

sandbox 限制導致命令失敗時，Claude 可能嘗試在 sandbox 外重試（需用戶確認）。
禁止此行為：`"allowUnsandboxedCommands": false`

### DevContainer（完整隔離替代方案）

比 `/sandbox` 更強的 container 層級隔離，適合 CI/CD 或不信任的程式碼：
- 內建 firewall：只允許 npm/GitHub/Claude API
- 適合搭配 `--dangerously-skip-permissions`
- 組成：`devcontainer.json` + `Dockerfile` + `init-firewall.sh`
- ⚠️ 無法防止惡意 repo 竊取 container 內的 credentials

### 內建 Write 邊界（不需 /sandbox）

即使未啟用 sandbox，Claude Code 有預設規則：
- **寫入**只能到啟動目錄及子目錄 + `allowedDirectories`
- **讀取**可存取工作目錄外（系統函式庫、shared configs）

### 已知限制

- 不相容：`watchman`（jest 用 `--no-watchman`）、`docker`（加入 `excludedCommands`）
- **macOS crontab**：`crontab -e/-r` 在 sandbox 內會掛起（系統 crontab DB 寫入被限制）→ 改用 launchd

---


---

## 33. 安全最佳實踐速查

### 防護機制（自動啟用）

- 寫入限制：只能寫 project 啟動目錄及子目錄
- WebFetch 獨立 context，防 prompt injection
- 指令黑名單：curl/wget 需明確批准
- Suspicious Bash Detection：已批准的指令若行為可疑，仍需手動批准
- Git push 限制在當前分支

### ConfigChange Hook（審計設定變更）

```json
{
  "hooks": {
    "ConfigChange": [{
      "matcher": "permissions.allow",
      "hooks": [{"type": "command", "command": "logger 'Permission added: '"}]
    }]
  }
}
```

### Hooks vs CLAUDE.md

- **CLAUDE.md** = 建議（Claude 可能在 context 不足時忽略）
- **Hooks** = 保證（每次觸發一定執行）
- → lint/format/block migrations：用 Hook，不要只寫 CLAUDE.md

### Context 80% 效能懸崖

LLM 在 context 80%+ 時智能**明顯下降**（不只是大小限制）。
→ 不要等到撞上限才 `/clear`，80% 就應處理。

### CLAUDE.md 精修法

每行問：**「移除這條，Claude 會出錯嗎？」** 不會 → 刪掉。
目標 < 200 行；API docs 用 link 而非直接貼入。

### Fan-out 安全模式

```bash
for file in $(cat files.txt); do
  claude -p "Migrate $file" \
    --allowedTools "Edit,Bash(git commit *)"   # 鎖定工具防 injection
done
```

### 資料安全注意事項

- **傳輸**：TLS 加密（prompt、code、output 傳送過程安全）
- **靜態儲存**：⚠️ **不加密**（at rest NOT encrypted）— 企業合規/HIPAA 需注意
- **本地 session 快取**：30 天（可配置）
- 禁用遙測：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`

### /sandbox 隔離

```bash
/sandbox   # macOS Seatbelt，限制 fs/network
```

Sandbox 配置（settings.json）：
```json
{
  "sandbox": {
    "filesystem": {
      "allowWrite": ["//tmp/build"],
      "denyRead": ["~/.aws/credentials"]
    },
    "network": { "allowedDomains": ["github.com"] }
  },
  "sandboxEnableWeakerNetworkIsolation": true,  // 允許存取 localhost（開發用）
  // v2.1.69：macOS only，讓 gh/gcloud/terraform 等 Go 工具在自訂 MITM proxy 下驗證 TLS
  "sandbox": { "enableWeakerNetworkIsolation": true }  // 同上，新格式
}
```

---

