#!/bin/bash

# プロジェクト管理ユーティリティスクリプト
# 複数プロジェクトの切り替え・管理機能

set -e

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${CYAN}ClaudeFlow プロジェクト管理ツール${NC}"
    echo ""
    echo "使用方法: $0 [コマンド] [オプション]"
    echo ""
    echo "コマンド:"
    echo "  list                  - プロジェクト一覧を表示"
    echo "  current               - 現在のプロジェクトを表示"
    echo "  clean [project_name]  - プロジェクト状態をクリア"
    echo "  backup [project_name] - プロジェクトをバックアップ"
    echo "  restore [backup_dir]  - バックアップから復元"
    echo "  status                - プロジェクトの状態を表示"
    echo ""
    echo "例:"
    echo "  $0 clean               # 現在のプロジェクトをクリア"
    echo "  $0 clean othello       # 指定したプロジェクトをクリア"
    echo "  $0 backup my_app       # プロジェクトをバックアップ"
    echo "  $0 list                # プロジェクト一覧表示"
}

list_projects() {
    echo -e "${BLUE}📁 プロジェクト一覧${NC}"
    echo ""
    
    # 現在のプロジェクト
    if [ -f "$PROJECT_ROOT/.current_project" ]; then
        echo -e "${GREEN}現在のプロジェクト:${NC}"
        cat "$PROJECT_ROOT/.current_project"
        echo ""
    fi
    
    # 実装ディレクトリの確認
    echo -e "${BLUE}実装ディレクトリ:${NC}"
    if [ -d "$PROJECT_ROOT/implementation" ]; then
        ls -la "$PROJECT_ROOT/implementation/" | grep "^d" | awk '{print "  " $9}' | grep -v "^\.$\|^\.\.$ "
    else
        echo "  なし"
    fi
    echo ""
    
    # バックアップの確認
    echo -e "${BLUE}バックアップ:${NC}"
    ls -d "$PROJECT_ROOT"/backup_* 2>/dev/null | while read backup_dir; do
        backup_name=$(basename "$backup_dir")
        echo "  $backup_name"
    done || echo "  なし"
}

show_current() {
    echo -e "${BLUE}📋 現在のプロジェクト状態${NC}"
    echo ""
    
    if [ -f "$PROJECT_ROOT/.current_project" ]; then
        cat "$PROJECT_ROOT/.current_project"
    else
        echo "現在アクティブなプロジェクトはありません"
    fi
    echo ""
    
    # features.jsonの確認
    if [ -f "$PROJECT_ROOT/ClaudeFlow/implementation/features.json" ]; then
        echo -e "${YELLOW}⚠️  古いfeatures.jsonが残存しています${NC}"
        echo "場所: $PROJECT_ROOT/ClaudeFlow/implementation/features.json"
    fi
}

show_status() {
    echo -e "${BLUE}🔍 プロジェクト状態詳細${NC}"
    echo ""
    
    show_current
    
    echo -e "${BLUE}重要ファイルの確認:${NC}"
    
    # features.json
    for features_file in "$PROJECT_ROOT/implementation/features.json" \
                        "$PROJECT_ROOT/ClaudeFlow/implementation/features.json" \
                        "$PROJECT_ROOT/ClaudeFlow/scripts/implementation/features.json"; do
        if [ -f "$features_file" ]; then
            echo -e "  ${YELLOW}⚠️  $features_file${NC}"
        fi
    done
    
    # 結果ファイル
    if [ -d "$PROJECT_ROOT/results" ]; then
        echo -e "  ${GREEN}✓ results/ディレクトリ存在${NC}"
        ls "$PROJECT_ROOT/results"/*.md 2>/dev/null | head -3 | while read file; do
            echo "    - $(basename "$file")"
        done
    fi
    
    # 実装ファイル
    feature_count=$(find "$PROJECT_ROOT/implementation" -name "feature_*" 2>/dev/null | wc -l)
    if [ "$feature_count" -gt 0 ]; then
        echo -e "  ${GREEN}✓ 実装ファイル: ${feature_count}個${NC}"
    fi
}

# メインロジック
case "${1:-help}" in
    "list"|"ls")
        list_projects
        ;;
    "current"|"cur")
        show_current
        ;;
    "clean"|"clear")
        project_name="${2:-current_project}"
        echo -e "${YELLOW}プロジェクト「$project_name」をクリアします${NC}"
        clear_project_state "$project_name"
        ;;
    "status"|"stat")
        show_status
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}不明なコマンド: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac