#!/bin/bash

# 表示改善機能の統合テスト

echo "=== 表示改善機能テスト ==="

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# 開始時間を記録
test_start_time=$(date +%s)

echo ""
echo "テスト1: 通常モード表示"
echo "========================"
export CLAUDEFLOW_QUIET_MODE="false"
export CLAUDEFLOW_DEBUG_MODE="false"

# 機能実装シミュレーション
show_feature_start "1" "3" "ユーザー認証機能"
show_step "1" "機能仕様生成" "認証APIの仕様を生成します"
sleep 0.5
show_step_complete "機能仕様生成" "仕様ファイル生成完了"
show_step "2" "最小実装" "基本的な認証機能を実装します"
sleep 0.5
show_step_complete "最小実装" "実装ファイル生成完了"
show_feature_complete "ユーザー認証機能"

echo ""
echo "テスト2: 簡潔モード表示"
echo "========================"
export CLAUDEFLOW_QUIET_MODE="true"
export CLAUDEFLOW_DEBUG_MODE="false"

# 機能実装シミュレーション
show_feature_start "2" "3" "データ管理機能"
show_step "1" "機能仕様生成"
sleep 0.3
show_step_complete "機能仕様生成"
show_step "2" "最小実装"
sleep 0.3
show_step_complete "最小実装"
show_feature_complete "データ管理機能"

echo ""
echo "テスト3: デバッグモード表示"
echo "============================"
export CLAUDEFLOW_QUIET_MODE="false"
export CLAUDEFLOW_DEBUG_MODE="true"

debug_info "デバッグモードが有効です"
debug_var "FEATURE_COUNT" "3"
debug_var "IMPL_LEVEL" "standard"
log_debug "内部処理を開始しています"

show_feature_start "3" "3" "UI表示機能"
show_step "1" "機能仕様生成"
sleep 0.2
show_step_complete "機能仕様生成"
show_feature_complete "UI表示機能"

echo ""
echo "テスト4: プログレスバー表示"
echo "============================"
export CLAUDEFLOW_QUIET_MODE="false"

echo "通常モード:"
for i in {1..5}; do
    show_progress "$i" "5" "機能実装中"
    sleep 0.2
done

echo ""
echo "簡潔モード:"
export CLAUDEFLOW_QUIET_MODE="true"
for i in {1..5}; do
    show_progress "$i" "5" "機能実装中"
    sleep 0.2
done

echo ""
echo "テスト5: サマリー表示"
echo "====================="
export CLAUDEFLOW_QUIET_MODE="false"

show_implementation_summary "3" "3" "standard" "$test_start_time"

echo ""
echo "簡潔モード:"
export CLAUDEFLOW_QUIET_MODE="true"
show_brief_summary "3" "3" "standard"

echo ""
echo "=== 全テスト完了 ==="
echo ""
echo "実装された機能:"
echo "✅ 冗長な出力表示の簡潔化"
echo "✅ 進捗表示の改善（プログレスバー風）"
echo "✅ デバッグ出力の制御機能追加"
echo "✅ サマリー表示の強化"
echo ""
echo "使用方法:"
echo "  CLAUDEFLOW_QUIET_MODE=true   # 簡潔モード"
echo "  CLAUDEFLOW_DEBUG_MODE=true   # デバッグモード"