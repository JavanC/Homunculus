# ch09: 外部整合（監控/Chrome/IDE/企業政策/GitLab/LLM Gateway/Plugin/Cloud/PR Review）

## 21. 監控與 OTel

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=console    # 本地 debug
export OTEL_METRICS_EXPORTER=prometheus # Prometheus 整合
export OTEL_METRICS_EXPORTER=otlp       # 完整 OTLP（Grafana/Datadog）
```

**8 個 Metrics**：session count、LOC（added/removed）、PR count、commit count、**cost（USD）**、**tokens**（input/output/cache）、code edit decisions、active time

**5 個 Events**（OTel Logs）：user_prompt、api_request（含 cost_usd、speed）、api_error、tool_result（含 duration_ms、bash_command）、tool_decision

**`prompt.id`**：UUID 追蹤單一 prompt 觸發的所有 API calls + tool results

**Analytics Dashboard（Teams/Enterprise）**：https://claude.ai/analytics/claude-code

### PR 歸因（Analytics）

Merge 後自動標記 **`claude-code-assisted`** label（GitHub PR）：
- 歸因窗口：merge 前 **21 天** + merge 後 **2 天**的 session activity
- 自動過濾：lock files、build artifacts、minified（>1000 chars/line）
- 保守估計：只計「高確信度」貢獻

```bash
# 程式化查詢
gh pr list --label "claude-code-assisted" --state merged | wc -l
```

> ⚠️ 只支援 GitHub（不支援 GitLab）

---

## 22. Chrome 瀏覽器整合

```bash
claude --chrome      # 啟用（單次）
/chrome              # session 中切換 / 查看狀態 / 重連
```

**前置條件**：
- Chrome 或 Edge（非 Brave/Arc）+ [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) >= v1.0.36
- **必須直接 Anthropic 帳號**（❌ 不支援 Bedrock/Vertex/Foundry）

**核心能力**：
- Live debugging（讀 console errors + DOM，立即修代碼）
- 共享 browser login state（可存取 Gmail/Notion/任何已登入網站）
- GIF 錄製（`Record a GIF showing...`）
- 資料抽取（網頁 → CSV/JSON）
- 自動填表（從本地 CSV 讀取）

```text
# 典型用法
> Open localhost:3000 and check the console for errors
> Record a GIF showing the checkout flow
> Fill the form with data from contacts.csv
```

**對比 Playwright MCP**：
- `--chrome` = 簡單設定，共享登入，適合本地測試
- Playwright MCP = 精確控制，適合 CI/CD、headless

→ **quest-board 本地開發優先 `--chrome`，CI/CD 用 Playwright**

⚠️ 預設啟用會增加 context（browser tools 常駐），按需使用

---

## 23. IDE 整合：VS Code 與 JetBrains

### VS Code Extension 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Cmd+Esc` / `Ctrl+Esc` | Toggle focus：editor ↔ Claude |
| `Option+K` / `Alt+K` | Insert @-mention with file path + line numbers |
| `Cmd+Shift+Esc` | Open in new tab |

**@-mentions**（VS Code 專有）：
```text
@app.ts#5-10        ← Option+K 自動插入（含行號）
@terminal:name      ← 引用 terminal 輸出
@browser            ← Chrome 整合
```

**Permission Modes**（設定 `claudeCode.initialPermissionMode`）：
- `default`：每次詢問
- `plan`：先出計劃 markdown，你 inline comment 後再執行
- `acceptEdits`：自動接受修改
- `bypassPermissions`：全自動（devcontainer 環境才推薦）

**Remote Sessions**：Past Conversations → Remote tab → 繼續 claude.ai web session

**URI Handler**（外部開啟 session）：
```
vscode://anthropic.claude-code/open?prompt=<encoded>&session=<id>
```
從其他 app（Slack bot / CLI / 網頁）直接在 VS Code 觸發 Claude Code。

**Checkpoint（Rewind）**：hover 任何 message → rewind 按鈕 → Fork/Rewind code/Both

### JetBrains Plugin（IntelliJ、PyCharm、WebStorm、GoLand 等）

**安裝**：JetBrains Marketplace 搜尋 "Claude Code Beta"

**快捷鍵**（JetBrains 特有）：

| 快捷鍵 | 功能 |
|--------|------|
| `Cmd+Esc` / `Ctrl+Esc` | 開啟 Claude Code 面板 |
| `Cmd+Option+K` / `Alt+Ctrl+K` | 插入 file reference（@File#L1-99）|

**JetBrains 獨特功能**：
- **Diagnostic sharing**：IDE 的 lint/syntax 錯誤自動傳給 Claude
- **Selection context**：當前選取/tab 自動共享給 Claude
- **Diff viewer**：程式碼變更在 IDE 的 diff viewer 顯示（非 terminal）

**Remote Development 注意**：
- 必須在遠端 host 安裝 plugin（Settings → Plugin (Host)）
- 不是安裝在本機 client

**ESC 鍵設定**（JetBrains terminal 問題）：
```
Settings → Tools → Terminal
→ 取消勾選 "Move focus to the editor with Escape"
（否則 ESC 被 IDE 攔截，無法中斷 Claude）
```

**安全注意**：auto-edit 模式可能修改 IDE config 檔案（自動執行風險）。

### 共用（VS Code + JetBrains）

```bash
claude --resume   # IDE session 繼續到 CLI
/ide              # Terminal Claude 連接到 IDE（啟用 diff viewer）
```

### Terminal 最佳化

- **Shift+Enter**（換行）：iTerm2/WezTerm/Ghostty/Kitty 原生支援；其他用 `/terminal-setup`
- **Vim 模式**：`/vim` 或 `/config` 啟用（支援 hjkl/w/e/b/dd/yy 等常用指令）
- **通知**：完成後觸發 notification event（Kitty/Ghostty 原生；iTerm2 需設定）
- VS Code terminal 對超長貼上有截斷問題 → 改用 file-based 工作流

---

## 24. 企業政策管理（Server-Managed Settings）

**需求**：Teams/Enterprise 方案 + Claude Code >= 2.1.38

### 兩種集中管理方式

| 方式 | 最適合 | 強度 |
|------|--------|------|
| Server-managed | 無 MDM / 非管理裝置 | 中（client-side） |
| Endpoint-managed | 有 MDM 的組織 | 高（OS 層級保護） |

同時存在時：server-managed 優先；兩者都凌駕所有用戶設定和 CLI args。

### 設定方式
Claude.ai → Admin Settings → Claude Code → Managed settings → 填 JSON

```json
{
  "permissions": {
    "deny": ["Bash(curl *)", "Read(./.env)", "Read(./secrets/**)"]
  },
  "disableBypassPermissionsMode": "disable"
}
```

### 快取與推送
- 啟動時 + 每小時 polling 更新
- 有快取：立即套用，背景刷新
- 無快取（首次）：非同步拉取（有短暫空窗期）

### 安全性對話框
以下設定需用戶明確批准：
- Shell command settings
- 自訂環境變數（非 allowlist）
- Hook 設定

用戶拒絕 → Claude Code 退出；`-p` headless 跳過對話框。

### 不支援 Server-Managed 的情況
Bedrock / Vertex AI / Foundry / `ANTHROPIC_BASE_URL` / LLM Gateway 時繞過。

### ConfigChange Hook
```json
"ConfigChange": [{ "type": "command", "command": "log_config_change.sh" }]
```
用於偵測/記錄設定被更改。

### 資料保留政策

| 用戶類型 | 保留期 |
|---------|--------|
| Consumer（允許訓練）| 5 年 |
| Consumer（不允許）| 30 天 |
| Commercial（Team/Enterprise/API）| 30 天 |
| Enterprise + ZDR | 0 天 |

**訓練政策**：Commercial 用戶預設不訓練；Bedrock/Vertex 不支援 Developer Partner Program。

### 隱私 Env Vars

```bash
DISABLE_TELEMETRY=1                          # 停用 Statsig 指標
DISABLE_ERROR_REPORTING=1                   # 停用 Sentry 錯誤
DISABLE_BUG_COMMAND=1                       # 停用 /bug 指令（送完整 transcript）
CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1       # 停用問卷（Bedrock/Vertex 預設 off）
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1  # 一次停用所有非必要流量 ⭐
CLAUDE_CODE_DISABLE_CRON=1                  # 立即停用 session 內的 /loop 排程（v2.1.72）⭐
CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1     # 從 system prompt 移除內建 git 工作流指令（v2.1.69）
CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=5000  # SessionEnd hook 超時（預設 1500ms，常導致 session-end.js 被中止）（v2.1.74）
```
Bedrock/Vertex/Foundry：以上非必要流量**預設全部停用**。

---

## 25. GitLab CI/CD 整合（Beta）

Beta 功能，由 GitLab 維護（非 Anthropic）。

### 最小設定

1. Settings → CI/CD → Variables → 加入 `ANTHROPIC_API_KEY`（masked）
2. 在 `.gitlab-ci.yml` 加入 claude job：

```yaml
claude:
  stage: ai
  image: node:24-alpine3.21
  rules:
    - if: '$CI_PIPELINE_SOURCE == "web"'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  before_script:
    - apk add --no-cache git curl bash
    - curl -fsSL https://claude.ai/install.sh | bash
  script:
    - /bin/gitlab-mcp-server || true
    - >
      claude -p "${AI_FLOW_INPUT:-'Review and implement changes'}"
      --permission-mode acceptEdits
      --allowedTools "Bash Read Edit Write mcp__gitlab"
```

### AI_FLOW_* 變數（webhook 觸發時）
- `AI_FLOW_INPUT` — 用戶留言（`@claude` 後的文字）
- `AI_FLOW_CONTEXT` — issue/MR 上下文
- `AI_FLOW_EVENT` — 事件類型

### 與 GitHub Actions 差異
| | GitHub Actions | GitLab CI/CD |
|--|--|--|
| 狀態 | GA | Beta |
| 工具 | `mcp__github` | `mcp__gitlab` |
| 安裝 | `/install-github-app` | 手動 YAML |
| 觸發 | PR comment | issue/MR comment（需 webhook）|

### 企業提供者 OIDC
- **AWS Bedrock**：GitLab OIDC → `assume-role-with-web-identity`（無靜態 key）
- **Vertex AI**：Workload Identity Federation（無下載 key）

### 進階參數
- `max_turns` — 限制回合數
- `timeout_minutes` — 限制執行時間
- `--debug` — 輸出詳細 log


---

## 26. LLM Gateway 整合（企業代理）

LLM gateway（如 LiteLLM）提供集中認證、cost tracking、audit log、model routing。

### 環境變數設定

```bash
# 統一端點（LiteLLM Anthropic 格式，推薦）
export ANTHROPIC_BASE_URL=https://litellm-server:4000

# 靜態 API key（作為 Authorization header）
export ANTHROPIC_AUTH_TOKEN=sk-litellm-static-key

# 動態 key helper（JWT 或 vault）
# settings.json 中設定：
# { "apiKeyHelper": "~/bin/get-litellm-key.sh" }

# key 刷新間隔（毫秒）
export CLAUDE_CODE_API_KEY_HELPER_TTL_MS=3600000

# Bedrock through LiteLLM
export ANTHROPIC_BEDROCK_BASE_URL=https://litellm-server:4000/bedrock
export CLAUDE_CODE_SKIP_BEDROCK_AUTH=1
export CLAUDE_CODE_USE_BEDROCK=1

# Vertex through LiteLLM
export ANTHROPIC_VERTEX_BASE_URL=https://litellm-server:4000/vertex_ai/v1
export CLAUDE_CODE_SKIP_VERTEX_AUTH=1
export CLAUDE_CODE_USE_VERTEX=1

# 當用 Anthropic Messages 格式連 Bedrock/Vertex 時
export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1
```

### Gateway 需求

Gateway 必須支援以下 API 格式之一：
- **Anthropic Messages**：`/v1/messages`（需轉發 `anthropic-beta`、`anthropic-version` headers）
- **Bedrock InvokeModel**：`/invoke`（需保留 body 的 `anthropic_beta`、`anthropic_version`）
- **Vertex rawPredict**：`:rawPredict`

---

## 27. Plugin Marketplace 管理

### 企業管理員設定

```json
// .claude/settings.json — 推薦用戶安裝的 marketplace
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": { "source": "github", "repo": "your-org/claude-plugins" }
    }
  },
  "enabledPlugins": {
    "code-formatter@company-tools": true
  }
}
```

```json
// managed settings — 限制只允許特定 marketplace（企業管控）
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "acme-corp/approved-plugins" },
    { "source": "hostPattern", "hostPattern": "^github\\.example\\.com$" }
  ]
}
```

`[]` = 完全鎖定（禁止新增任何 marketplace）

### Marketplace 建立

```
.claude-plugin/marketplace.json   ← 目錄結構
```

Plugin sources：`relative path`、`github`、`url`、`git-subdir`（sparse clone）、`npm`、`pip`

```bash
# 驗證 marketplace
claude plugin validate .
/plugin validate .

# 增加 git timeout（慢速網路）
export CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS=300000
```

`${CLAUDE_PLUGIN_ROOT}` — 在 hooks/MCP 設定中引用 plugin 內的檔案。

### Release Channels
- 建立兩個 marketplace 指向同一 repo 的不同 git ref（stable/latest）
- 透過 managed settings 的 `extraKnownMarketplaces` 分配給不同用戶群


---

## 28. Cloud Provider 設定（Bedrock / Vertex AI）

### Amazon Bedrock

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-east-1  # 必須！不讀 .aws config

# 認證（選其一）
aws configure                                    # CLI 設定
export AWS_BEARER_TOKEN_BEDROCK=your-api-key    # 最簡單
aws sso login --profile p && export AWS_PROFILE=p  # SSO

# 自動 SSO 刷新（settings.json）
# "awsAuthRefresh": "aws sso login --profile myprofile"
```

**Bedrock 特有功能**：
```bash
# 指定 Haiku 使用不同 region
export ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION=us-west-2

