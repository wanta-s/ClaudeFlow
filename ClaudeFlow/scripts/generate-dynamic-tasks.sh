#!/bin/bash

# ユーザー入力をAIが分析して動的にタスクファイルを生成するスクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 入力ファイル
INPUT_FILE="${1:-results/00_user_input.md}"
TASKS_DIR="$(dirname "$0")/../tasks"
TEMP_DIR="$(dirname "$0")/../.temp"

# 一時ディレクトリ作成
mkdir -p "$TEMP_DIR"

# 入力ファイルの存在確認
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${YELLOW}エラー: 入力ファイルが見つかりません: $INPUT_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}AIがプロジェクトを分析してカスタムタスクを生成します...${NC}"
echo ""

# タスク生成用のプロンプトを作成
create_task_generator_prompt() {
    local phase_number=$1
    local phase_name=$2
    
    cat > "$TEMP_DIR/generate_${phase_number}.md" << EOF
# タスク生成指示: ${phase_name}

ユーザー入力ファイルを分析し、このプロジェクトに最適化された${phase_name}のタスクファイルを生成してください。

## 要求事項
1. ユーザーが作りたいアプリケーションの種類と特性を理解する
2. プロジェクトの規模と複雑さを判断する
3. 具体的で実行可能なタスクを定義する
4. 他のフェーズとの連携を考慮する

## 生成するタスクファイルの形式
- マークダウン形式
- 目的、タスク、入力、出力を明確に定義
- 実行例を含める

## フェーズ番号: ${phase_number}
## フェーズ名: ${phase_name}

以下のユーザー入力に基づいて、タスクファイルを生成してください：
EOF

    # ユーザー入力を追加
    echo "" >> "$TEMP_DIR/generate_${phase_number}.md"
    echo "---" >> "$TEMP_DIR/generate_${phase_number}.md"
    cat "$INPUT_FILE" >> "$TEMP_DIR/generate_${phase_number}.md"
}

# 各フェーズのタスクをAIに生成させる
generate_phase_task() {
    local phase_number=$1
    local phase_name=$2
    local output_file="$TASKS_DIR/${phase_number}.md"
    
    echo -e "${GREEN}[${phase_number}] ${phase_name}のタスクを生成中...${NC}"
    
    # プロンプト作成
    create_task_generator_prompt "$phase_number" "$phase_name"
    
    # Claudeで生成
    cat "$TEMP_DIR/generate_${phase_number}.md" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$output_file"
    
    if [ -s "$output_file" ]; then
        echo -e "  ✅ 生成完了: $output_file"
    else
        echo -e "  ❌ 生成失敗: $output_file"
        return 1
    fi
}

# フェーズ定義
phases=(
    "01_planning:企画フェーズ - プロジェクトの方向性と技術選定"
    "02_research:技術調査フェーズ - 選定技術の詳細調査"
    "03_requirements:要件定義フェーズ - 機能の詳細仕様"
    "04_prototype:プロトタイプフェーズ - MVP実装"
    "05_design:詳細設計フェーズ - アーキテクチャ設計"
    "06_implementation:実装フェーズ - 本格的な開発"
    "07_testing:テストフェーズ - 品質保証"
    "08_code_review:コードレビューフェーズ - 品質検証"
    "09_documentation:ドキュメント生成フェーズ - 文書作成"
)

# 各フェーズのタスクを生成
for phase in "${phases[@]}"; do
    IFS=':' read -r phase_file phase_desc <<< "$phase"
    generate_phase_task "$phase_file" "$phase_desc"
    
    # API制限を考慮して少し待機
    sleep 2
done

# 一時ファイルをクリーンアップ
rm -rf "$TEMP_DIR"

echo ""
echo -e "${BLUE}✅ すべてのタスクファイルをAIが動的に生成しました！${NC}"
echo ""
echo "生成されたタスク:"
ls -la "$TASKS_DIR"/*.md | awk '{print "  - " $9}'
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "  ./scripts/run-pipeline.sh $INPUT_FILE"