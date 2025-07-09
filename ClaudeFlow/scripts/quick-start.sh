#!/bin/bash

# 最速でプロトタイプを作成するためのスクリプト
# アプリ名だけ入力して、あとはデフォルト値で実行

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 出力ディレクトリ
OUTPUT_DIR="$(dirname "$0")/../results"
mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/00_user_input.md"

# ウェルカムメッセージ
clear
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    AIアプリケーション開発 - クイックスタート    ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "最小限の入力で、AIが最適なアプリケーションを生成します。"
echo ""

# アプリ名または概要の入力
echo -e "${GREEN}作りたいアプリケーションを一言で教えてください。${NC}"
echo -e "${YELLOW}例: タスク管理、在庫管理、予約システム、日報アプリ など${NC}"
echo -e "${YELLOW}(Enterキーのみで「AIアプリケーション」になります)${NC}"
echo -n "> "
read app_input

# 入力内容の判定と設定
if [ -z "$app_input" ]; then
    app_name="AIアプリケーション"
    app_description="業務効率化を目的とした汎用的なWebアプリケーション"
    echo -e "${BLUE}→ デフォルトのAIアプリケーションを作成します${NC}"
else
    # 入力が短い場合はアプリ名として扱い、長い場合は説明として扱う
    if [ ${#app_input} -le 20 ]; then
        app_name="${app_input}アプリ"
        app_description="${app_input}を効率的に行うためのWebアプリケーション"
    else
        app_name="AIアプリケーション"
        app_description="$app_input"
    fi
    echo -e "${BLUE}→ 「${app_name}」を作成します${NC}"
fi

echo ""

# デフォルト値でファイルを生成
cat > "$OUTPUT_FILE" << EOF
# プロジェクト企画書（ユーザー入力）

## 基本情報
- **アプリケーション名**: $app_name
- **概要**: $app_description

## ターゲット
- **想定ユーザー**: 一般的なビジネスユーザー
- **想定利用者数**: 100人程度

## 機能要件
### 必須機能
ユーザー管理、データの作成・編集・削除、検索機能

### 追加機能
ログイン認証, 検索・フィルター機能, モバイル対応

## 使用環境
- **デバイス**: すべてのデバイス
- **使用頻度**: 毎日

## デザイン要件
- **優先度**: シンプルで使いやすければ良い
- **参考**: なし

## 非機能要件
- **データ機密性**: 社内情報（中程度）
- **パフォーマンス**: 通常の速度で問題ない

---
*このファイルはクイックスタートモードで自動生成されました。*
EOF

echo -e "${GREEN}✅ 設定が完了しました！${NC}"
echo ""
echo "生成されるアプリケーション："
echo "- アプリ名: ${app_name}"
echo "- ユーザー管理機能付き"
echo "- データのCRUD操作"
echo "- レスポンシブデザイン（PC/スマホ対応）"
echo "- セキュアな認証機能"
echo ""
echo -e "${YELLOW}開発を開始しますか？ (y/n)${NC}"
read -n 1 confirm
echo ""

if [[ $confirm =~ ^[Yy]$ ]]; then
    # タスクファイルを生成してからパイプラインを実行
    echo -e "${BLUE}プロジェクトに最適化されたタスクを生成中...${NC}"
    "$(dirname "$0")/generate-tasks.sh" "$OUTPUT_FILE"
    
    echo ""
    echo -e "${BLUE}開発を開始しています...${NC}"
    "$(dirname "$0")/run-pipeline.sh" "$OUTPUT_FILE"
else
    echo "開発を中止しました。"
    echo "後で開発を開始する場合は、以下のコマンドを実行してください："
    echo "  ./scripts/run-pipeline.sh $OUTPUT_FILE"
fi