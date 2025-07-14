#!/bin/bash

# クイックスタートスクリプト
# 使い方: ./quick-start.sh "作りたいアプリの説明"

PROJECT_DESC="${1:-ToDoアプリを作りたい}"

cd ClaudeFlow

# ユーザー入力を作成
echo "# プロジェクト概要" > results/00_user_input.md
echo "" >> results/00_user_input.md
echo "$PROJECT_DESC" >> results/00_user_input.md

echo "プロジェクト: $PROJECT_DESC"
echo ""

# 企画フェーズ
echo "1. 企画を作成中..."
./scripts/run-task.sh planning

# 設計フェーズまで実行
echo "2. 技術調査から設計まで実行中..."
./scripts/run-tasks.sh research requirements prototype design

# 実装
echo "3. 自動実装を開始..."
./scripts/auto-incremental-implementation.sh

echo ""
echo "完了！実装結果は ClaudeFlow/results/implementation/ にあります。"