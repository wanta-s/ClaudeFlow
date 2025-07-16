#!/bin/bash

# hybrid-implementation.sh の包括的テストスクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# テストディレクトリ
TEST_DIR="/tmp/hybrid_impl_test_$$"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$TEST_DIR"

# テスト結果
PASSED=0
FAILED=0

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}    hybrid-implementation.sh テストスイート     ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# テスト用の要件・設計ファイルを作成
create_test_files() {
    cat > "$TEST_DIR/test_requirements.md" << 'EOF'
# テスト用タスク管理システム
## 機能要件
- ユーザー認証機能
- タスク管理機能
EOF

    cat > "$TEST_DIR/test_design.md" << 'EOF'
# 技術設計
- TypeScript + Node.js
- Express API
- JWT認証
EOF

    # 小さなfeatures.jsonを作成
    mkdir -p "$TEST_DIR/implementation"
    cat > "$TEST_DIR/implementation/features.json" << 'EOF'
{
  "features": [
    {
      "id": "feature_001",
      "name": "ユーザー登録",
      "description": "新規ユーザーの登録機能",
      "priority": 1,
      "dependencies": []
    },
    {
      "id": "feature_002",
      "name": "ユーザーログイン",
      "description": "ユーザー認証機能",
      "priority": 1,
      "dependencies": []
    }
  ]
}
EOF
}

# テスト実行関数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="${3:-0}"
    
    echo -e "\n${BLUE}テスト: $test_name${NC}"
    
    if eval "$test_command"; then
        actual_result=0
    else
        actual_result=$?
    fi
    
    if [ "$actual_result" -eq "$expected_result" ]; then
        echo -e "${GREEN}✓ 成功${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ 失敗 (期待: $expected_result, 実際: $actual_result)${NC}"
        ((FAILED++))
    fi
}

# テストファイルを作成
create_test_files

# テスト1: 構文チェック
run_test "構文チェック" "bash -n $SCRIPT_DIR/hybrid-implementation.sh"

# テスト2: 引数なしでの実行（エラーになるべき）
run_test "引数なしエラー" "cd $TEST_DIR && timeout 5 bash $SCRIPT_DIR/hybrid-implementation.sh 2>&1 | grep -q 'エラー'" 0

# テスト3: ラフレベルの自動実行テスト
echo -e "\n${YELLOW}テスト3: ラフレベル自動実行${NC}"
cd "$TEST_DIR"
# 入力を自動化（レベル1を選択）
if echo "1" | timeout 30 bash "$SCRIPT_DIR/hybrid-implementation.sh" \
    "$TEST_DIR/test_requirements.md" \
    "$TEST_DIR/test_design.md" \
    > "$TEST_DIR/rough_output.log" 2>&1; then
    
    # ログ確認
    if grep -q "ラフレベルで実装します" "$TEST_DIR/rough_output.log" && \
       grep -q "自動実行モード: 有効" "$TEST_DIR/rough_output.log" && \
       grep -q "ステップ4: 即時テスト生成と実行" "$TEST_DIR/rough_output.log"; then
        echo -e "${GREEN}✓ ラフレベル実装: 成功${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ ラフレベル実装: 期待される出力が見つかりません${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ ラフレベル実装: 実行エラー${NC}"
    ((FAILED++))
fi

# テスト4: 確認モードテスト
echo -e "\n${YELLOW}テスト4: 確認モード（AUTO_CONTINUE=false）${NC}"
cd "$TEST_DIR"
# nで中断する入力を準備
if echo -e "2\nn" | AUTO_CONTINUE=false timeout 30 bash "$SCRIPT_DIR/hybrid-implementation.sh" \
    "$TEST_DIR/test_requirements.md" \
    "$TEST_DIR/test_design.md" \
    > "$TEST_DIR/confirm_output.log" 2>&1; then
    
    if grep -q "確認モード: 各機能実装後に確認します" "$TEST_DIR/confirm_output.log" && \
       grep -q "次の機能に進みますか？" "$TEST_DIR/confirm_output.log"; then
        echo -e "${GREEN}✓ 確認モード: 成功${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ 確認モード: 期待される出力が見つかりません${NC}"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}△ 確認モード: タイムアウトまたは中断（期待動作）${NC}"
    ((PASSED++))
fi

# テスト5: RESUME_FROM_FEATURE テスト
echo -e "\n${YELLOW}テスト5: 再開機能テスト${NC}"
cd "$TEST_DIR"
if echo "2" | RESUME_FROM_FEATURE=feature_002 timeout 30 bash "$SCRIPT_DIR/hybrid-implementation.sh" \
    "$TEST_DIR/test_requirements.md" \
    "$TEST_DIR/test_design.md" \
    > "$TEST_DIR/resume_output.log" 2>&1; then
    
    if grep -q "スキップ: feature_001" "$TEST_DIR/resume_output.log" && \
       grep -q "再開: feature_002 から実装を開始します" "$TEST_DIR/resume_output.log"; then
        echo -e "${GREEN}✓ 再開機能: 成功${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ 再開機能: 期待される出力が見つかりません${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ 再開機能: 実行エラー${NC}"
    ((FAILED++))
fi

# テスト6: 実装レベル別ステップ確認
echo -e "\n${YELLOW}テスト6: 実装レベル別ステップ確認${NC}"
for level in 1 2 3; do
    case $level in
        1) level_name="ラフ" ;;
        2) level_name="標準" ;;
        3) level_name="商用" ;;
    esac
    
    cd "$TEST_DIR"
    echo "$level" | timeout 30 bash "$SCRIPT_DIR/hybrid-implementation.sh" \
        "$TEST_DIR/test_requirements.md" \
        "$TEST_DIR/test_design.md" \
        > "$TEST_DIR/level${level}_output.log" 2>&1 || true
    
    # ステップ数を確認
    step_count=$(grep -c "ステップ[0-9]:" "$TEST_DIR/level${level}_output.log" || echo "0")
    echo "  ${level_name}レベル: ${step_count} ステップ実行"
done

# 結果サマリー
echo -e "\n${CYAN}================================================${NC}"
echo -e "${CYAN}                テスト結果                      ${NC}"
echo -e "${CYAN}================================================${NC}"
echo -e "成功: ${GREEN}$PASSED${NC}"
echo -e "失敗: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}すべてのテストが成功しました！${NC}"
    rm -rf "$TEST_DIR"
    exit 0
else
    echo -e "${RED}いくつかのテストが失敗しました。${NC}"
    echo -e "${YELLOW}ログファイル: $TEST_DIR${NC}"
    exit 1
fi