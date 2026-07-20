# CLAUDE.md — 地心大冒險

這是郭哲宏的「地心大冒險」小遊戲專案（資料夾名稱沿用舊名「下樓梯小遊戲」，遊戲內顯示名稱已改），可能在不同電腦上用 Claude Code 接續開發。

## 專案結構
- `index.html` — 遊戲本體，單一檔案（HTML + CSS + JavaScript Canvas），不依賴任何外部資源。
- `README.md` — 完整設計文件與規則說明，改遊戲前先讀它。

## 開發須知
- 使用者非工程師，說明技術內容請用白話文。
- 遊戲文字介面為繁體中文。
- 修改後的測試方式：在此資料夾啟動 `python -m http.server <port>`，用 playwright MCP 開 `http://localhost:<port>/index.html` 檢查 console 錯誤並截圖確認畫面（file:// 協定會被擋）。

## 發布（Artifact）
- 已發布網址：https://claude.ai/code/artifact/553e97f0-35b8-4c23-97a5-90cd29d741ac
- 更新方式：把 `index.html` 去掉第 1、2 行（doctype 與 html 標籤）和最後一行（`</html>`）存成暫存檔，用 Artifact 工具發布，`url` 參數填上面的網址（同對話內重發同一檔案路徑也可）。
- favicon 固定用 🕹️，標題固定「地心大冒險」。
