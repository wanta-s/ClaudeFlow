#!/bin/bash

# 統合スタートスクリプト
# クイックスタートか詳細設定かを選択可能

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ウェルカムメッセージ
clear
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}       AIアプリケーション開発ウィザード        ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${BLUE}アイデアから動くプロトタイプまで、AIが自動で開発します。${NC}"
echo ""
echo -e "${GREEN}どちらのモードで始めますか？${NC}"
echo ""
echo -e "${YELLOW}1) クイックスタート${NC} - アプリ名だけ入力（30秒で開始）"
echo "   └ 最速でプロトタイプを作成したい方向け"
echo ""
echo -e "${YELLOW}2) 詳細設定${NC} - 質問に答えてカスタマイズ（3-5分）"
echo "   └ 要件を細かく指定したい方向け"
echo ""
echo -e "${YELLOW}3) フルオート${NC} - 質問なしで即開始（10秒）"
echo "   └ とにかく今すぐ動くものが欲しい方向け"
echo ""
echo -n "選択してください (1-3): "
read mode_choice

case $mode_choice in
    1)
        echo ""
        echo -e "${BLUE}クイックスタートモードを起動します...${NC}"
        sleep 1
        "$(dirname "$0")/quick-start.sh"
        ;;
    2)
        echo ""
        echo -e "${BLUE}詳細設定モードを起動します...${NC}"
        sleep 1
        "$(dirname "$0")/interactive-planning.sh"
        ;;
    3)
        echo ""
        echo -e "${BLUE}フルオートモードで開発を開始します...${NC}"
        
        # 出力ディレクトリ
        OUTPUT_DIR="$(dirname "$0")/../results"
        mkdir -p "$OUTPUT_DIR"
        OUTPUT_FILE="$OUTPUT_DIR/00_user_input.md"
        
        # デフォルト値でファイルを生成
        cat > "$OUTPUT_FILE" << EOF
# プロジェクト企画書（ユーザー入力）

## 基本情報
- **アプリケーション名**: AIアプリケーション
- **概要**: 業務効率化を目的とした汎用的なWebアプリケーション

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
*このファイルはフルオートモードで自動生成されました。*
EOF
        
        # タスクファイルを生成してからパイプラインを実行
        echo ""
        echo -e "${GREEN}プロジェクトに最適化されたタスクを生成中...${NC}"
        "$(dirname "$0")/generate-tasks.sh" "$OUTPUT_FILE"
        
        echo ""
        echo -e "${GREEN}開発を開始します！${NC}"
        sleep 2
        "$(dirname "$0")/run-pipeline.sh" "$OUTPUT_FILE"
        ;;
    *)
        echo ""
        echo -e "${YELLOW}無効な選択です。もう一度実行してください。${NC}"
        exit 1
        ;;
esac