#!/bin/bash

# 簡潔モード表示テストスクリプト

echo "=== 簡潔モード表示テスト ==="

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# テスト1: 通常モード
echo ""
echo "テスト1: 通常モード"
export CLAUDEFLOW_QUIET_MODE="false"

show_feature_start "1" "3" "テスト機能"
show_step "1" "テスト仕様生成"
show_step_complete "テスト仕様生成" "仕様ファイル生成完了"
show_step "2" "テスト実装"
show_step_complete "テスト実装" "実装ファイル生成完了"
show_feature_complete "テスト機能"

echo ""
echo "テスト2: 簡潔モード"
export CLAUDEFLOW_QUIET_MODE="true"

show_feature_start "2" "3" "テスト機能2"
show_step "1" "テスト仕様生成"
show_step_complete "テスト仕様生成" "仕様ファイル生成完了"
show_step "2" "テスト実装"
show_step_complete "テスト実装" "実装ファイル生成完了"
show_feature_complete "テスト機能2"

echo ""
echo "テスト3: プログレスバー"
export CLAUDEFLOW_QUIET_MODE="false"

echo "通常モードプログレスバー:"
for i in {1..10}; do
    show_progress "$i" "10" "処理中"
    sleep 0.1
done

echo ""
echo "簡潔モードプログレスバー:"
export CLAUDEFLOW_QUIET_MODE="true"
for i in {1..10}; do
    show_progress "$i" "10" "処理中"
    sleep 0.1
done

echo ""
echo "=== テスト完了 ==="