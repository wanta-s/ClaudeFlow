# 検証システムのセットアップ

## 初期設定

検証システムを使用する前に、以下のコマンドを実行してスクリプトに実行権限を付与してください：

```bash
chmod +x ClaudeFlow/scripts/auto-validate.sh
```

## 必要な環境

- **Python 3.x**: エラーパターンマッチングに使用
- **Node.js** (オプション): JavaScript/TypeScriptの構文チェックに使用

## 確認方法

```bash
# 検証スクリプトのヘルプを表示
./ClaudeFlow/scripts/auto-validate.sh --help
```

## トラブルシューティング

### Permission denied エラー
```bash
chmod +x ClaudeFlow/scripts/auto-validate.sh
```

### Python not found エラー
Python 3をインストールしてください：
```bash
# Ubuntu/Debian
sudo apt-get install python3

# macOS
brew install python3

# Windows
# Python公式サイトからインストーラーをダウンロード
```