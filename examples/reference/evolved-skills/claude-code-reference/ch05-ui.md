# ch05: UI 功能（Checkpointing / 排程 / Remote Control / Fast Mode / Keybindings）

## 6. Checkpointing / Rewind

每個 user prompt 自動建立 checkpoint（追蹤檔案編輯前狀態），跨 session 保存，30 天後清除。

```
Esc + Esc  或  /rewind  ← 開啟 rewind 選單
```

| 選項 | 行為 |
|------|------|
| Restore code and conversation | 完整回退（回到該點的程式碼 + 對話）|
| Restore code only | 只回退檔案，保留對話 |
| **Summarize from here** | **壓縮該點後的對話（最常用，不改檔案）** |

回退後，被選中的 prompt 會放回 input field，可直接重發或修改。

### Summarize from here（關鍵技巧）

比 `/compact` 更精準的 context 管理：
- 保留選中點之前的完整對話，只壓縮之後的部分
- **不修改磁碟檔案**，原始訊息仍在 transcript
- 最佳時機：debug 密集段結束後、切換任務前
- 效果：把佔空間的 debug session 壓縮，為新任務騰出 context

### Checkpoint vs /fork

| | Checkpoint / Rewind | Fork |
|--|---------------------|------|
| 動作 | 回退到過去狀態（undo）| 從當前狀態分支（branch）|
| 用途 | 回到某點重試不同方案 | 平行探索不同方向，保留原 session |
| 命令 | `Esc+Esc` / `/rewind` | `claude --continue --fork-session` |

### 限制

- Bash 指令造成的改動**不追蹤**（rm、mv、cp 等）
- 不追蹤 Claude Code 外部的手動修改
- 不是 git 替代品（checkpoint = local undo，git = permanent history）

### 應用場景

- **Debug 死胡同** → Restore code and conversation → 重新開始
- **長 session 中段清理** → Summarize from here → 釋放 context
- **比較實作方案** → checkpoint → 嘗試 A → 不滿意 → rewind → 嘗試 B

---

## 7. 排程任務（Session-Scoped）

```text
/loop 5m check if deployment finished
/loop 30m /review-pr 1234
remind me at 3pm to push release branch
```

底層工具：`CronCreate`, `CronList`, `CronDelete`

**限制**：session-scoped，關閉 terminal 後消失。持久排程要用 launchd 或 GitHub Actions。

---

## 8. Remote Control

```bash
claude remote-control "My Project"  # 新 session（自訂名稱）
/remote-control                      # 現有 session 中啟動
/rc                                  # 縮寫
/rc My Project                       # 加自訂名稱
```

連接方式：terminal 按空白鍵顯示 QR code；或直接用 URL；或到 `claude.ai/code` session 列表。

| | Remote Control | Claude Code on the web |
|--|----------------|------------------------|
| 執行位置 | **本機** | Anthropic 雲端 |
| 本地 MCP/工具 | ✅ 可用 | ❌ 不可用 |
| 本地檔案系統 | ✅ 完整存取 | ❌ 不可用 |
| 適用場景 | 從桌機開始，手機繼續 | 不需要本地環境的任務 |

**技術細節**：outbound HTTPS only（不開 inbound ports）、多個短期憑證分開 scope、網路中斷後自動重連、每 session 只能一個遠端連線。

**限制**：關閉 terminal = session 結束（不繼續跑）；網路中斷超過 ~10 分鐘 = timeout。

**啟用對所有 session**：`/config → Enable Remote Control for all sessions → true`

```bash
/mobile    # 顯示 Claude app 下載 QR code
/desktop   # 將 session 傳送到 Desktop app
```

---


---

## 12. Fast Mode（Opus 4.6 加速）

```
/fast    # 切換 on/off，Opus 4.6 速度 2.5x，費用更高
```

- `↯` 圖示出現 = fast mode 啟用
- 建議 session **開始**就決定，中途切換會多付整個 context 的費用
- 不適合：背景任務、CI/CD、重成本環境

---


---

## 19. 自訂快捷鍵（Keybindings）

```bash
/keybindings    # 建立或開啟 ~/.claude/keybindings.json（儲存後即時套用）
```

```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "ctrl+s": "chat:stash",
        "ctrl+e": "chat:externalEditor",
        "ctrl+u": null
      }
    },
    {
      "context": "Global",
      "bindings": {
        "ctrl+k ctrl+t": "app:toggleTodos"
      }
    }
  ]
}
```

**常用 Actions**：

| Context | Action | 預設 | 說明 |
|---------|--------|------|------|
| Chat | `chat:stash` | Ctrl+S | 暫存 prompt，問其他問題後取回 |
| Chat | `chat:externalEditor` | Ctrl+G | 在文字編輯器編輯 prompt |
| Chat | `chat:cycleMode` | Shift+Tab | 切換 permission modes |
| Chat | `chat:submit` | Enter | 送出訊息 |
| Global | `app:toggleTodos` | Ctrl+T | 切換 task list |
| Global | `app:toggleTranscript` | Ctrl+O | 切換 verbose transcript |

**Voice Mode**（語音輸入，push-to-talk）：
```json
{ "voice:pushToTalk": "meta+k" }   // 自訂 keybinding
```
預設：Space bar 按住說話；支援 20 種語言（中/英/日/韓/俄/波/土 等）

**和絃語法**：`ctrl+k ctrl+s`（依序按兩個組合鍵）
**注意**：`Ctrl+C`/`Ctrl+D` 不可重綁；`Ctrl+B` 與 tmux 衝突（tmux 用戶按兩次）

---

