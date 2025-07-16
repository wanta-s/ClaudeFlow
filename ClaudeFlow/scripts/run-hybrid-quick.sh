#!/bin/bash

# 既存のfeatures.jsonを使って実行する簡易スクリプト

set -e

# 既存のfeatures.jsonをプロジェクトディレクトリにコピー
echo "既存のfeatures.jsonを使用します..."

# 実装ディレクトリの作成
mkdir -p ../implementation/todo-app/src

# features.jsonをコピー
cp ../implementation/features.json ../implementation/todo-app/src/

# 環境変数で自動継続と再開を設定
export AUTO_CONTINUE=true
export RESUME_FROM_FEATURE=feature_003  # タスク作成から開始

echo "feature_003（タスク作成）から実装を開始します..."

# ハイブリッド実装を実行
echo -e "1\nA" | bash hybrid-implementation.sh ../results/03_requirements_result.md ../results/05_design_result.md