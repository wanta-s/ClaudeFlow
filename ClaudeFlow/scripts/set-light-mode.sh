#!/bin/bash

# 軽量モード設定スクリプト
# 環境変数を設定して軽量モードを有効化

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${CYAN}ClaudeFlow 軽量モード設定${NC}"
    echo ""
    echo "使用方法: $0 [モード]"
    echo ""
    echo "モード:"
    echo "  ultra_light  - 超軽量モード（3フェーズ、5分で完成）"
    echo "  light        - 軽量モード（5フェーズ、10分で完成）"
    echo "  standard     - 標準モード（9フェーズ、通常開発）"
    echo "  reset        - 設定をリセット"
    echo ""
    echo "例:"
    echo "  $0 ultra_light  # 超軽量モードに設定"
    echo "  $0 light        # 軽量モードに設定"
    echo "  $0 reset        # 設定をリセット"
}

set_ultra_light() {
    echo -e "${YELLOW}🚀 超軽量モードを設定します${NC}"
    
    export CLAUDEFLOW_MODE="ultra_light"
    export CLAUDEFLOW_IMPL_LEVEL=1
    export CLAUDEFLOW_FEATURE_SELECTION=C
    export AUTO_CONTINUE=true
    export CLAUDEFLOW_QUIET_MODE=true
    export CLAUDEFLOW_TIMEOUT_SPEC=300
    export CLAUDEFLOW_TIMEOUT_IMPL=300
    
    # bashrcに追加（永続化）
    cat >> ~/.bashrc << 'EOF'

# ClaudeFlow 超軽量モード設定
export CLAUDEFLOW_MODE="ultra_light"
export CLAUDEFLOW_IMPL_LEVEL=1
export CLAUDEFLOW_FEATURE_SELECTION=C
export AUTO_CONTINUE=true
export CLAUDEFLOW_QUIET_MODE=true
export CLAUDEFLOW_TIMEOUT_SPEC=300
export CLAUDEFLOW_TIMEOUT_IMPL=300
EOF
    
    echo -e "${GREEN}✅ 超軽量モードを設定しました${NC}"
    echo -e "${BLUE}設定内容:${NC}"
    echo "  - 3フェーズで実行"
    echo "  - ラフレベル実装"
    echo "  - コア機能のみ"
    echo "  - 自動継続"
    echo "  - タイムアウト短縮"
}

set_light() {
    echo -e "${BLUE}⚡ 軽量モードを設定します${NC}"
    
    export CLAUDEFLOW_MODE="light"
    export CLAUDEFLOW_IMPL_LEVEL=2
    export CLAUDEFLOW_FEATURE_SELECTION=C
    export AUTO_CONTINUE=true
    export CLAUDEFLOW_QUIET_MODE=true
    
    # bashrcに追加（永続化）
    cat >> ~/.bashrc << 'EOF'

# ClaudeFlow 軽量モード設定
export CLAUDEFLOW_MODE="light"
export CLAUDEFLOW_IMPL_LEVEL=2
export CLAUDEFLOW_FEATURE_SELECTION=C
export AUTO_CONTINUE=true
export CLAUDEFLOW_QUIET_MODE=true
EOF
    
    echo -e "${GREEN}✅ 軽量モードを設定しました${NC}"
    echo -e "${BLUE}設定内容:${NC}"
    echo "  - 5フェーズで実行"
    echo "  - 標準レベル実装"
    echo "  - コア機能のみ"
    echo "  - 自動継続"
}

set_standard() {
    echo -e "${GREEN}📋 標準モードを設定します${NC}"
    
    # 設定をリセット
    unset CLAUDEFLOW_MODE
    unset CLAUDEFLOW_IMPL_LEVEL
    unset CLAUDEFLOW_FEATURE_SELECTION
    unset AUTO_CONTINUE
    unset CLAUDEFLOW_QUIET_MODE
    unset CLAUDEFLOW_TIMEOUT_SPEC
    unset CLAUDEFLOW_TIMEOUT_IMPL
    
    echo -e "${GREEN}✅ 標準モードを設定しました${NC}"
    echo -e "${BLUE}設定内容:${NC}"
    echo "  - 9フェーズで実行"
    echo "  - 全機能を対象"
    echo "  - 詳細な品質管理"
}

reset_settings() {
    echo -e "${YELLOW}🔄 設定をリセットします${NC}"
    
    # 環境変数をクリア
    unset CLAUDEFLOW_MODE
    unset CLAUDEFLOW_IMPL_LEVEL
    unset CLAUDEFLOW_FEATURE_SELECTION
    unset AUTO_CONTINUE
    unset CLAUDEFLOW_QUIET_MODE
    unset CLAUDEFLOW_TIMEOUT_SPEC
    unset CLAUDEFLOW_TIMEOUT_IMPL
    
    # bashrcから設定を削除
    if [ -f ~/.bashrc ]; then
        # ClaudeFlow設定行を削除
        sed -i '/# ClaudeFlow.*モード設定/,+10d' ~/.bashrc
    fi
    
    echo -e "${GREEN}✅ 設定をリセットしました${NC}"
}

show_current() {
    echo -e "${BLUE}📋 現在の設定${NC}"
    echo ""
    echo "CLAUDEFLOW_MODE: ${CLAUDEFLOW_MODE:-standard}"
    echo "CLAUDEFLOW_IMPL_LEVEL: ${CLAUDEFLOW_IMPL_LEVEL:-2}"
    echo "CLAUDEFLOW_FEATURE_SELECTION: ${CLAUDEFLOW_FEATURE_SELECTION:-A}"
    echo "AUTO_CONTINUE: ${AUTO_CONTINUE:-false}"
    echo "CLAUDEFLOW_QUIET_MODE: ${CLAUDEFLOW_QUIET_MODE:-false}"
}

# メイン処理
case "${1:-help}" in
    "ultra_light"|"ultra")
        set_ultra_light
        ;;
    "light")
        set_light
        ;;
    "standard")
        set_standard
        ;;
    "reset"|"clear")
        reset_settings
        ;;
    "status"|"show"|"current")
        show_current
        ;;
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        echo -e "${RED}不明なモード: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac