#!/bin/bash

# ローマ字変換フォールバックのテストスクリプト

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

echo -e "${CYAN}=== ローマ字変換フォールバックテスト ===${NC}"
echo ""

# テストケース
test_cases=(
    "スーパーマリオ"
    "ドラゴンクエスト"
    "ポケモン"
    "アニメーション"
    "エンターテインメント"
    "コンピューター"
    "インターネット"
    "プログラミング"
    "デザイン"
    "マーケティング"
    "シミュレーション"
    "アドベンチャー"
    "ファンタジー"
    "サイエンス"
    "エンジニアリング"
    "データベース"
    "セキュリティ"
    "ネットワーク"
    "アルゴリズム"
    "フレームワーク"
    "バックアップ"
    "ダウンロード"
    "アップロード"
    "インストール"
    "アプリケーション"
    "パフォーマンス"
    "メンテナンス"
    "アクセシビリティ"
    "ユーザビリティ"
    "インターフェース"
)

echo -e "${BLUE}既存のマッピングテスト:${NC}"
# 既存のマッピングがあるケース
existing_mappings=(
    "オセロ"
    "魚釣り"
    "ボーリング"
    "テトリス"
    "計算機"
    "メモ帳"
    "カレンダー"
    "チャット"
    "ゲーム"
    "アプリ"
)

for test_name in "${existing_mappings[@]}"; do
    result=$(extract_project_name "" "test" "$test_name")
    echo -e "  \"$test_name\" → ${GREEN}\"$result\"${NC}"
done

echo ""
echo -e "${BLUE}ローマ字変換フォールバックテスト:${NC}"

# Python3が利用可能かチェック
if command -v python3 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Python3が利用可能です${NC}"
else
    echo -e "${YELLOW}⚠ Python3が利用できません。基本的なsed変換のみ使用されます${NC}"
fi
echo ""

# ローマ字変換のテスト
for test_name in "${test_cases[@]}"; do
    result=$(extract_project_name "" "test" "$test_name")
    echo -e "  \"$test_name\" → ${CYAN}\"$result\"${NC}"
done

echo ""
echo -e "${BLUE}特殊なケースのテスト:${NC}"

# 特殊なケース
special_cases=(
    "あいうえお"
    "かきくけこ"
    "ひらがなテスト"
    "カタカナテスト"
    "混合テストMixed"
    "123数字入り"
    "スペース 入り"
    "ハイフン-入り"
    "アンダースコア_入り"
    "記号！＃＄％"
    "漢字太郎"
    "🎮絵文字入り"
)

for test_name in "${special_cases[@]}"; do
    result=$(extract_project_name "" "test" "$test_name")
    echo -e "  \"$test_name\" → ${YELLOW}\"$result\"${NC}"
done

echo ""
echo -e "${CYAN}=== テスト完了 ===${NC}"