# AWS Guardrails（settings.json）
# "ANTHROPIC_CUSTOM_HEADERS": "X-Amzn-Bedrock-GuardrailIdentifier: id\nX-Amzn-Bedrock-GuardrailVersion: 1"
```

IAM 最小權限：`bedrock:InvokeModel` + `bedrock:InvokeModelWithResponseStream` + `bedrock:ListInferenceProfiles`

### Google Vertex AI

```bash
export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=global          # 推薦（可用性最佳）
export ANTHROPIC_VERTEX_PROJECT_ID=YOUR-PROJECT-ID

# Haiku 不支援 global → 指定 region
export VERTEX_REGION_CLAUDE_3_5_HAIKU=us-east5
export VERTEX_REGION_CLAUDE_4_0_OPUS=europe-west1  # Opus 用 EU
```

**1M Token Context Window**（Vertex beta）：需 header `context-1m-2025-08-07`

IAM：`roles/aiplatform.user`（包含 `aiplatform.endpoints.predict`）

### 共同重要設定

```bash
# ⚠️ 部署必做：固定模型版本（防止新版上線破壞帳號）
# Bedrock
ANTHROPIC_DEFAULT_SONNET_MODEL='us.anthropic.claude-sonnet-4-6'
ANTHROPIC_DEFAULT_HAIKU_MODEL='us.anthropic.claude-haiku-4-5-20251001-v1:0'
# Vertex  
ANTHROPIC_DEFAULT_SONNET_MODEL='claude-sonnet-4-6'
ANTHROPIC_DEFAULT_HAIKU_MODEL='claude-haiku-4-5@20251001'

# 某些 region 不支援 prompt caching
export DISABLE_PROMPT_CACHING=1
```

### Microsoft Foundry（Azure AI Foundry）

```bash
export CLAUDE_CODE_USE_FOUNDRY=1
export ANTHROPIC_FOUNDRY_RESOURCE=your-resource-name
# 認證（API key 或 Entra ID 自動）
export ANTHROPIC_FOUNDRY_API_KEY=your-key  # 或 az login
```
RBAC：`Azure AI User` 或 `Cognitive Services User`

### 三者共同限制
- `/login` `/logout` 停用
- server-managed settings 繞過
- 非必要遙測預設全部停用
- ⚠️ **固定模型版本**（不固定 → 新版上線可能破壞帳號）
- 建議建立**獨立帳號/專案**追蹤費用

### LLM Gateway Skip-Auth（三者通用）
```bash
export ANTHROPIC_BEDROCK_BASE_URL='https://gateway.example.com/bedrock'
export CLAUDE_CODE_SKIP_BEDROCK_AUTH=1   # Gateway 處理 AWS auth

export ANTHROPIC_VERTEX_BASE_URL='https://gateway.example.com/vertex'
export CLAUDE_CODE_SKIP_VERTEX_AUTH=1   # Gateway 處理 GCP auth

export ANTHROPIC_FOUNDRY_BASE_URL='https://gateway.example.com'
export CLAUDE_CODE_SKIP_FOUNDRY_AUTH=1  # Gateway 處理 Azure auth
```
用 `/status` 確認 gateway 設定。

---


---

## 31. 自動 PR Code Review（Teams/Enterprise）

Teams 和 Enterprise 功能。PR 開啟或 commit 更新時，自動觸發多 agent 並行分析。

### 啟用步驟

1. Admin 進入 `claude.ai/admin-settings/claude-code`
2. 安裝 Claude GitHub App（需要 **Contents read + Pull requests write** 權限）
3. 選擇要啟用的 repositories
4. 設定觸發方式：
   - **After PR creation**：每 PR 執行一次（較省費）
   - **After every push**：每次 commit 都執行（較即時，費用較高）

### 分析特點

- **多 agent 並行分析**：邏輯錯誤、安全問題、regression
- **Inline comments 嚴重度標籤**：
  - 🔴 Normal — 需要修改
  - 🟡 Nit — 建議改善（非必要）
  - 🟣 Pre-existing — 既有問題，非此 PR 引入
- 完成時間：約 20 分鐘
- 費用：約 **$15–25 / review**（多 agent 並行）
- **不阻塞 merge**：pure advisory

### 自訂 Review 規則

| 檔案 | 用途 |
|------|------|
| `CLAUDE.md` | 專案共用規則（違反 → nit 等級 finding） |
| `REVIEW.md` | **review 專用**規則（風格指引、必查清單、跳過模式）|

`REVIEW.md` 是獨立於 `CLAUDE.md` 的 review-only 規則檔。建議內容：
```markdown
# Review Rules

