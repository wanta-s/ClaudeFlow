#!/bin/bash

# コア機能実行テストスクリプト

echo "=== コア機能実行テスト ==="

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# ラピッドプロトタイプ設定を適用
apply_preset "rapid"

echo "環境変数確認:"
echo "  CLAUDEFLOW_FEATURE_SELECTION: $CLAUDEFLOW_FEATURE_SELECTION"

echo ""
echo "修正版 hybrid-implementation.sh を実行..."

# 実行（出力を監視）
./hybrid-implementation.sh ../results/03_requirements_result.md ../results/05_design_result.md 2>&1 | while IFS= read -r line; do
    echo "$line"
    
    # 特定のパターンでスキップ検出
    if [[ "$line" == *"スキップ: feature_005"* ]]; then
        echo "❌ feature_005がスキップされました"
        break
    fi
    
    # 実装開始検出でブレーク（テスト完了）
    if [[ "$line" == *"ステップ1: 機能仕様生成"* ]]; then
        echo "✅ 実装フェーズに到達（テスト成功）"
        break
    fi
done