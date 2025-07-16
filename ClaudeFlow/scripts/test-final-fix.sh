#!/bin/bash

# 最終修正版のテストスクリプト

set -e

echo "=== 最終修正版テスト ==="

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# ラピッドプロトタイプ設定を適用
apply_preset "rapid"

echo "設定確認:"
echo "  CLAUDEFLOW_FEATURE_SELECTION: $CLAUDEFLOW_FEATURE_SELECTION"

echo ""
echo "hybrid-implementation.sh を開始します..."
echo "（30秒でタイムアウト）"

# タイムアウト付きで実行
timeout 30 ./hybrid-implementation.sh ../results/03_requirements_result.md ../results/05_design_result.md || {
    exit_code=$?
    echo ""
    if [ $exit_code -eq 124 ]; then
        echo "❌ タイムアウト: まだハングしています"
        echo "最後の出力を確認する必要があります"
    else
        echo "❌ エラーで終了: exit code $exit_code"
    fi
    exit $exit_code
}

echo ""
echo "✅ 正常に完了しました！"