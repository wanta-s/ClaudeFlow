#!/bin/bash

# 簡易版パイプライン実行スクリプト
# Claude CLIの対話モードを回避

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# プロジェクトルート
PROJECT_ROOT="$(dirname "$0")/.."
TASKS_DIR="$PROJECT_ROOT/tasks"
RESULTS_DIR="$PROJECT_ROOT/results"

# フェーズ定義（実装フェーズまで）
phases=(
    "02_research:技術調査フェーズ"
    "03_requirements:要件定義フェーズ"
    "04_prototype:プロトタイプフェーズ"
    "05_design:詳細設計フェーズ"
)

# 前のフェーズの結果
previous_result="$RESULTS_DIR/01_planning_result.md"

echo -e "${BLUE}簡易版パイプラインを開始します${NC}"
echo ""

# 各フェーズを実行
for phase in "${phases[@]}"; do
    IFS=':' read -r phase_file phase_name <<< "$phase"
    
    echo -e "${BLUE}開始: $phase_name${NC}"
    
    task_file="$TASKS_DIR/${phase_file}.md"
    result_file="$RESULTS_DIR/${phase_file}_result.md"
    
    # プロンプトを作成
    prompt="以下のタスクと前のフェーズの結果を基に、${phase_name}の成果物を生成してください：

# タスク内容
$(cat "$task_file")

# 前のフェーズの結果
$(cat "$previous_result")

# ユーザー入力
$(cat "$RESULTS_DIR/00_user_input.md")

上記の内容を踏まえて、タスクで指定された出力フォーマットに従って成果物を生成してください。"

    # Claudeに実行
    echo "$prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$result_file"
    
    if [ -s "$result_file" ]; then
        echo -e "${GREEN}✓ 完了: $phase_name${NC}"
        previous_result="$result_file"
    else
        echo -e "${RED}✗ エラー: $phase_name${NC}"
        exit 1
    fi
    
    sleep 2
done

echo ""
echo -e "${GREEN}設計フェーズまで完了しました！${NC}"
echo -e "${YELLOW}次は実装フェーズです。以下のコマンドを実行してください：${NC}"
echo ""
echo "# インクリメンタル実装（推奨）"
echo "./scripts/incremental-implementation.sh $RESULTS_DIR/03_requirements_result.md $RESULTS_DIR/05_design_result.md"
echo ""
echo "# または自動インクリメンタル実装"
echo "./scripts/auto-incremental-implementation.sh"