#!/bin/bash

# 自動機能選択のテストスクリプト

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

echo -e "${CYAN}=== 自動機能選択テスト ===${NC}"
echo ""

# テスト用の一時ディレクトリ作成
TEST_DIR="/tmp/claudeflow_auto_test_$$"
mkdir -p "$TEST_DIR"
export RESULTS_DIR="$TEST_DIR"

echo -e "${BLUE}テストケース1: 自動選択モード（デフォルト）${NC}"
export CLAUDEFLOW_AUTO_FEATURES=true
export CLAUDEFLOW_MAX_LINES=800

echo "アプリ名: テストアプリ"
echo "行数制限: 800行"
echo ""

# 自動選択実行
auto_select_features "テストアプリ" "$TEST_DIR/dummy_requirements.md"

echo ""
echo -e "${BLUE}生成されたファイルの確認:${NC}"
if [ -f "$TEST_DIR/features.json" ]; then
    echo -e "${GREEN}✓ features.json が生成されました${NC}"
    echo "内容:"
    cat "$TEST_DIR/features.json" | head -20
else
    echo -e "${RED}✗ features.json が生成されませんでした${NC}"
fi

echo ""
echo -e "${BLUE}テストケース2: 行数制限を変更（1500行）${NC}"
export CLAUDEFLOW_MAX_LINES=1500
rm -f "$TEST_DIR/features.json"

auto_select_features "大規模アプリ" "$TEST_DIR/dummy_requirements.md"

echo ""
echo -e "${BLUE}テストケース3: 対話的選択モード${NC}"
export CLAUDEFLOW_AUTO_FEATURES=false
echo -e "${YELLOW}注: 対話的モードでは実際にユーザー入力が必要です${NC}"
echo "CLAUDEFLOW_AUTO_FEATURES=$CLAUDEFLOW_AUTO_FEATURES"

# クリーンアップ
rm -rf "$TEST_DIR"

echo ""
echo -e "${CYAN}=== テスト完了 ===${NC}"
echo ""
echo -e "${GREEN}使用方法:${NC}"
echo "1. 自動選択（デフォルト）:"
echo "   ./ultra-light.sh"
echo ""
echo "2. 対話的選択:"
echo "   CLAUDEFLOW_AUTO_FEATURES=false ./ultra-light.sh"
echo ""
echo "3. 行数制限の変更:"
echo "   CLAUDEFLOW_MAX_LINES=1500 ./ultra-light.sh"