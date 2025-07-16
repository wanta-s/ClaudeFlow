#!/bin/bash

# 検証システムのセットアップスクリプト

echo "ClaudeFlow検証システムをセットアップ中..."

# スクリプトディレクトリ
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 実行権限を付与
echo "実行権限を付与中..."
chmod +x "$SCRIPT_DIR/auto-validate.sh"

# 検証ディレクトリ構造を作成
echo "ディレクトリ構造を作成中..."
mkdir -p "$SCRIPT_DIR/../validation/"{patterns,scripts,templates,reports}

# 成功メッセージ
echo ""
echo "✅ セットアップ完了！"
echo ""
echo "使用方法:"
echo "  # 手動検証"
echo "  $SCRIPT_DIR/auto-validate.sh <file>"
echo ""
echo "  # 自動検証（デフォルトで有効）"
echo "  通常通りパイプラインを実行すると自動的に検証されます"
echo ""
echo "  # 自動検証を無効化"
echo "  export CLAUDEFLOW_AUTO_VALIDATE=false"