#!/bin/bash

# feature_002（ユーザーログイン）から再開する簡易スクリプト

echo "================================================"
echo "    feature_002 から実装を再開"
echo "================================================"
echo ""

cd "$(dirname "$0")"

# 環境変数を設定して実行
RESUME_FROM_FEATURE=feature_002 bash hybrid-implementation.sh ../results/03_requirements_result.md ../results/05_design_result.md