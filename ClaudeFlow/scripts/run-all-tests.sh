#!/bin/bash

# ClaudeFlow 統合テストスイート実行スクリプト
# すべての統合テストを順番に実行し、結果をレポートします

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# テストディレクトリ
SCRIPTS_DIR="$(dirname "$0")"
TEST_RESULTS_DIR="/tmp/claudeflow_test_results_$$"
mkdir -p "$TEST_RESULTS_DIR"

# テスト結果を記録
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}  ClaudeFlow 統合テストスイート${NC}"
echo -e "${PURPLE}========================================${NC}"
echo -e "実行開始: $(date)\n"

# テスト実行関数
run_test_suite() {
    local test_name="$1"
    local test_script="$2"
    local result_file="$TEST_RESULTS_DIR/${test_name}_result.txt"
    
    ((TOTAL_TESTS++))
    
    echo -e "${CYAN}[$TOTAL_TESTS] 実行中: $test_name${NC}"
    echo "----------------------------------------"
    
    if bash "$test_script" > "$result_file" 2>&1; then
        echo -e "${GREEN}✓ 成功: $test_name${NC}\n"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ 失敗: $test_name${NC}"
        echo -e "${YELLOW}エラー詳細:${NC}"
        tail -n 10 "$result_file"
        echo ""
        ((FAILED_TESTS++))
    fi
}

# 各テストスイートを実行
echo -e "${BLUE}=== 統合テストを実行中 ===${NC}\n"

# 1. 共通関数テスト
run_test_suite "共通関数モジュール" "$SCRIPTS_DIR/test-common-functions.sh"

# 2. メインパイプラインテスト
run_test_suite "メインパイプライン" "$SCRIPTS_DIR/test-integration.sh"

# 3. 自動実装機能テスト
run_test_suite "自動実装機能" "$SCRIPTS_DIR/test-auto-implementation.sh"

# 4. E2Eシナリオテスト
run_test_suite "E2Eシナリオ" "$SCRIPTS_DIR/test-e2e-scenarios.sh"

# テスト結果サマリー
echo -e "\n${PURPLE}========================================${NC}"
echo -e "${PURPLE}  テスト結果サマリー${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "合計テスト数: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "成功: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失敗: ${RED}$FAILED_TESTS${NC}"

# 成功率を計算
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "成功率: ${YELLOW}${SUCCESS_RATE}%${NC}"
fi

echo -e "\n実行終了: $(date)"

# 詳細レポートを生成
REPORT_FILE="$TEST_RESULTS_DIR/integration_test_report.md"
cat > "$REPORT_FILE" << EOF
# ClaudeFlow 統合テストレポート

## 実行情報
- 実行日時: $(date)
- テスト環境: $(uname -s) $(uname -r)
- 実行ユーザー: $(whoami)

## テスト結果
| テストスイート | 結果 |
|--------------|------|
| 共通関数モジュール | $([ -f "$TEST_RESULTS_DIR/共通関数モジュール_result.txt" ] && echo "✓" || echo "✗") |
| メインパイプライン | $([ -f "$TEST_RESULTS_DIR/メインパイプライン_result.txt" ] && echo "✓" || echo "✗") |
| 自動実装機能 | $([ -f "$TEST_RESULTS_DIR/自動実装機能_result.txt" ] && echo "✓" || echo "✗") |
| E2Eシナリオ | $([ -f "$TEST_RESULTS_DIR/E2Eシナリオ_result.txt" ] && echo "✓" || echo "✗") |

## サマリー
- 合計テスト: $TOTAL_TESTS
- 成功: $PASSED_TESTS
- 失敗: $FAILED_TESTS
- 成功率: ${SUCCESS_RATE}%

## テスト対象機能
### コア機能
- プロジェクトプランニング
- 要件定義
- タスク生成
- 自動実装
- テスト実行
- エラー修正

### 統合ポイント
- Claude API連携
- ファイルシステム操作
- プロセス管理
- エラーハンドリング
- 進捗追跡

### データフロー
- project_idea.txt → planning.md
- planning.md → requirements.json
- requirements.json → tasks.txt
- tasks.txt → implementation/
- implementation/ → test_results.log
EOF

echo -e "\n${YELLOW}詳細レポート: $REPORT_FILE${NC}"

# テスト実行スクリプトに実行権限を付与
chmod +x "$SCRIPTS_DIR"/test-*.sh 2>/dev/null || true

# 終了ステータス
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ すべての統合テストが成功しました！${NC}"
    
    # 成功時のクリーンアップ
    rm -rf "$TEST_RESULTS_DIR"
    
    exit 0
else
    echo -e "\n${RED}✗ $FAILED_TESTS 個のテストスイートが失敗しました${NC}"
    echo -e "${YELLOW}詳細はテスト結果ディレクトリを確認してください: $TEST_RESULTS_DIR${NC}"
    
    exit 1
fi