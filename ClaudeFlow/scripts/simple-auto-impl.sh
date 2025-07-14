#!/bin/bash

# 簡易版自動実装スクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# ディレクトリ設定
PROJECT_ROOT="$(dirname "$0")/.."
RESULTS_DIR="$PROJECT_ROOT/results"
IMPLEMENTATION_DIR="$RESULTS_DIR/implementation"

# ディレクトリ作成
mkdir -p "$IMPLEMENTATION_DIR"

echo -e "${BLUE}===================================${NC}"
echo -e "${BLUE}  ToDoアプリ自動実装 (簡易版)  ${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# 要件と設計を読み込む
REQUIREMENTS=$(cat "$RESULTS_DIR/03_requirements_result.md" 2>/dev/null || echo "要件なし")
DESIGN=$(cat "$RESULTS_DIR/05_design_result.md" 2>/dev/null || echo "設計なし")

# 実装する機能リスト
features=(
    "user_auth:ユーザー認証機能"
    "task_crud:タスクCRUD機能"
    "task_list:タスク一覧表示"
    "task_complete:タスク完了機能"
)

# 開始時刻を記録
start_time=$(date +%s)
total_features=${#features[@]}
current_feature=0

# トークン追跡を初期化
init_token_tracking

# 各機能を実装
for feature in "${features[@]}"; do
    IFS=':' read -r feature_id feature_name <<< "$feature"
    current_feature=$((current_feature + 1))
    
    echo -e "\n${BLUE}実装中: ${feature_name}${NC}"
    
    # プログレスバーと経過時間を表示
    show_progress $current_feature $total_features "$feature_name"
    echo -n " 経過時間: "
    show_elapsed_time $start_time
    echo ""
    
    # 実装プロンプト
    prompt="以下の要件と設計に基づいて、${feature_name}を実装してください：

# 要件定義
$REQUIREMENTS

# 詳細設計
$DESIGN

# 実装する機能
${feature_name} (ID: ${feature_id})

Next.js 14 (App Router) + TypeScript + Prisma + Tailwind CSSを使用して実装してください。
実装には以下を含めてください：
- 必要なコンポーネント
- API Routes
- Prismaスキーマ（必要な場合）
- 型定義

マークダウンのコードブロックで実装を提供してください。"

    # 実装実行（トークン追跡付き）
    echo -n "  生成中 "
    
    # バックグラウンドで実行
    (
        run_claude_with_tracking "$prompt" "$IMPLEMENTATION_DIR/${feature_id}_implementation.md" "$feature_name"
    ) > /tmp/claude_output_${feature_id}.log 2>&1 &
    
    # スピナーを表示しながら待機
    show_spinner $!
    wait $!
    
    # トークン情報を表示
    cat /tmp/claude_output_${feature_id}.log 2>/dev/null || true
    rm -f /tmp/claude_output_${feature_id}.log
    
    if [ -s "$IMPLEMENTATION_DIR/${feature_id}_implementation.md" ]; then
        echo -e "\n${GREEN}✓ 完了: ${feature_name}${NC}"
        # 実装結果のサイズを表示
        size=$(wc -l < "$IMPLEMENTATION_DIR/${feature_id}_implementation.md")
        echo "  → ${size}行のコードを生成しました"
    else
        echo -e "\n${RED}✗ 失敗: ${feature_name}${NC}"
    fi
done

# 最終的な進捗を表示
echo ""
show_progress $total_features $total_features "完了"
echo ""

# 合計時間を表示
echo -e "\n${GREEN}実装が完了しました！${NC}"
echo -n "合計時間: "
show_elapsed_time $start_time
echo ""

# 最終的なトークン使用量を表示
echo ""
echo -e "${CYAN}=== 最終トークン使用量 ===${NC}"
show_token_usage 0 "合計"
echo -e "${CYAN}========================${NC}"
echo -e "${YELLOW}実装結果は以下に保存されています：${NC}"
echo "$IMPLEMENTATION_DIR"
echo ""
ls -la "$IMPLEMENTATION_DIR/"