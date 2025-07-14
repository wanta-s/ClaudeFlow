#!/bin/bash

# 簡易版自動実装スクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# 各機能を実装
for feature in "${features[@]}"; do
    IFS=':' read -r feature_id feature_name <<< "$feature"
    
    echo -e "${BLUE}実装中: ${feature_name}${NC}"
    
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

    # 実装実行
    echo "$prompt" | claude --print > "$IMPLEMENTATION_DIR/${feature_id}_implementation.md"
    
    if [ -s "$IMPLEMENTATION_DIR/${feature_id}_implementation.md" ]; then
        echo -e "${GREEN}✓ 完了: ${feature_name}${NC}"
    else
        echo -e "${RED}✗ 失敗: ${feature_name}${NC}"
    fi
    
    sleep 2
done

echo ""
echo -e "${GREEN}実装が完了しました！${NC}"
echo -e "${YELLOW}実装結果は以下に保存されています：${NC}"
echo "$IMPLEMENTATION_DIR"
echo ""
ls -la "$IMPLEMENTATION_DIR/"