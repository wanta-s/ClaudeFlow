#!/bin/bash

# 共通関数ライブラリ
# 各スクリプトから source されて使用される

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# プロジェクトルート
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROMPTS_DIR="$PROJECT_ROOT/prompts"

# プロンプトローダー関数
load_prompt() {
    local prompt_name=$1
    local prompt_file="$PROMPTS_DIR/${prompt_name}.md"
    
    if [ ! -f "$prompt_file" ]; then
        echo -e "${RED}プロンプトファイルが見つかりません: $prompt_file${NC}" >&2
        return 1
    fi
    
    cat "$prompt_file"
}

# プロンプトに変数を埋め込む関数
apply_prompt_vars() {
    local prompt_content="$1"
    shift
    
    # 引数を2つずつ処理（変数名と値のペア）
    while [ $# -gt 0 ]; do
        local var_name="$1"
        local var_value="$2"
        shift 2
        
        # 変数を置換（sedのエスケープ処理を含む）
        prompt_content=$(echo "$prompt_content" | sed "s/\${$var_name}/$(echo "$var_value" | sed 's/[[\.*^$()+?{|]/\\&/g')/g")
    done
    
    echo "$prompt_content"
}

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# プログレスバー表示
show_progress() {
    local current=$1
    local total=$2
    local width=${3:-50}
    
    local progress=$((current * 100 / total))
    local filled=$((progress * width / 100))
    
    printf "\r["
    printf "%${filled}s" | tr ' ' '='
    printf "%$((width - filled))s" | tr ' ' '-'
    printf "] %3d%%" $progress
    
    [ $current -eq $total ] && echo
}