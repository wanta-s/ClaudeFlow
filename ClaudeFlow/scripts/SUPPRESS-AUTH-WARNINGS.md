# 認証警告メッセージの制御

## 変更内容

`[WARNING] 認証関連の処理を検出しました。` というメッセージが繰り返し表示される問題を修正しました。

## 解決方法

デフォルトでは警告メッセージは表示されません。

### 警告を再度有効にする場合

```bash
export SHOW_AUTH_WARNINGS=true
./run-pipeline.sh your_input.md
```

### 警告を無効にする（デフォルト）

```bash
# 環境変数を設定しないか、falseに設定
export SHOW_AUTH_WARNINGS=false
./run-pipeline.sh your_input.md
```

## なぜこの警告が出ていたか

- 自動認証モード（AUTO_APPROVE_ENABLED）が有効な場合
- 入力内容に「password」「auth」「jwt」「secret」「key」などのキーワードが含まれていると
- 毎回警告メッセージが表示されていました

タスク管理アプリなどでは認証機能が含まれるため、このメッセージが頻繁に表示されていました。

## 影響

- 機能への影響はありません
- ログの見やすさが改善されます
- 必要に応じて警告を再度有効にできます