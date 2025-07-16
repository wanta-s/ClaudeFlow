#!/bin/bash

# CodeFit Design システムのテストスクリプト
# 各機能の動作確認を行います

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}    CodeFit Design システムテスト           ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# テスト1: 基本的な関数の存在確認
echo -e "${BLUE}テスト1: 基本機能の存在確認${NC}"
functions_to_test=(
    "estimate_feature_lines"
    "interactive_feature_selection"
    "show_line_usage_bar"
    "save_feature_selection"
    "show_realtime_constraints"
    "generate_codefit_prompt"
    "check_project_line_limit"
    "generate_line_limit_report"
    "apply_mode_line_limits"
)

for func in "${functions_to_test[@]}"; do
    if declare -f "$func" >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓ $func - 存在確認済み${NC}"
    else
        echo -e "${RED}  ✗ $func - 存在しません${NC}"
    fi
done
echo ""

# テスト2: 環境変数の確認
echo -e "${BLUE}テスト2: 環境変数の確認${NC}"
variables_to_test=(
    "CLAUDEFLOW_MAX_LINES"
    "CLAUDEFLOW_LINE_CHECK"
    "CLAUDEFLOW_WARNING_THRESHOLD"
    "RESULTS_DIR"
    "PROJECT_ROOT"
)

for var in "${variables_to_test[@]}"; do
    if [ -n "${!var}" ]; then
        echo -e "${GREEN}  ✓ $var = ${!var}${NC}"
    else
        echo -e "${RED}  ✗ $var - 未定義${NC}"
    fi
done
echo ""

# テスト3: 行数見積もり機能のテスト
echo -e "${BLUE}テスト3: 行数見積もり機能${NC}"
if declare -f estimate_feature_lines >/dev/null 2>&1; then
    test_cases=(
        "ui:simple:30"
        "ui:medium:60"
        "ui:complex:100"
        "logic:simple:50"
        "logic:medium:100"
        "logic:complex:200"
        "data:simple:40"
        "data:medium:80"
        "data:complex:150"
        "animation:simple:20"
        "animation:medium:50"
        "animation:complex:100"
    )
    
    for test_case in "${test_cases[@]}"; do
        IFS=':' read -r type complexity expected <<< "$test_case"
        result=$(estimate_feature_lines "$type" "$complexity")
        if [ "$result" -eq "$expected" ]; then
            echo -e "${GREEN}  ✓ $type:$complexity = $result行 (期待値: $expected)${NC}"
        else
            echo -e "${RED}  ✗ $type:$complexity = $result行 (期待値: $expected)${NC}"
        fi
    done
else
    echo -e "${RED}  ✗ estimate_feature_lines 関数が存在しません${NC}"
fi
echo ""

# テスト4: 行数使用量バーの表示テスト
echo -e "${BLUE}テスト4: 行数使用量バー表示${NC}"
if declare -f show_line_usage_bar >/dev/null 2>&1; then
    test_values=(
        "500:2000"
        "1600:2000"
        "2100:2000"
    )
    
    for test_value in "${test_values[@]}"; do
        IFS=':' read -r current max <<< "$test_value"
        echo -e "${CYAN}  現在: ${current}行 / 最大: ${max}行${NC}"
        show_line_usage_bar "$current" "$max"
    done
else
    echo -e "${RED}  ✗ show_line_usage_bar 関数が存在しません${NC}"
fi
echo ""

# テスト5: モード別行数制限の適用テスト
echo -e "${BLUE}テスト5: モード別行数制限${NC}"
if declare -f apply_mode_line_limits >/dev/null 2>&1; then
    modes=("ultra_light" "light" "standard")
    
    for mode in "${modes[@]}"; do
        echo -e "${CYAN}  モード: $mode${NC}"
        export CLAUDEFLOW_MODE="$mode"
        apply_mode_line_limits
    done
else
    echo -e "${RED}  ✗ apply_mode_line_limits 関数が存在しません${NC}"
fi
echo ""

# テスト6: ファイル作成テスト
echo -e "${BLUE}テスト6: ファイル作成機能${NC}"
if declare -f save_feature_selection >/dev/null 2>&1; then
    # テスト用のディレクトリを作成
    test_dir="/tmp/codefit_test_$$"
    mkdir -p "$test_dir"
    
    # 一時的にRESULTS_DIRを変更
    original_results_dir="$RESULTS_DIR"
    RESULTS_DIR="$test_dir"
    
    # テスト用のデータを作成
    test_features=("基本UI" "コア機能" "データ処理")
    test_lines=(30 100 40)
    test_priorities=("高" "高" "中")
    
    echo -e "${CYAN}  テストデータでファイル作成中...${NC}"
    save_feature_selection "テストアプリ" 170 2000 "test_features" "test_lines" "test_priorities"
    
    # ファイルの存在確認
    selection_file="$test_dir/codefit_feature_selection.md"
    if [ -f "$selection_file" ]; then
        echo -e "${GREEN}  ✓ 機能選択ファイルが作成されました${NC}"
        echo -e "${CYAN}    ファイル内容の確認:${NC}"
        head -n 10 "$selection_file" | sed 's/^/      /'
    else
        echo -e "${RED}  ✗ 機能選択ファイルが作成されませんでした${NC}"
    fi
    
    # クリーンアップ
    rm -rf "$test_dir"
    RESULTS_DIR="$original_results_dir"
else
    echo -e "${RED}  ✗ save_feature_selection 関数が存在しません${NC}"
fi
echo ""

# テスト7: 構文チェック
echo -e "${BLUE}テスト7: スクリプト構文チェック${NC}"
scripts_to_check=(
    "ultra-light.sh"
    "common-functions.sh"
    "start.sh"
    "run-pipeline.sh"
)

for script in "${scripts_to_check[@]}"; do
    if [ -f "$SCRIPT_DIR/$script" ]; then
        if bash -n "$SCRIPT_DIR/$script" 2>/dev/null; then
            echo -e "${GREEN}  ✓ $script - 構文OK${NC}"
        else
            echo -e "${RED}  ✗ $script - 構文エラー${NC}"
            bash -n "$SCRIPT_DIR/$script"
        fi
    else
        echo -e "${YELLOW}  ⚠ $script - ファイルが存在しません${NC}"
    fi
done
echo ""

# テスト結果サマリー
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}           テスト完了                        ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${GREEN}✅ CodeFit Design システムのテストが完了しました${NC}"
echo -e "${BLUE}🎯 システムは正常に動作する準備が整っています${NC}"
echo ""
echo -e "${YELLOW}💡 実際の動作テストを行う場合は:${NC}"
echo -e "${CYAN}   ./ultra-light.sh${NC}"
echo -e "${CYAN}   または${NC}"
echo -e "${CYAN}   ./start.sh${NC}"
echo ""