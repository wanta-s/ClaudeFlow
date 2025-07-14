#!/bin/bash

# UTF-8エンコーディングを強制
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

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
        
        # 変数値のエスケープ処理
        # バックスラッシュ、アンパサンド、スラッシュ、改行をエスケープ
        local escaped_value=$(echo "$var_value" | sed 's/\\/\\\\/g; s/&/\\&/g; s/\//\\\//g')
        
        # 変数を置換
        prompt_content=$(echo "$prompt_content" | sed "s/\${$var_name}/$escaped_value/g")
    done
    
    echo "$prompt_content"
}

# トークン使用量計測関数
estimate_tokens() {
    local text="$1"
    # 簡易的なトークン推定（1トークン ≈ 4文字）
    # 日本語は1文字で1トークン程度と仮定
    local char_count=$(echo -n "$text" | wc -m)
    local token_estimate=$((char_count / 3))
    echo $token_estimate
}

# トークン使用量を記録
TOKEN_LOG_FILE="${CONTEXT_DIR:-/tmp}/.token_usage.log"
TOTAL_TOKENS=0

# トークン使用量を初期化
init_token_tracking() {
    echo "0" > "$TOKEN_LOG_FILE"
    TOTAL_TOKENS=0
}

# トークン使用量を追加
add_token_usage() {
    local input_text="$1"
    local output_text="$2"
    
    local input_tokens=$(estimate_tokens "$input_text")
    local output_tokens=$(estimate_tokens "$output_text")
    local total=$((input_tokens + output_tokens))
    
    # ファイルから現在の合計を読み込む
    if [ -f "$TOKEN_LOG_FILE" ]; then
        TOTAL_TOKENS=$(cat "$TOKEN_LOG_FILE")
    fi
    
    TOTAL_TOKENS=$((TOTAL_TOKENS + total))
    echo $TOTAL_TOKENS > "$TOKEN_LOG_FILE"
    
    # 返り値として今回の使用量を返す
    echo $total
}

# トークン使用量を表示
show_token_usage() {
    local phase_tokens=$1
    local phase_name="$2"
    
    if [ -f "$TOKEN_LOG_FILE" ]; then
        TOTAL_TOKENS=$(cat "$TOKEN_LOG_FILE")
    fi
    
    echo -e "${MAGENTA}トークン使用量:${NC}"
    echo -e "  今回の$phase_name: $(printf "%'d" $phase_tokens) トークン"
    echo -e "  累計: $(printf "%'d" $TOTAL_TOKENS) トークン"
    
    # コスト推定（Claude-3.5-Sonnetの価格を仮定）
    # Input: $3 per 1M tokens, Output: $15 per 1M tokens
    # 平均して$9/1Mトークンと仮定
    local cost_estimate=$(awk "BEGIN {printf \"%.4f\", $TOTAL_TOKENS * 0.000009}")
    echo -e "  推定コスト: \$$cost_estimate USD"
}

# Claude実行ラッパー関数
run_claude_with_tracking() {
    local input="$1"
    local output_file="$2"
    local phase_name="${3:-処理}"
    
    # 実行（権限確認をスキップ、UTF-8で保存）
    # WSL環境での文字化けを防ぐための処理
    temp_output=$(mktemp)
    echo "$input" | LANG=C.UTF-8 LC_ALL=C.UTF-8 claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$temp_output"
    
    # バイナリデータと制御文字を除去してUTF-8に変換
    cat "$temp_output" | \
    iconv -f UTF-8 -t UTF-8//IGNORE 2>/dev/null | \
    sed 's/\x00//g' | \
    tr -d '\000-\008\011\013\014\016-\037' > "$output_file"
    
    # 出力ファイルが空の場合は元のファイルを使用
    if [ ! -s "$output_file" ] && [ -s "$temp_output" ]; then
        cp "$temp_output" "$output_file"
    fi
    
    # 一時ファイルを削除
    rm -f "$temp_output"
    
    # 出力を読み込んでトークンを計測（null byteを除去）
    local output=$(cat "$output_file" 2>/dev/null | tr -d '\0' || echo "")
    local tokens_used=$(add_token_usage "$input" "$output")
    
    # トークン使用量を表示
    show_token_usage $tokens_used "$phase_name"
}

# プログレスバー表示関数
show_progress() {
    local current=$1
    local total=$2
    local task_name=$3
    local width=50
    
    # 進捗率を計算
    local progress=$((current * 100 / total))
    local filled=$((progress * width / 100))
    
    # プログレスバーを構築
    printf "\r[";
    printf "%0.s█" $(seq 1 $filled)
    printf "%0.s░" $(seq 1 $((width - filled)))
    printf "] %3d%% (%d/%d) %s" $progress $current $total "$task_name"
}

# アニメーション付き待機表示
show_spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local temp
    
    while ps -p $pid > /dev/null 2>&1; do
        temp=${spinstr#?}
        printf " [%c] " "${spinstr:0:1}"
        spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# 経過時間表示関数
show_elapsed_time() {
    local start_time=$1
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    
    local hours=$((elapsed / 3600))
    local minutes=$(((elapsed % 3600) / 60))
    local seconds=$((elapsed % 60))
    
    if [ $hours -gt 0 ]; then
        printf "%02d:%02d:%02d" $hours $minutes $seconds
    else
        printf "%02d:%02d" $minutes $seconds
    fi
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