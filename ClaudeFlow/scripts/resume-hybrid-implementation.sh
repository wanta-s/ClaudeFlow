#!/bin/bash

# ハイブリッド実装を特定の機能から再開するスクリプト

set -e

# デフォルトは feature_002 から開始
START_FEATURE="${1:-feature_002}"
REQUIREMENTS_FILE="${2:-../results/03_requirements_result.md}"
DESIGN_FILE="${3:-../results/05_design_result.md}"

echo "================================================"
echo "    ハイブリッド実装の再開"
echo "================================================"
echo ""
echo "開始機能: $START_FEATURE"
echo ""

# 環境変数を設定して実行
export RESUME_FROM_FEATURE="$START_FEATURE"

# hybrid-implementation.sh を実行
bash hybrid-implementation.sh "$REQUIREMENTS_FILE" "$DESIGN_FILE"