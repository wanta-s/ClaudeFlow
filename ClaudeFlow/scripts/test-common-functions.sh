#!/bin/bash

# common-functions.sh の統合テスト
# 共通関数モジュールの各機能を検証します

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 共通関数をソース（一時ディレクトリに移動する前に）
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/common-functions.sh" || {
    echo -e "${RED}エラー: common-functions.sh が見つかりません${NC}"
    exit 1
}

# テスト用の一時ディレクトリ
TEST_DIR="/tmp/claudeflow_common_test_$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# テスト結果
PASSED=0
FAILED=0

# テスト実行関数
test_function() {
    local test_name="$1"
    local test_code="$2"
    
    echo -ne "テスト: $test_name ... "
    
    if eval "$test_code" >/dev/null 2>&1; then
        echo -e "${GREEN}合格${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失敗${NC}"
        ((FAILED++))
    fi
}

echo -e "${YELLOW}=== common-functions.sh 統合テスト ===${NC}\n"

# 1. API キーチェック機能のテスト
test_function "check_claude_api_key - APIキーあり" "
    CLAUDE_API_KEY='test_key_12345' check_claude_api_key
"

test_function "check_claude_api_key - APIキーなし" "
    unset CLAUDE_API_KEY
    ! check_claude_api_key 2>/dev/null
"

# 2. トークン追跡機能のテスト
test_function "reset_token_count" "
    reset_token_count
    [ -f '.token_count' ] && [ \"\$(cat .token_count)\" = '0' ]
"

test_function "add_tokens" "
    reset_token_count
    add_tokens 100
    add_tokens 250
    [ \"\$(cat .token_count)\" = '350' ]
"

test_function "get_total_tokens" "
    reset_token_count
    add_tokens 500
    [ \"\$(get_total_tokens)\" = '500' ]
"

# 3. ログ機能のテスト
test_function "log_info" "
    log_info 'テスト情報メッセージ'
    grep -q 'テスト情報メッセージ' pipeline.log
"

test_function "log_error" "
    log_error 'テストエラーメッセージ'
    grep -q 'ERROR.*テストエラーメッセージ' pipeline.log
"

test_function "log_debug" "
    DEBUG=true log_debug 'デバッグメッセージ'
    grep -q 'DEBUG.*デバッグメッセージ' pipeline.log
"

# 4. プロンプト関数のテスト
test_function "call_claude_with_prompt - ドライラン" "
    DRY_RUN=true
    result=\$(call_claude_with_prompt 'テストプロンプト' 2>/dev/null)
    [ -n \"\$result\" ]
"

# 5. select_option 関数のテスト
test_function "select_option - 有効な選択" "
    echo '2' | select_option 'テスト選択' 'オプション1' 'オプション2' 'オプション3' >/dev/null
    [ \$? -eq 0 ]
"

test_function "select_option - 無効な選択" "
    echo '5' | select_option 'テスト選択' 'オプション1' 'オプション2' >/dev/null || true
    [ \$? -ne 0 ]
"

# 6. confirm 関数のテスト
test_function "confirm - Yes" "
    echo 'y' | confirm 'テスト確認' >/dev/null
"

test_function "confirm - No" "
    echo 'n' | confirm 'テスト確認' >/dev/null || true
    [ \$? -ne 0 ]
"

# 7. ファイル操作関数のテスト
test_function "ensure_file_exists" "
    ensure_file_exists 'test_file.txt'
    [ -f 'test_file.txt' ]
"

test_function "backup_file" "
    echo 'テスト内容' > original.txt
    backup_file 'original.txt'
    [ -f 'original.txt.bak' ]
"

# 8. エラーハンドリングのテスト
test_function "エラーハンドリング - 存在しない関数" "
    ! call_nonexistent_function 2>/dev/null
"

# 9. 環境変数の検証
test_function "環境変数 - PROJECT_ROOT" "
    [ -n \"\$PROJECT_ROOT\" ]
"

test_function "環境変数 - SCRIPTS_DIR" "
    [ -n \"\$SCRIPTS_DIR\" ] && [ -d \"\$SCRIPTS_DIR\" ]
"

# 10. ユーティリティ関数のテスト
test_function "create_directory" "
    create_directory 'test_dir/sub_dir'
    [ -d 'test_dir/sub_dir' ]
"

test_function "format_json" "
    echo '{\"key\":\"value\"}' | format_json >/dev/null
    [ \$? -eq 0 ]
"

# 結果サマリー
echo -e "\n${YELLOW}=== テスト結果 ===${NC}"
echo -e "合格: ${GREEN}$PASSED${NC}"
echo -e "失敗: ${RED}$FAILED${NC}"

# クリーンアップ
cd /
rm -rf "$TEST_DIR"

# 終了ステータス
if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}すべてのテストが合格しました！${NC}"
    exit 0
else
    echo -e "\n${RED}$FAILED 個のテストが失敗しました${NC}"
    exit 1
fi