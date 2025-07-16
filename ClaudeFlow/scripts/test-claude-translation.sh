#!/bin/bash

# Claude翻訳機能のテストスクリプト

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

echo -e "${CYAN}=== Claude翻訳機能テスト ===${NC}"
echo ""

# Claude CLIの確認
echo -e "${BLUE}環境チェック:${NC}"
if command -v claude >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Claude CLIが利用可能です${NC}"
    claude_version=$(claude --version 2>/dev/null || echo "バージョン情報なし")
    echo -e "  バージョン: $claude_version"
else
    echo -e "${RED}✗ Claude CLIが見つかりません${NC}"
    echo -e "${YELLOW}  Claude翻訳機能は利用できません${NC}"
fi

# 環境変数の確認
echo -e "\n${BLUE}環境変数:${NC}"
echo -e "  CLAUDEFLOW_USE_CLAUDE_TRANSLATION: ${CLAUDEFLOW_USE_CLAUDE_TRANSLATION:-true}"

# テストケース
echo -e "\n${CYAN}テストケース実行:${NC}"

test_apps=(
    "家計簿アプリ"
    "英単語学習ツール"
    "料理レシピ管理"
    "天気予報"
    "タスク管理"
    "写真編集ソフト"
    "音楽プレーヤー"
    "メール管理"
    "カレンダーアプリ"
    "健康管理"
)

# Claude翻訳を有効にしてテスト
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=true
echo -e "\n${BLUE}Claude翻訳有効時:${NC}"
for app in "${test_apps[@]:0:3}"; do
    echo -n -e "  \"$app\" → "
    result=$(extract_project_name "" "test" "$app" 2>&1)
    if echo "$result" | grep -q "Claude変換成功"; then
        final_name=$(echo "$result" | grep -oE "[a-z0-9-]+-app$" | tail -1)
        echo -e "${GREEN}$final_name${NC} (Claude使用)"
    else
        final_name=$(extract_project_name "" "test" "$app" 2>/dev/null)
        echo -e "${YELLOW}$final_name${NC} (フォールバック)"
    fi
done

# Claude翻訳を無効にしてテスト
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=false
echo -e "\n${BLUE}Claude翻訳無効時:${NC}"
for app in "${test_apps[@]:0:3}"; do
    echo -n -e "  \"$app\" → "
    result=$(extract_project_name "" "test" "$app")
    echo -e "${CYAN}$result${NC}"
done

# 変換速度の比較
echo -e "\n${BLUE}変換速度の比較:${NC}"

# Claude有効時
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=true
echo -n "Claude翻訳有効: "
time_start=$(date +%s.%N)
extract_project_name "" "test" "プロジェクト管理ツール" >/dev/null 2>&1
time_end=$(date +%s.%N)
elapsed=$(echo "$time_end - $time_start" | bc)
echo -e "${elapsed}秒"

# Claude無効時
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=false
echo -n "Claude翻訳無効: "
time_start=$(date +%s.%N)
extract_project_name "" "test" "プロジェクト管理ツール" >/dev/null 2>&1
time_end=$(date +%s.%N)
elapsed=$(echo "$time_end - $time_start" | bc)
echo -e "${elapsed}秒"

echo ""
echo -e "${CYAN}=== テスト完了 ===${NC}"