#!/bin/bash

# ClaudeFlow 統合テストスイート
# このスクリプトは、ClaudeFlowシステム全体の統合テストを実行します

set -e

# テスト環境の初期化
export TEST_MODE=true
export CLAUDE_API_KEY="${CLAUDE_API_KEY:-test_key}"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# テスト結果カウンター
TESTS_PASSED=0
TESTS_FAILED=0

# テスト結果を記録する関数
record_test() {
    local test_name="$1"
    local result="$2"
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓ $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $test_name${NC}"
        ((TESTS_FAILED++))
    fi
}

# テスト実行関数
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${BLUE}実行中: $test_name${NC}"
    
    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        record_test "$test_name" "PASS"
    else
        record_test "$test_name" "FAIL"
        echo "エラー出力:"
        tail -n 20 /tmp/test_output.log
    fi
}

# 共通関数のソース
source "$(dirname "$0")/common-functions.sh" || {
    echo -e "${RED}エラー: common-functions.sh が見つかりません${NC}"
    exit 1
}

echo -e "${YELLOW}=== ClaudeFlow 統合テスト ===${NC}"
echo "開始時刻: $(date)"

# テスト1: 環境チェック
run_test "環境チェック" "check_claude_api_key"

# テスト2: プロジェクトディレクトリ作成
TEST_PROJECT_DIR="/tmp/claudeflow_test_$$"
run_test "プロジェクトディレクトリ作成" "mkdir -p '$TEST_PROJECT_DIR'"

# テスト3: プロンプトテンプレート検証
run_test "プロンプトテンプレート検証" "
    [ -f '$(dirname "$0")/prompts/planning.txt' ] && 
    [ -f '$(dirname "$0")/prompts/research.txt' ] &&
    [ -f '$(dirname "$0")/prompts/requirements.txt' ]
"

# テスト4: トークン追跡機能
run_test "トークン追跡機能" "
    reset_token_count
    add_tokens 100
    add_tokens 200
    [ \"\$(get_total_tokens)\" = \"300\" ]
"

# テスト5: パイプライン基本動作
run_test "パイプライン基本動作" "
    cd '$TEST_PROJECT_DIR'
    echo 'シンプルなToDoアプリ' > project_idea.txt
    # ドライランモードで実行
    DRY_RUN=true bash '$(dirname "$0")/run-pipeline.sh' --mode quick
"

# テスト6: タスク生成機能
run_test "タスク生成機能" "
    cd '$TEST_PROJECT_DIR'
    echo '{\"project\": \"test\", \"features\": [\"feature1\"]}' > requirements.json
    DRY_RUN=true bash '$(dirname "$0")/generate-tasks.sh'
"

# テスト7: 自動実装機能（モック）
run_test "自動実装機能モック" "
    cd '$TEST_PROJECT_DIR'
    echo 'タスク1: テスト機能の実装' > tasks.txt
    DRY_RUN=true bash '$(dirname "$0")/auto-incremental-implementation.sh'
"

# テスト8: エラーハンドリング
run_test "エラーハンドリング - 無効なモード" "
    ! bash '$(dirname "$0")/run-pipeline.sh' --mode invalid_mode 2>/dev/null
"

# テスト9: 共通関数の検証
run_test "共通関数 - select_option" "
    echo '1' | select_option 'テスト選択' 'オプション1' 'オプション2' 'オプション3' >/dev/null
"

# テスト10: ログ機能
run_test "ログ機能" "
    cd '$TEST_PROJECT_DIR'
    log_info 'テストメッセージ'
    [ -f 'pipeline.log' ]
"

# クリーンアップ
rm -rf "$TEST_PROJECT_DIR"
rm -f /tmp/test_output.log

# テスト結果のサマリー
echo -e "\n${YELLOW}=== テスト結果サマリー ===${NC}"
echo -e "合格: ${GREEN}$TESTS_PASSED${NC}"
echo -e "失敗: ${RED}$TESTS_FAILED${NC}"
echo "終了時刻: $(date)"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}すべてのテストが合格しました！${NC}"
    exit 0
else
    echo -e "\n${RED}$TESTS_FAILED 個のテストが失敗しました${NC}"
    exit 1
fi