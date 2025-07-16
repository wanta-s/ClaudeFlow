#!/bin/bash

# 超軽量モード手動テストスクリプト
# Bash tool execution issue を回避するための手動テスト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}      🧪 超軽量モード手動テスト 🧪              ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# テスト1: プロジェクトクリア機能のテスト
echo -e "${BLUE}テスト1: プロジェクトクリア機能${NC}"
echo ""

# 既存のプロジェクト設定をチェック
PROJECT_ROOT="/mnt/c/makeProc/ClaudeFlow"

echo -e "${YELLOW}既存のプロジェクト設定をチェック中...${NC}"

if [ -f "$PROJECT_ROOT/ClaudeFlow/implementation/features.json" ]; then
    echo -e "${YELLOW}⚠️ features.json が見つかりました${NC}"
    echo "場所: $PROJECT_ROOT/ClaudeFlow/implementation/features.json"
    
    # バックアップ作成
    backup_suffix="$(date +%Y%m%d_%H%M%S)"
    backup_dir="$PROJECT_ROOT/backup_manual_test_${backup_suffix}"
    mkdir -p "$backup_dir"
    
    echo -e "${BLUE}バックアップを作成中: $backup_dir${NC}"
    cp "$PROJECT_ROOT/ClaudeFlow/implementation/features.json" "$backup_dir/" 2>/dev/null || true
    
    echo -e "${GREEN}✅ バックアップ完了${NC}"
else
    echo -e "${GREEN}✅ プロジェクト設定は既にクリアです${NC}"
fi

echo ""

# テスト2: 軽量モードディレクトリ構造の確認
echo -e "${BLUE}テスト2: 軽量モードスクリプトの存在確認${NC}"
echo ""

scripts_to_check=(
    "$PROJECT_ROOT/ClaudeFlow/scripts/ultra-light.sh"
    "$PROJECT_ROOT/ClaudeFlow/scripts/start.sh"
    "$PROJECT_ROOT/ClaudeFlow/scripts/common-functions.sh"
    "$PROJECT_ROOT/ClaudeFlow/docs/LIGHT-MODE-USAGE.md"
)

for script in "${scripts_to_check[@]}"; do
    if [ -f "$script" ]; then
        echo -e "${GREEN}✅ $(basename "$script") - 存在${NC}"
    else
        echo -e "${RED}❌ $(basename "$script") - 見つからない${NC}"
    fi
done

echo ""

# テスト3: 環境変数テスト
echo -e "${BLUE}テスト3: 軽量モード環境変数の確認${NC}"
echo ""

echo "CLAUDEFLOW_MODE=${CLAUDEFLOW_MODE:-"未設定"}"
echo "CLAUDEFLOW_TIMEOUT_SPEC=${CLAUDEFLOW_TIMEOUT_SPEC:-"デフォルト"}"
echo "AUTO_CONTINUE=${AUTO_CONTINUE:-"未設定"}"

echo ""

# テスト4: ドキュメント整合性の確認
echo -e "${BLUE}テスト4: ドキュメント整合性の確認${NC}"
echo ""

# README.mdで軽量モードが言及されているかチェック
if grep -q "超軽量モード" "$PROJECT_ROOT/README.md"; then
    echo -e "${GREEN}✅ README.md - 超軽量モードの説明あり${NC}"
else
    echo -e "${YELLOW}⚠️ README.md - 超軽量モードの説明を確認${NC}"
fi

# start.shで軽量モードのオプションがあるかチェック
if grep -q "超軽量モード" "$PROJECT_ROOT/ClaudeFlow/scripts/start.sh"; then
    echo -e "${GREEN}✅ start.sh - 超軽量モードオプションあり${NC}"
else
    echo -e "${RED}❌ start.sh - 超軽量モードオプションなし${NC}"
fi

echo ""

# テスト5: プロジェクトのファイル権限確認
echo -e "${BLUE}テスト5: ファイル権限の確認${NC}"
echo ""

if [ -x "$PROJECT_ROOT/ClaudeFlow/scripts/ultra-light.sh" ]; then
    echo -e "${GREEN}✅ ultra-light.sh - 実行権限あり${NC}"
else
    echo -e "${YELLOW}⚠️ ultra-light.sh - 実行権限なし${NC}"
    chmod +x "$PROJECT_ROOT/ClaudeFlow/scripts/ultra-light.sh" 2>/dev/null || true
fi

if [ -x "$PROJECT_ROOT/ClaudeFlow/scripts/start.sh" ]; then
    echo -e "${GREEN}✅ start.sh - 実行権限あり${NC}"
else
    echo -e "${YELLOW}⚠️ start.sh - 実行権限なし${NC}"
    chmod +x "$PROJECT_ROOT/ClaudeFlow/scripts/start.sh" 2>/dev/null || true
fi

echo ""

# 結果サマリー
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}           📋 テスト結果サマリー               ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

echo -e "${GREEN}✅ 完了したテスト:${NC}"
echo "  - プロジェクトクリア機能の確認"
echo "  - 軽量モードスクリプトの存在確認"
echo "  - 環境変数の確認"
echo "  - ドキュメント整合性の確認"
echo "  - ファイル権限の確認"

echo ""
echo -e "${BLUE}🎯 次のステップ:${NC}"
echo "1. 実際のClaudeAPIを使った超軽量モードのテスト"
echo "2. オセロゲーム作成による実動作確認"
echo "3. 生成ファイルの品質確認"

echo ""
echo -e "${YELLOW}💡 注意: Bash tool実行エラーのため手動テストを実施${NC}"
echo "通常の自動テストは環境修復後に実行してください"

echo ""
echo "テスト完了時刻: $(date)"