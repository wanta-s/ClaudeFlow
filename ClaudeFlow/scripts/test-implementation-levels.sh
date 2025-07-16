#!/bin/bash

# 実装レベルのテストスクリプト
# 各レベルで同じ機能を実装してステップ数と時間を比較

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}    実装レベル比較テスト                        ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# テスト用の簡単な要件ファイルを作成
TEST_DIR="/tmp/level_test_$$"
mkdir -p "$TEST_DIR"

cat > "$TEST_DIR/requirements.md" << EOF
# シンプルなユーザー管理API
- ユーザー登録機能
- ユーザーログイン機能
EOF

cat > "$TEST_DIR/design.md" << EOF
# 技術設計
- Node.js + Express
- TypeScript
- JWT認証
EOF

echo "テストケース: シンプルなユーザー管理API"
echo ""

# 各レベルでテスト実行
for level in 1 2 3; do
    case $level in
        1) level_name="ラフレベル" ;;
        2) level_name="標準レベル" ;;
        3) level_name="商用レベル" ;;
    esac
    
    echo -e "${YELLOW}=== $level_name のテスト ===${NC}"
    echo "開始時刻: $(date +%H:%M:%S)"
    
    # 実装ディレクトリを作成
    impl_dir="$TEST_DIR/implementation_level_$level"
    mkdir -p "$impl_dir"
    
    # 自動実行のため入力を自動化
    echo -e "$level\ny\nn" | timeout 300 bash "$SCRIPT_DIR/hybrid-implementation.sh" \
        "$TEST_DIR/requirements.md" \
        "$TEST_DIR/design.md" \
        > "$TEST_DIR/output_level_$level.log" 2>&1 || true
    
    echo "終了時刻: $(date +%H:%M:%S)"
    
    # 結果の要約
    if [ -f "$impl_dir/todo-app/.context/code_metrics.log" ]; then
        echo "生成されたコード行数:"
        tail -1 "$impl_dir/todo-app/.context/code_metrics.log" | cut -d',' -f3
    fi
    
    echo "実行されたステップ:"
    grep -E "ステップ[0-9]+:" "$TEST_DIR/output_level_$level.log" | grep -v "スキップ" | wc -l
    
    echo ""
done

echo -e "${GREEN}テスト完了！${NC}"
echo "ログファイル: $TEST_DIR/"
echo ""
echo "レベル別ステップ数:"
echo "- ラフレベル: 4ステップ (仕様生成、実装、簡易テスト、メトリクス)"
echo "- 標準レベル: 6ステップ (+ 品質検証、リファクタリング)"
echo "- 商用レベル: 9ステップ (+ 包括的テスト、最適化、パターン抽出)"