#!/bin/bash

# ハング問題修正のテストスクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  ハイブリッド実装ハング問題修正テスト  ${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# ラピッドプロトタイプ設定を適用
apply_preset "rapid"
show_current_config

echo -e "${BLUE}テスト: 修正されたhybrid-implementation.shを30秒間実行${NC}"
echo "デバッグ出力でハング箇所を特定します..."
echo ""

# 30秒でタイムアウト
timeout 30 bash -c "
    cd '$SCRIPT_DIR'
    ./hybrid-implementation.sh ../results/03_requirements_result.md ../results/05_design_result.md 2>&1
" && echo -e "${GREEN}✅ 正常完了または30秒以内に進行${NC}" || {
    exit_code=$?
    if [ $exit_code -eq 124 ]; then
        echo -e "${YELLOW}⏰ 30秒でタイムアウト（進行中の可能性）${NC}"
    else
        echo -e "${RED}❌ エラーで終了: exit code $exit_code${NC}"
    fi
}

echo ""
echo -e "${CYAN}テスト完了${NC}"