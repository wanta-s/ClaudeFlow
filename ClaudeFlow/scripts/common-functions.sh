#!/bin/bash

# UTF-8エンコーディングを強制
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# 共通関数ライブラリ
# 各スクリプトから source されて使用される

# セキュリティ設定とパスワード管理
SECURITY_LOG_FILE="${PROJECT_ROOT}/security/generated_credentials.md"
AUTO_APPROVE_ENABLED=true

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

# ClaudeFlow設定のデフォルト値
CLAUDEFLOW_REQ_LEVEL="${CLAUDEFLOW_REQ_LEVEL:-B}"
CLAUDEFLOW_IMPL_MODE="${CLAUDEFLOW_IMPL_MODE:-4}"
CLAUDEFLOW_IMPL_LEVEL="${CLAUDEFLOW_IMPL_LEVEL:-2}"
CLAUDEFLOW_FEATURE_SELECTION="${CLAUDEFLOW_FEATURE_SELECTION:-A}"
CLAUDEFLOW_DEBUG_MODE="${CLAUDEFLOW_DEBUG_MODE:-false}"
CLAUDEFLOW_MODE="${CLAUDEFLOW_MODE:-standard}"  # standard, light, ultra_light

# 行数制限設定
CLAUDEFLOW_MAX_LINES="${CLAUDEFLOW_MAX_LINES:-2000}"
CLAUDEFLOW_LINE_CHECK="${CLAUDEFLOW_LINE_CHECK:-true}"
CLAUDEFLOW_WARNING_THRESHOLD="${CLAUDEFLOW_WARNING_THRESHOLD:-80}"  # 80%で警告

# ログファイル設定
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE=""
PROGRESS_CSV=""

# 結果ディレクトリ設定
RESULTS_DIR="$PROJECT_ROOT/results"

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

log_debug() {
    if [ "$CLAUDEFLOW_DEBUG_MODE" = "true" ]; then
        echo -e "${MAGENTA}[DEBUG]${NC} $1" >&2
    fi
}

# 条件付きデバッグ表示
debug_info() {
    if [ "$CLAUDEFLOW_DEBUG_MODE" = "true" ]; then
        echo -e "${BLUE}DEBUG: $1${NC}" >&2
    fi
}

# 変数デバッグ表示
debug_var() {
    local var_name="$1"
    local var_value="$2"
    if [ "$CLAUDEFLOW_DEBUG_MODE" = "true" ]; then
        echo -e "${BLUE}DEBUG: $var_name=$var_value${NC}" >&2
    fi
}

# ログファイル関数
# ログファイルの初期化
init_log_file() {
    local log_name="${1:-execution}"
    mkdir -p "$LOG_DIR"
    LOG_FILE="$LOG_DIR/${log_name}_$(date +%Y%m%d_%H%M%S).log"
    PROGRESS_CSV="$LOG_DIR/implementation_progress.csv"
    
    # ログファイルヘッダー
    cat > "$LOG_FILE" << EOF
=== ClaudeFlow実行ログ ===
開始時刻: $(date)
実行モード: $CLAUDEFLOW_IMPL_MODE
実装レベル: $CLAUDEFLOW_IMPL_LEVEL
機能選択: $CLAUDEFLOW_FEATURE_SELECTION
========================================

EOF
    
    # 進捗CSVヘッダー（存在しない場合のみ）
    if [ ! -f "$PROGRESS_CSV" ]; then
        echo "機能ID,機能名,開始時刻,終了時刻,状態,エラーメッセージ" > "$PROGRESS_CSV"
    fi
    
    # ログファイルパスを表示
    echo -e "${CYAN}ログファイル: $LOG_FILE${NC}"
}

# ステップログ記録
log_step() {
    local step_name="$1"
    local status="$2"  # START, SUCCESS, ERROR, WARNING
    local message="${3:-}"
    
    if [ -n "$LOG_FILE" ]; then
        echo "[$(date +%Y-%m-%d\ %H:%M:%S)] [$status] $step_name $message" >> "$LOG_FILE"
    fi
}

# エラーログ記録
log_error_detail() {
    local context="$1"
    local error_msg="$2"
    
    if [ -n "$LOG_FILE" ]; then
        echo "[$(date +%Y-%m-%d\ %H:%M:%S)] [ERROR] $context" >> "$LOG_FILE"
        echo "  詳細: $error_msg" >> "$LOG_FILE"
        echo "  スタックトレース:" >> "$LOG_FILE"
        # Bashのスタックトレースを記録
        local frame=0
        while caller $frame >> "$LOG_FILE" 2>/dev/null; do
            ((frame++))
        done
        echo "" >> "$LOG_FILE"
    fi
}

# Claude API呼び出しログ
log_claude_call() {
    local prompt_summary="$1"
    local response_file="$2"
    local status="$3"  # SUCCESS or ERROR
    
    if [ -n "$LOG_FILE" ]; then
        echo "[$(date +%Y-%m-%d\ %H:%M:%S)] [CLAUDE_API] $status" >> "$LOG_FILE"
        echo "  プロンプト概要: $prompt_summary" >> "$LOG_FILE"
        echo "  応答ファイル: $response_file" >> "$LOG_FILE"
        if [ "$status" = "ERROR" ] && [ -f "$response_file" ]; then
            echo "  エラー内容: $(head -n 5 "$response_file")" >> "$LOG_FILE"
        fi
        echo "" >> "$LOG_FILE"
    fi
}

# 進捗記録
log_progress() {
    local feature_id="$1"
    local feature_name="$2"
    local start_time="$3"
    local end_time="$4"
    local status="$5"
    local error_msg="${6:-}"
    
    if [ -n "$PROGRESS_CSV" ]; then
        echo "$feature_id,\"$feature_name\",$start_time,$end_time,$status,\"$error_msg\"" >> "$PROGRESS_CSV"
    fi
}

# プログレスバー表示
show_progress() {
    local current=$1
    local total=$2
    local message="${3:-処理中}"
    local width=${4:-40}
    
    local progress=$((current * 100 / total))
    local filled=$((progress * width / 100))
    
    printf "\r%s [" "$message"
    printf "%*s" $filled '' | tr ' ' '█'
    printf "%*s" $((width - filled)) '' | tr ' ' '░'
    printf "] %d%% (%d/%d)" $progress $current $total
    
    [ $current -eq $total ] && echo
}

# ステップ表示（簡潔モード対応）
show_step() {
    local step_num=$1
    local step_name="$2"
    local description="$3"
    
    if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
        printf "%s... " "$step_name"
    else
        echo -e "${YELLOW}ステップ$step_num: $step_name${NC}"
        [ -n "$description" ] && echo -e "  $description"
    fi
}

# ステップ完了表示
show_step_complete() {
    local step_name="$1"
    local result="$2"
    
    if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
        echo "✅"
    else
        echo -e "${GREEN}完了: $step_name${NC}"
        [ -n "$result" ] && echo -e "  $result"
    fi
}

# 機能実装開始表示
show_feature_start() {
    local feature_num=$1
    local total_features=$2
    local feature_name="$3"
    
    if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
        printf "[%d/%d] %s... " "$feature_num" "$total_features" "$feature_name"
    else
        echo -e "${CYAN}================================================${NC}"
        echo -e "${CYAN}[$feature_num/$total_features] $feature_name${NC}"
        echo -e "${CYAN}================================================${NC}"
        echo ""
    fi
}

# 機能実装完了表示
show_feature_complete() {
    local feature_name="$1"
    
    if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
        echo "✅"
    else
        echo -e "${GREEN}機能実装完了: $feature_name${NC}"
        echo ""
    fi
}

# 実装サマリー表示
show_implementation_summary() {
    local total_features=$1
    local completed_features=$2
    local implementation_level="$3"
    local start_time="$4"
    
    local current_time=$(date +%s)
    local elapsed_time=$((current_time - start_time))
    local hours=$((elapsed_time / 3600))
    local minutes=$(((elapsed_time % 3600) / 60))
    local seconds=$((elapsed_time % 60))
    
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}         実装完了サマリー                ${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo -e "${GREEN}✅ 実装完了機能: $completed_features / $total_features${NC}"
    echo -e "${BLUE}🔧 実装レベル: $implementation_level${NC}"
    
    if [ $hours -gt 0 ]; then
        echo -e "${YELLOW}⏱️  実行時間: ${hours}時間${minutes}分${seconds}秒${NC}"
    else
        echo -e "${YELLOW}⏱️  実行時間: ${minutes}分${seconds}秒${NC}"
    fi
    
    echo -e "${CYAN}========================================${NC}"
}

# 簡潔なサマリー表示
show_brief_summary() {
    local total_features=$1
    local completed_features=$2
    local implementation_level="$3"
    
    echo ""
    echo -e "${GREEN}✅ 実装完了: $completed_features/$total_features 機能 (レベル: $implementation_level)${NC}"
}

# セキュリティ・認証関連関数

# ランダムパスワード生成
generate_password() {
    local length=${1:-16}
    local chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    head /dev/urandom | tr -dc "$chars" | head -c $length
}

# JWTシークレット生成
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d '\n'
}

# データベースパスワード生成
generate_db_password() {
    local length=${1:-32}
    local chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    head /dev/urandom | tr -dc "$chars" | head -c $length
}

# セキュリティディレクトリの初期化
init_security_dir() {
    local security_dir="$(dirname "$SECURITY_LOG_FILE")"
    mkdir -p "$security_dir"
    
    # セキュリティファイルの初期化
    if [ ! -f "$SECURITY_LOG_FILE" ]; then
        cat > "$SECURITY_LOG_FILE" << 'EOF'
# 自動生成認証情報

このファイルはClaudeFlowによって自動生成された認証情報を記録します。

**⚠️ セキュリティ警告 ⚠️**
- このファイルには機密情報が含まれています
- 本番環境では必ず安全な場所に保管してください
- バージョン管理システムにコミットしないでください

## 生成日時
EOF
        echo "$(date '+%Y-%m-%d %H:%M:%S')" >> "$SECURITY_LOG_FILE"
        echo "" >> "$SECURITY_LOG_FILE"
    fi
}

# 認証情報をログに記録
log_credential() {
    local service="$1"
    local credential_type="$2"
    local credential_value="$3"
    local description="$4"
    
    init_security_dir
    
    {
        echo "## $service - $credential_type"
        echo "**生成日時:** $(date '+%Y-%m-%d %H:%M:%S')"
        echo "**説明:** $description"
        echo "**値:** \`$credential_value\`"
        echo ""
    } >> "$SECURITY_LOG_FILE"
    
    log_info "認証情報を記録しました: $service - $credential_type"
}

# プロジェクト状態のクリア機能
clear_project_state() {
    local backup_suffix="$(date +%Y%m%d_%H%M%S)"
    local project_name="${1:-unknown}"
    
    echo -e "${YELLOW}🧹 プロジェクト状態をクリアしています...${NC}"
    
    # バックアップディレクトリを作成
    local backup_dir="$PROJECT_ROOT/backup_${backup_suffix}"
    mkdir -p "$backup_dir"
    
    # 既存の重要ファイルをバックアップ
    for file in "$PROJECT_ROOT/implementation/features.json" \
                "$PROJECT_ROOT/ClaudeFlow/implementation/features.json" \
                "$PROJECT_ROOT/results/*.md" \
                "$PROJECT_ROOT/.context/*"; do
        if [ -f "$file" ] || [ -d "$file" ]; then
            cp -r "$file" "$backup_dir/" 2>/dev/null || true
        fi
    done
    
    # 古いプロジェクト設定を削除
    rm -f "$PROJECT_ROOT/implementation/features.json" 2>/dev/null || true
    rm -f "$PROJECT_ROOT/ClaudeFlow/implementation/features.json" 2>/dev/null || true
    rm -f "$PROJECT_ROOT/ClaudeFlow/scripts/implementation/features.json" 2>/dev/null || true
    
    # implementation配下の古いプロジェクトファイルを削除（バックアップ以外）
    find "$PROJECT_ROOT/implementation" -name "feature_*" -not -path "*/backup*" -delete 2>/dev/null || true
    find "$PROJECT_ROOT/implementation" -name "*_final.ts" -not -path "*/backup*" -delete 2>/dev/null || true
    find "$PROJECT_ROOT/implementation" -name "*_impl.ts" -not -path "*/backup*" -delete 2>/dev/null || true
    find "$PROJECT_ROOT/implementation" -name "integrated_implementation.ts" -not -path "*/backup*" -delete 2>/dev/null || true
    
    echo -e "${GREEN}✅ プロジェクト状態をクリアしました${NC}"
    echo -e "${BLUE}   バックアップ: $backup_dir${NC}"
    
    # 新しいプロジェクト用の記録
    echo "# Project: $project_name" > "$PROJECT_ROOT/.current_project"
    echo "# Started: $(date)" >> "$PROJECT_ROOT/.current_project"
    echo "# Previous backup: $backup_dir" >> "$PROJECT_ROOT/.current_project"
}

# 軽量モード設定の適用
apply_light_mode() {
    local mode="${1:-light}"
    
    case "$mode" in
        "ultra_light")
            export CLAUDEFLOW_MODE="ultra_light"
            export CLAUDEFLOW_IMPL_LEVEL=1  # ラフレベル
            export CLAUDEFLOW_FEATURE_SELECTION=C  # コア機能のみ
            export AUTO_CONTINUE=true
            export CLAUDEFLOW_QUIET_MODE=true
            export CLAUDEFLOW_TIMEOUT_SPEC=300  # 短縮
            export CLAUDEFLOW_TIMEOUT_IMPL=300
            echo -e "${YELLOW}🚀 超軽量モードを適用しました${NC}"
            ;;
        "light")
            export CLAUDEFLOW_MODE="light"
            export CLAUDEFLOW_IMPL_LEVEL=2  # 標準レベル
            export CLAUDEFLOW_FEATURE_SELECTION=C  # コア機能のみ
            export AUTO_CONTINUE=true
            export CLAUDEFLOW_QUIET_MODE=true
            echo -e "${BLUE}⚡ 軽量モードを適用しました${NC}"
            ;;
        *)
            echo -e "${GREEN}📋 標準モードで実行します${NC}"
            ;;
    esac
}

# 自動認証機能（Claudeコマンド実行時）
run_claude_auto_auth() {
    local input="$1"
    local output_file="$2"
    local phase_name="${3:-処理}"
    
    if [ "$AUTO_APPROVE_ENABLED" = true ]; then
        log_info "自動認証モードでClaude実行: $phase_name"
        
        # 必要な認証情報を自動生成（デバッグレベルのログに変更）
        if [ "${SHOW_AUTH_WARNINGS:-false}" = "true" ]; then
            if echo "$input" | grep -q -i "password\|auth\|jwt\|secret\|key"; then
                log_warning "認証関連の処理を検出しました。必要に応じて認証情報を自動生成します。"
            fi
        fi
        
        # 権限確認をスキップして実行
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
        
        # 自動生成された認証情報をチェック・記録
        detect_and_log_credentials "$output_file" "$phase_name"
        
    else
        # 通常の認証フローを使用
        run_claude_with_tracking "$input" "$output_file" "$phase_name"
    fi
}

# 生成されたコードから認証情報を検出してログに記録
detect_and_log_credentials() {
    local output_file="$1"
    local phase_name="$2"
    
    if [ ! -f "$output_file" ]; then
        return
    fi
    
    # JWT_SECRETのパターンを検出
    if grep -q "JWT_SECRET\|jwtSecret\|JWT_KEY" "$output_file"; then
        local jwt_secret=$(generate_jwt_secret)
        log_credential "$phase_name" "JWT Secret" "$jwt_secret" "JWT認証用シークレットキー"
    fi
    
    # DATABASE_URLのパターンを検出
    if grep -q "DATABASE_URL\|DB_PASSWORD\|database.*password" "$output_file"; then
        local db_password=$(generate_db_password)
        log_credential "$phase_name" "Database Password" "$db_password" "データベース接続用パスワード"
    fi
    
    # API_KEYのパターンを検出
    if grep -q "API_KEY\|apiKey\|API_SECRET" "$output_file"; then
        local api_key=$(generate_password 32)
        log_credential "$phase_name" "API Key" "$api_key" "API認証用キー"
    fi
    
    # Admin passwordのパターンを検出
    if grep -q -i "admin.*password\|default.*password\|initial.*password" "$output_file"; then
        local admin_password=$(generate_password 16)
        log_credential "$phase_name" "Admin Password" "$admin_password" "管理者初期パスワード"
    fi
}

# 環境変数ファイル生成
generate_env_file() {
    local env_file="${1:-$PROJECT_ROOT/.env.example}"
    local service_name="${2:-ClaudeFlowApp}"
    
    init_security_dir
    
    log_info "環境変数ファイルを生成中: $env_file"
    
    cat > "$env_file" << EOF
# $service_name Environment Variables
# Generated by ClaudeFlow on $(date '+%Y-%m-%d %H:%M:%S')

# Database
DATABASE_URL="postgresql://username:$(generate_db_password)@localhost:5432/dbname"
DB_PASSWORD="$(generate_db_password)"

# JWT Authentication
JWT_SECRET="$(generate_jwt_secret)"
JWT_EXPIRES_IN="7d"

# API Configuration
API_KEY="$(generate_password 32)"
API_SECRET="$(generate_password 32)"

# Admin User
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="$(generate_password 16)"

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET="$(generate_password 64)"

# Development
NODE_ENV="development"
PORT=3000
EOF

    log_success "環境変数ファイルを生成しました: $env_file"
    log_warning "本番環境では必ず値を変更してください！"
}

# セキュリティサマリー表示
show_security_summary() {
    if [ -f "$SECURITY_LOG_FILE" ]; then
        echo -e "\n${CYAN}=== セキュリティサマリー ===${NC}"
        echo -e "${YELLOW}生成された認証情報:${NC}"
        grep -c "^## " "$SECURITY_LOG_FILE" 2>/dev/null || echo "0"
        echo -e "${YELLOW}詳細は以下を参照:${NC}"
        echo -e "${BLUE}$SECURITY_LOG_FILE${NC}"
        echo -e "${CYAN}========================${NC}"
    fi
}

# プロジェクト構造作成関数

# プロジェクト名を要件から自動抽出
extract_project_name() {
    local requirements_file="$1"
    local fallback_name="${2:-app}"
    local app_name="${3:-}"
    
    # アプリ名が明示的に渡された場合は、それをケバブケースに変換して使用
    if [ -n "$app_name" ]; then
        # 日本語を英語に変換するための包括的マッピング
        local english_name="$app_name"
        
        # Claudeを使った高度な変換を試みる（日本語が含まれている場合）
        if [ "${CLAUDEFLOW_USE_CLAUDE_TRANSLATION:-true}" = "true" ] && echo "$app_name" | grep -q '[ぁ-んァ-ヶー一-龠]'; then
            if command -v claude >/dev/null 2>&1; then
                log_info "Claudeを使用して日本語アプリ名を変換中..."
                
                local claude_prompt="以下の日本語のアプリ名を適切な英語のプロジェクトフォルダ名に変換してください。

アプリ名: $app_name

要件:
1. 意味を考慮した適切な英語名
2. 小文字のみ使用
3. 単語間はハイフン(-)で区切る
4. 英数字とハイフンのみ使用（特殊文字は使わない）
5. 簡潔で分かりやすい名前
6. 一般的な英語表現を使用

例:
- 魚釣り → fishing
- 計算機 → calculator
- ボーリング → bowling
- 家計簿 → household-budget
- 英単語学習 → english-vocabulary
- 料理レシピ → recipe-manager

変換結果のみを1行で出力してください。説明は不要です。"
                
                # Claudeで変換を実行（タイムアウトとエラーハンドリング付き）
                local claude_result=$(echo "$claude_prompt" | timeout 10 claude --no-conversation --dangerously-skip-permissions 2>/dev/null | tail -1 | tr -d '\n' | sed 's/[^a-zA-Z0-9-]//g' | tr '[:upper:]' '[:lower:]')
                
                if [ -n "$claude_result" ] && [ "$claude_result" != "$app_name" ]; then
                    english_name="$claude_result"
                    log_success "Claude変換成功: $app_name → $english_name"
                else
                    log_warning "Claude変換に失敗しました。既存の変換方法を使用します。"
                fi
            fi
        fi
        
        # ゲーム関連
        english_name=$(echo "$english_name" | sed 's/オセロ/othello/g')
        english_name=$(echo "$english_name" | sed 's/魚釣り/fishing/g')
        english_name=$(echo "$english_name" | sed 's/釣り/fishing/g')
        english_name=$(echo "$english_name" | sed 's/ボーリング/bowling/g')
        english_name=$(echo "$english_name" | sed 's/ボウリング/bowling/g')
        english_name=$(echo "$english_name" | sed 's/テトリス/tetris/g')
        english_name=$(echo "$english_name" | sed 's/パズル/puzzle/g')
        english_name=$(echo "$english_name" | sed 's/クイズ/quiz/g')
        english_name=$(echo "$english_name" | sed 's/シューティング/shooting/g')
        english_name=$(echo "$english_name" | sed 's/レース/racing/g')
        english_name=$(echo "$english_name" | sed 's/カード/card/g')
        english_name=$(echo "$english_name" | sed 's/将棋/shogi/g')
        english_name=$(echo "$english_name" | sed 's/囲碁/go/g')
        english_name=$(echo "$english_name" | sed 's/マージャン/mahjong/g')
        english_name=$(echo "$english_name" | sed 's/麻雀/mahjong/g')
        english_name=$(echo "$english_name" | sed 's/ゲーム/game/g')
        
        # アプリケーション関連
        english_name=$(echo "$english_name" | sed 's/計算機/calculator/g')
        english_name=$(echo "$english_name" | sed 's/電卓/calculator/g')
        english_name=$(echo "$english_name" | sed 's/メモ帳/notepad/g')
        english_name=$(echo "$english_name" | sed 's/メモ/memo/g')
        english_name=$(echo "$english_name" | sed 's/カレンダー/calendar/g')
        english_name=$(echo "$english_name" | sed 's/時計/clock/g')
        english_name=$(echo "$english_name" | sed 's/タイマー/timer/g')
        english_name=$(echo "$english_name" | sed 's/ストップウォッチ/stopwatch/g')
        english_name=$(echo "$english_name" | sed 's/天気/weather/g')
        english_name=$(echo "$english_name" | sed 's/ニュース/news/g')
        english_name=$(echo "$english_name" | sed 's/地図/map/g')
        english_name=$(echo "$english_name" | sed 's/写真/photo/g')
        english_name=$(echo "$english_name" | sed 's/動画/video/g')
        english_name=$(echo "$english_name" | sed 's/音楽/music/g')
        english_name=$(echo "$english_name" | sed 's/チャット/chat/g')
        english_name=$(echo "$english_name" | sed 's/ブログ/blog/g')
        english_name=$(echo "$english_name" | sed 's/アプリ/app/g')
        
        # システム関連
        english_name=$(echo "$english_name" | sed 's/管理/admin/g')
        english_name=$(echo "$english_name" | sed 's/設定/settings/g')
        english_name=$(echo "$english_name" | sed 's/ツール/tool/g')
        english_name=$(echo "$english_name" | sed 's/ユーティリティ/utility/g')
        english_name=$(echo "$english_name" | sed 's/エディタ/editor/g')
        english_name=$(echo "$english_name" | sed 's/エディター/editor/g')
        english_name=$(echo "$english_name" | sed 's/ビューア/viewer/g')
        english_name=$(echo "$english_name" | sed 's/ビューアー/viewer/g')
        english_name=$(echo "$english_name" | sed 's/プレーヤー/player/g')
        english_name=$(echo "$english_name" | sed 's/プレイヤー/player/g')
        english_name=$(echo "$english_name" | sed 's/ブラウザ/browser/g')
        english_name=$(echo "$english_name" | sed 's/ブラウザー/browser/g')
        
        # 一般的な単語
        english_name=$(echo "$english_name" | sed 's/簡単/simple/g')
        english_name=$(echo "$english_name" | sed 's/かんたん/simple/g')
        english_name=$(echo "$english_name" | sed 's/高速/fast/g')
        english_name=$(echo "$english_name" | sed 's/新しい/new/g')
        english_name=$(echo "$english_name" | sed 's/新/new/g')
        english_name=$(echo "$english_name" | sed 's/私の/my/g')
        english_name=$(echo "$english_name" | sed 's/俺の/my/g')
        english_name=$(echo "$english_name" | sed 's/テスト/test/g')
        english_name=$(echo "$english_name" | sed 's/サンプル/sample/g')
        english_name=$(echo "$english_name" | sed 's/デモ/demo/g')
        english_name=$(echo "$english_name" | sed 's/練習/practice/g')
        english_name=$(echo "$english_name" | sed 's/学習/learning/g')
        english_name=$(echo "$english_name" | sed 's/勉強/study/g')
        
        # ローマ字変換フォールバック（日本語が残っている場合）
        if echo "$english_name" | grep -q '[ぁ-んァ-ヶー一-龠]'; then
            # Pythonでローマ字変換を実行（多くの環境で利用可能）
            if command -v python3 >/dev/null 2>&1; then
                english_name=$(python3 -c "
import sys
text = '$english_name'

# 簡易的なひらがな→ローマ字変換テーブル
hiragana_to_romaji = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    'ー': '-', '〜': '-'
}

# カタカナ→ひらがな変換
result = []
for char in text:
    if 'ァ' <= char <= 'ヶ':
        # カタカナをひらがなに変換
        hiragana = chr(ord(char) - ord('ァ') + ord('ぁ'))
        result.append(hiragana_to_romaji.get(hiragana, char))
    elif char in hiragana_to_romaji:
        result.append(hiragana_to_romaji[char])
    elif 'A' <= char <= 'Z' or 'a' <= char <= 'z' or '0' <= char <= '9' or char in ' -_':
        result.append(char)
    # 漢字や未知の文字は無視

print(''.join(result))
" 2>/dev/null)
            fi
            
            # Pythonが使えない場合は基本的な変換のみ
            if [ -z "$english_name" ] || echo "$english_name" | grep -q '[ぁ-んァ-ヶー一-龠]'; then
                # 最低限のカタカナのみ変換
                english_name=$(echo "$english_name" | \
                    sed 's/ア/a/g;s/イ/i/g;s/ウ/u/g;s/エ/e/g;s/オ/o/g' | \
                    sed 's/カ/ka/g;s/キ/ki/g;s/ク/ku/g;s/ケ/ke/g;s/コ/ko/g' | \
                    sed 's/サ/sa/g;s/シ/shi/g;s/ス/su/g;s/セ/se/g;s/ソ/so/g' | \
                    sed 's/タ/ta/g;s/チ/chi/g;s/ツ/tsu/g;s/テ/te/g;s/ト/to/g' | \
                    sed 's/ナ/na/g;s/ニ/ni/g;s/ヌ/nu/g;s/ネ/ne/g;s/ノ/no/g' | \
                    sed 's/ハ/ha/g;s/ヒ/hi/g;s/フ/fu/g;s/ヘ/he/g;s/ホ/ho/g' | \
                    sed 's/マ/ma/g;s/ミ/mi/g;s/ム/mu/g;s/メ/me/g;s/モ/mo/g' | \
                    sed 's/ヤ/ya/g;s/ユ/yu/g;s/ヨ/yo/g' | \
                    sed 's/ラ/ra/g;s/リ/ri/g;s/ル/ru/g;s/レ/re/g;s/ロ/ro/g' | \
                    sed 's/ワ/wa/g;s/ヲ/wo/g;s/ン/n/g' | \
                    sed 's/ー/-/g')
            fi
        fi
        
        # ケバブケースに変換
        local kebab_name=$(echo "$english_name" | \
            sed 's/[[:space:]]\+/-/g' | \
            sed 's/[^a-zA-Z0-9-]//g' | \
            sed 's/--\+/-/g' | \
            sed 's/^-//;s/-$//' | \
            tr '[:upper:]' '[:lower:]')
        
        # 変換結果が空でない場合は使用
        if [ -n "$kebab_name" ]; then
            echo "${kebab_name}-app"
        else
            echo "${fallback_name}-$(date +%Y%m%d-%H%M%S)"
        fi
        return
    fi
    
    if [ -f "$requirements_file" ]; then
        # 要件ファイルからプロジェクト名を抽出
        local project_name=$(grep -i -E "(プロジェクト名|project.*name|アプリ名|app.*name|システム名|system.*name)" "$requirements_file" | head -1 | sed -E 's/.*[:：]\s*([^。．\n]+).*/\1/' | tr -d ' ' | tr '[:upper:]' '[:lower:]')
        
        # プロジェクト名が空または無効な場合は、内容から推測
        if [ -z "$project_name" ] || echo "$project_name" | grep -q '[^a-zA-Z0-9_-]'; then
            # よくあるプロジェクトタイプから推測
            if grep -q -i "todo\|task\|タスク\|ToDo" "$requirements_file"; then
                project_name="todo-app"
            elif grep -q -i "shop\|ecommerce\|ec\|ショップ\|通販" "$requirements_file"; then
                project_name="ecommerce-app"
            elif grep -q -i "blog\|ブログ\|記事" "$requirements_file"; then
                project_name="blog-app"
            elif grep -q -i "chat\|チャット\|メッセージ" "$requirements_file"; then
                project_name="chat-app"
            elif grep -q -i "dashboard\|管理\|admin" "$requirements_file"; then
                project_name="admin-app"
            else
                project_name="$fallback_name"
            fi
        fi
        
        # 空の場合はフォールバック
        if [ -z "$project_name" ]; then
            project_name="$fallback_name"
        fi
        
        # 有効な名前に変換（英数字、ハイフン、アンダースコアのみ）
        project_name=$(echo "$project_name" | sed 's/[^a-zA-Z0-9_-]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
        
        echo "$project_name"
    else
        echo "$fallback_name"
    fi
}

# プロジェクトタイプを判定
determine_project_type() {
    local requirements_file="$1"
    
    if [ -f "$requirements_file" ]; then
        # 技術スタックから判定
        if grep -q -i "next\.js\|full.*stack\|フルスタック" "$requirements_file"; then
            echo "fullstack"
        elif grep -q -i "react\|vue\|angular\|frontend\|フロントエンド\|ui\|interface" "$requirements_file"; then
            if grep -q -i "backend\|api\|server\|database\|バックエンド\|サーバー\|prisma\|postgresql\|mysql\|mongodb" "$requirements_file"; then
                echo "fullstack"
            else
                echo "web"
            fi
        elif grep -q -i "node\.js\|express\|fastify\|backend\|api\|server\|database\|バックエンド\|サーバー\|postgresql\|mysql\|mongodb" "$requirements_file"; then
            echo "backend"
        elif grep -q -i "cli\|command.*line\|terminal\|コマンド\|ターミナル" "$requirements_file"; then
            echo "cli"
        elif grep -q -i "library\|package\|ライブラリ\|パッケージ" "$requirements_file"; then
            echo "library"
        else
            echo "web"  # デフォルトはweb
        fi
    else
        echo "web"
    fi
}

# プロジェクト構造を作成
create_project_structure() {
    local project_name="$1"
    local base_dir="$2"
    local project_type="${3:-web}"
    
    log_info "プロジェクト構造を作成中: $project_name ($project_type)" >&2
    
    local project_dir="$base_dir/$project_name"
    
    # 基本ディレクトリ構造
    mkdir -p "$project_dir"/{src,tests,docs,config,scripts}
    
    # プロジェクトタイプ別の構造
    case "$project_type" in
        "web"|"frontend")
            mkdir -p "$project_dir"/src/{components,pages,hooks,services,utils,types,styles}
            mkdir -p "$project_dir"/{public,assets}
            mkdir -p "$project_dir"/tests/{unit,integration,e2e}
            ;;
        "backend"|"api")
            mkdir -p "$project_dir"/src/{controllers,services,models,middleware,routes,utils,types}
            mkdir -p "$project_dir"/tests/{unit,integration,api}
            mkdir -p "$project_dir"/{database,migrations}
            ;;
        "fullstack")
            # Frontend
            mkdir -p "$project_dir"/frontend/src/{components,pages,hooks,services,utils,types,styles}
            mkdir -p "$project_dir"/frontend/{public,assets}
            mkdir -p "$project_dir"/frontend/tests/{unit,integration,e2e}
            
            # Backend
            mkdir -p "$project_dir"/backend/src/{controllers,services,models,middleware,routes,utils,types}
            mkdir -p "$project_dir"/backend/tests/{unit,integration,api}
            mkdir -p "$project_dir"/backend/{database,migrations}
            
            # Shared
            mkdir -p "$project_dir"/shared/{types,utils,constants}
            ;;
        *)
            # デフォルト構造
            mkdir -p "$project_dir"/src/{components,services,utils,types}
            mkdir -p "$project_dir"/tests/{unit,integration}
            ;;
    esac
    
    # プロジェクト情報ファイルを作成
    create_project_info "$project_dir" "$project_name" "$project_type"
    
    # プロジェクトファイルを生成
    generate_project_files "$project_dir" "$project_name" "$project_type"
    
    log_success "プロジェクト構造作成完了: $project_dir" >&2
    echo "$project_dir"
}

# テンプレート変数を置換
apply_template_vars() {
    local template_content="$1"
    local project_name="$2"
    local project_description="${3:-Generated by ClaudeFlow}"
    local cli_command="${4:-$project_name}"
    
    # テンプレート変数を実際の値に置換
    template_content=$(echo "$template_content" | sed "s/{{PROJECT_NAME}}/$project_name/g")
    template_content=$(echo "$template_content" | sed "s/{{PROJECT_DESCRIPTION}}/$project_description/g")
    template_content=$(echo "$template_content" | sed "s/{{CLI_COMMAND}}/$cli_command/g")
    
    echo "$template_content"
}

# プロジェクトファイルを生成
generate_project_files() {
    local project_dir="$1"
    local project_name="$2"
    local project_type="$3"
    
    local templates_dir="$SCRIPT_DIR/../templates"
    local project_description="Generated by ClaudeFlow - $project_type project"
    
    log_info "プロジェクトファイルを生成中: $project_type" >&2
    
    # プロジェクトタイプ別のファイル生成
    case "$project_type" in
        "web"|"frontend")
            generate_web_files "$project_dir" "$project_name" "$project_description" "$templates_dir"
            ;;
        "backend"|"api")
            generate_backend_files "$project_dir" "$project_name" "$project_description" "$templates_dir"
            ;;
        "fullstack")
            generate_fullstack_files "$project_dir" "$project_name" "$project_description" "$templates_dir"
            ;;
        "cli")
            generate_cli_files "$project_dir" "$project_name" "$project_description" "$templates_dir"
            ;;
        "library")
            generate_library_files "$project_dir" "$project_name" "$project_description" "$templates_dir"
            ;;
        *)
            # デフォルトはweb
            generate_web_files "$project_dir" "$project_name" "$project_description" "$templates_dir"
            ;;
    esac
    
    # 起動スクリプトを生成
    create_startup_scripts "$project_dir" "$project_type"
}

# Web プロジェクトファイル生成
generate_web_files() {
    local project_dir="$1"
    local project_name="$2"
    local project_description="$3"
    local templates_dir="$4"
    
    # package.json
    if [ -f "$templates_dir/web/package.json" ]; then
        local content=$(cat "$templates_dir/web/package.json")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/package.json"
    fi
    
    # 設定ファイル
    [ -f "$templates_dir/web/next.config.js" ] && cp "$templates_dir/web/next.config.js" "$project_dir/"
    [ -f "$templates_dir/web/tsconfig.json" ] && cp "$templates_dir/web/tsconfig.json" "$project_dir/"
    [ -f "$templates_dir/web/tailwind.config.js" ] && cp "$templates_dir/web/tailwind.config.js" "$project_dir/"
    
    # 初期コード
    if [ -f "$templates_dir/web/src/app/page.tsx" ]; then
        mkdir -p "$project_dir/src/app"
        local content=$(cat "$templates_dir/web/src/app/page.tsx")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/src/app/page.tsx"
    fi
    
    if [ -f "$templates_dir/web/src/app/layout.tsx" ]; then
        local content=$(cat "$templates_dir/web/src/app/layout.tsx")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/src/app/layout.tsx"
    fi
    
    [ -f "$templates_dir/web/src/app/globals.css" ] && cp "$templates_dir/web/src/app/globals.css" "$project_dir/src/app/"
}

# Backend プロジェクトファイル生成
generate_backend_files() {
    local project_dir="$1"
    local project_name="$2"
    local project_description="$3"
    local templates_dir="$4"
    
    # package.json
    if [ -f "$templates_dir/backend/package.json" ]; then
        local content=$(cat "$templates_dir/backend/package.json")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/package.json"
    fi
    
    # 設定ファイル
    [ -f "$templates_dir/backend/tsconfig.json" ] && cp "$templates_dir/backend/tsconfig.json" "$project_dir/"
    
    if [ -f "$templates_dir/backend/.env.example" ]; then
        local content=$(cat "$templates_dir/backend/.env.example")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/.env.example"
    fi
    
    # 初期コード
    if [ -f "$templates_dir/backend/src/index.ts" ]; then
        mkdir -p "$project_dir/src"
        local content=$(cat "$templates_dir/backend/src/index.ts")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/src/index.ts"
    fi
}

# CLI プロジェクトファイル生成
generate_cli_files() {
    local project_dir="$1"
    local project_name="$2"
    local project_description="$3"
    local templates_dir="$4"
    
    local cli_command=$(echo "$project_name" | sed 's/-cli$//' | sed 's/^cli-//')
    
    # package.json
    if [ -f "$templates_dir/cli/package.json" ]; then
        local content=$(cat "$templates_dir/cli/package.json")
        content=$(apply_template_vars "$content" "$project_name" "$project_description" "$cli_command")
        echo "$content" > "$project_dir/package.json"
    fi
    
    # 設定ファイル
    [ -f "$templates_dir/cli/tsconfig.json" ] && cp "$templates_dir/cli/tsconfig.json" "$project_dir/"
    
    # 初期コード
    if [ -f "$templates_dir/cli/src/index.ts" ]; then
        mkdir -p "$project_dir/src"
        local content=$(cat "$templates_dir/cli/src/index.ts")
        content=$(apply_template_vars "$content" "$project_name" "$project_description" "$cli_command")
        echo "$content" > "$project_dir/src/index.ts"
    fi
}

# Library プロジェクトファイル生成
generate_library_files() {
    local project_dir="$1"
    local project_name="$2"
    local project_description="$3"
    local templates_dir="$4"
    
    # package.json
    if [ -f "$templates_dir/library/package.json" ]; then
        local content=$(cat "$templates_dir/library/package.json")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/package.json"
    fi
    
    # 設定ファイル
    [ -f "$templates_dir/library/tsconfig.json" ] && cp "$templates_dir/library/tsconfig.json" "$project_dir/"
    [ -f "$templates_dir/library/rollup.config.js" ] && cp "$templates_dir/library/rollup.config.js" "$project_dir/"
    
    # 初期コード
    if [ -f "$templates_dir/library/src/index.ts" ]; then
        mkdir -p "$project_dir/src"
        local content=$(cat "$templates_dir/library/src/index.ts")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/src/index.ts"
    fi
}

# Fullstack プロジェクトファイル生成
generate_fullstack_files() {
    local project_dir="$1"
    local project_name="$2"
    local project_description="$3"
    local templates_dir="$4"
    
    # ルートのpackage.json
    if [ -f "$templates_dir/fullstack/package.json" ]; then
        local content=$(cat "$templates_dir/fullstack/package.json")
        content=$(apply_template_vars "$content" "$project_name" "$project_description")
        echo "$content" > "$project_dir/package.json"
    fi
    
    # フロントエンド
    generate_web_files "$project_dir/frontend" "$project_name-frontend" "Frontend for $project_description" "$templates_dir"
    
    # バックエンド
    generate_backend_files "$project_dir/backend" "$project_name-backend" "Backend for $project_description" "$templates_dir"
}

# 起動スクリプトを生成
create_startup_scripts() {
    local project_dir="$1"
    local project_type="$2"
    
    # start-app.sh (Linux/macOS)
    cat > "$project_dir/start-app.sh" << 'EOF'
#!/bin/bash

# {{PROJECT_NAME}} 起動スクリプト
echo "🚀 {{PROJECT_NAME}} を起動中..."

# Node.js のチェック
if ! command -v node &> /dev/null; then
    echo "❌ Node.js がインストールされていません"
    echo "📥 https://nodejs.org からダウンロードしてインストールしてください"
    exit 1
fi

# 依存関係のチェック・インストール
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストール中..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依存関係のインストールに失敗しました"
        exit 1
    fi
fi

# プロジェクトタイプ別の起動
case "{{PROJECT_TYPE}}" in
    "web"|"frontend")
        echo "🌐 Next.js 開発サーバーを起動中..."
        echo "📍 ブラウザで http://localhost:3000 を開きます"
        if command -v open &> /dev/null; then
            open http://localhost:3000 &
        elif command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000 &
        fi
        npm run dev
        ;;
    "backend"|"api")
        echo "🔧 Express サーバーを起動中..."
        echo "📍 API: http://localhost:3001"
        npm run dev
        ;;
    "fullstack")
        echo "🌐 フルスタックアプリケーションを起動中..."
        echo "📍 フロントエンド: http://localhost:3000"
        echo "📍 バックエンド: http://localhost:3001"
        npm run dev
        ;;
    "cli")
        echo "🔧 CLI アプリケーションをビルド中..."
        npm run build
        echo "✅ CLI アプリケーションの準備が完了しました"
        echo "使用方法: npm start -- --help"
        ;;
    "library")
        echo "📚 ライブラリをビルド中..."
        npm run build
        echo "✅ ライブラリのビルドが完了しました"
        echo "テスト実行: npm test"
        ;;
    *)
        echo "🚀 開発サーバーを起動中..."
        npm run dev
        ;;
esac
EOF

    # start-app.bat (Windows)
    cat > "$project_dir/start-app.bat" << 'EOF'
@echo off
echo 🚀 {{PROJECT_NAME}} を起動中...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js がインストールされていません
    echo 📥 https://nodejs.org からダウンロードしてインストールしてください
    pause
    exit /b 1
)

if not exist node_modules (
    echo 📦 依存関係をインストール中...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依存関係のインストールに失敗しました
        pause
        exit /b 1
    )
)

if "{{PROJECT_TYPE}}"=="web" (
    echo 🌐 Next.js 開発サーバーを起動中...
    echo 📍 ブラウザで http://localhost:3000 を開きます
    start http://localhost:3000
    npm run dev
) else if "{{PROJECT_TYPE}}"=="backend" (
    echo 🔧 Express サーバーを起動中...
    echo 📍 API: http://localhost:3001
    npm run dev
) else if "{{PROJECT_TYPE}}"=="fullstack" (
    echo 🌐 フルスタックアプリケーションを起動中...
    echo 📍 フロントエンド: http://localhost:3000
    echo 📍 バックエンド: http://localhost:3001
    start http://localhost:3000
    npm run dev
) else if "{{PROJECT_TYPE}}"=="cli" (
    echo 🔧 CLI アプリケーションをビルド中...
    npm run build
    echo ✅ CLI アプリケーションの準備が完了しました
    echo 使用方法: npm start -- --help
) else if "{{PROJECT_TYPE}}"=="library" (
    echo 📚 ライブラリをビルド中...
    npm run build
    echo ✅ ライブラリのビルドが完了しました
    echo テスト実行: npm test
) else (
    echo 🚀 開発サーバーを起動中...
    npm run dev
)

pause
EOF

    # 変数を置換
    sed -i "s/{{PROJECT_NAME}}/$project_name/g" "$project_dir/start-app.sh" "$project_dir/start-app.bat"
    sed -i "s/{{PROJECT_TYPE}}/$project_type/g" "$project_dir/start-app.sh" "$project_dir/start-app.bat"
    
    # 実行権限を付与
    chmod +x "$project_dir/start-app.sh"
}

# プロジェクト情報ファイルを作成
create_project_info() {
    local project_dir="$1"
    local project_name="$2"
    local project_type="$3"
    
    # プロジェクトタイプ別の説明
    local type_description=""
    local startup_details=""
    case "$project_type" in
        "web"|"frontend")
            type_description="Next.js Webアプリケーション"
            startup_details="ブラウザで http://localhost:3000 にアクセスしてください"
            ;;
        "backend"|"api")
            type_description="Express.js バックエンドAPI"
            startup_details="API エンドポイント: http://localhost:3001"
            ;;
        "fullstack")
            type_description="フルスタックアプリケーション"
            startup_details="フロントエンド: http://localhost:3000, バックエンド: http://localhost:3001"
            ;;
        "cli")
            type_description="コマンドラインツール"
            startup_details="コマンド例: npm start -- hello"
            ;;
        "library")
            type_description="JavaScriptライブラリ"
            startup_details="テスト実行: npm test"
            ;;
        *)
            type_description="$project_type アプリケーション"
            startup_details="開発サーバーが起動します"
            ;;
    esac
    
    cat > "$project_dir/PROJECT_INFO.md" << EOF
# $project_name

## 🚀 アプリの起動方法（誰でも簡単！）

### ⚡ ワンクリック起動

**Windows の方:**
\`start-app.bat\` をダブルクリックしてください

**Mac/Linux の方:**
ターミナルで \`./start-app.sh\` を実行してください

### 📱 起動後の使い方
$startup_details

---

## プロジェクト情報
- **プロジェクト名**: $project_name
- **タイプ**: $type_description
- **作成日**: $(date '+%Y-%m-%d %H:%M:%S')
- **作成ツール**: ClaudeFlow

## 必要な環境
- Node.js (https://nodejs.org からダウンロード)
- 起動スクリプトが自動で依存関係をインストールします

## ディレクトリ構造
$(tree "$project_dir" 2>/dev/null || find "$project_dir" -type d | head -20)

## 🛠️ 開発者向け情報
このプロジェクトはClaudeFlowによって自動生成されました。
- 実装コードは \`src/\` ディレクトリに配置されています
- 設定ファイル: \`package.json\`, \`tsconfig.json\`
- 起動スクリプト: \`start-app.sh\` (Linux/macOS), \`start-app.bat\` (Windows)

## トラブルシューティング
- エラーが出る場合: Node.jsが正しくインストールされているか確認
- ポートが使用中: 他のアプリケーションを終了してから再実行
- 依存関係エラー: \`npm install\` を手動で実行

EOF
}

# プロジェクトタイプを推測
detect_project_type() {
    local requirements_file="$1"
    
    if [ ! -f "$requirements_file" ]; then
        echo "web"
        return
    fi
    
    # キーワードベースで判定
    if grep -q -i "api\|backend\|server\|database\|データベース" "$requirements_file"; then
        if grep -q -i "frontend\|フロントエンド\|ui\|ユーザーインターフェース" "$requirements_file"; then
            echo "fullstack"
        else
            echo "backend"
        fi
    elif grep -q -i "web\|frontend\|react\|vue\|angular\|フロントエンド" "$requirements_file"; then
        echo "frontend"
    else
        echo "web"
    fi
}

# 統一されたプロジェクト作成関数
create_unified_project() {
    local requirements_file="$1"
    local base_dir="$2"
    local force_name="$3"
    
    # プロジェクト名を決定
    local project_name
    if [ -n "$force_name" ]; then
        project_name="$force_name"
    else
        project_name=$(extract_project_name "$requirements_file" "generated-app")
    fi
    
    # プロジェクトタイプを検出
    local project_type=$(determine_project_type "$requirements_file")
    
    # プロジェクト構造を作成
    local project_dir=$(create_project_structure "$project_name" "$base_dir" "$project_type")
    
    # ログ出力をstderrに送信して戻り値と分離
    log_info "統一プロジェクト作成完了:" >&2
    log_info "  名前: $project_name" >&2
    log_info "  タイプ: $project_type" >&2
    log_info "  場所: $project_dir" >&2
    
    echo "$project_dir"
}

# ==========================================
# ClaudeFlow設定管理関数
# ==========================================

# 設定プリセットを適用する関数
apply_preset() {
    local preset="$1"
    case "$preset" in
        "rapid"|"1")
            export CLAUDEFLOW_REQ_LEVEL="A"        # 最小要件
            export CLAUDEFLOW_IMPL_MODE="4"        # ハイブリッド
            export CLAUDEFLOW_IMPL_LEVEL="1"       # ラフレベル
            export CLAUDEFLOW_FEATURE_SELECTION="C" # コア機能のみ
            echo -e "${GREEN}ラピッドプロトタイプ設定を適用しました${NC}" >&2
            ;;
        "standard"|"2")
            export CLAUDEFLOW_REQ_LEVEL="B"        # 標準要件
            export CLAUDEFLOW_IMPL_MODE="4"        # ハイブリッド
            export CLAUDEFLOW_IMPL_LEVEL="2"       # 標準レベル
            export CLAUDEFLOW_FEATURE_SELECTION="A" # 全機能
            echo -e "${GREEN}標準開発設定を適用しました${NC}" >&2
            ;;
        "production"|"3")
            export CLAUDEFLOW_REQ_LEVEL="C"        # 詳細要件
            export CLAUDEFLOW_IMPL_MODE="4"        # ハイブリッド
            export CLAUDEFLOW_IMPL_LEVEL="3"       # 商用レベル
            export CLAUDEFLOW_FEATURE_SELECTION="A" # 全機能
            echo -e "${GREEN}プロダクション準備設定を適用しました${NC}" >&2
            ;;
        *)
            echo -e "${YELLOW}不明なプリセット: $preset. 標準設定を使用します${NC}" >&2
            apply_preset "standard"
            ;;
    esac
}

# 現在の設定を表示する関数
show_current_config() {
    echo -e "${CYAN}=== 現在の設定 ===${NC}" >&2
    echo -e "要件レベル: ${CLAUDEFLOW_REQ_LEVEL}" >&2
    echo -e "実装モード: ${CLAUDEFLOW_IMPL_MODE}" >&2
    echo -e "実装レベル: ${CLAUDEFLOW_IMPL_LEVEL}" >&2
    echo -e "機能選択: ${CLAUDEFLOW_FEATURE_SELECTION}" >&2
    echo "" >&2
}

# インタラクティブ設定関数
configure_claudeflow_interactive() {
    echo -e "${CYAN}ClaudeFlow設定を選択してください:${NC}" >&2
    echo "1) ラピッドプロトタイプ - 最速でコア機能のみ実装" >&2
    echo "2) 標準開発 - バランスの取れた全機能実装" >&2
    echo "3) プロダクション準備 - 完全品質の本格実装" >&2
    echo "4) カスタム設定 - 個別に設定" >&2
    echo -n "選択 (1-4) [デフォルト: 2]: " >&2
    read -r preset_choice
    
    case "${preset_choice:-2}" in
        1) apply_preset "rapid" ;;
        2) apply_preset "standard" ;;
        3) apply_preset "production" ;;
        4) configure_claudeflow_custom ;;
        *) apply_preset "standard" ;;
    esac
}

# カスタム設定関数
configure_claudeflow_custom() {
    echo -e "${CYAN}カスタム設定モード${NC}" >&2
    
    echo "要件レベルを選択:" >&2
    echo "A) 最小要件 B) 標準要件 C) 詳細要件 D) カスタム要件" >&2
    echo -n "選択 [A]: " >&2
    read -r req_level
    export CLAUDEFLOW_REQ_LEVEL="${req_level:-A}"
    
    echo "実装モードを選択:" >&2
    echo "1) コンテキストE 2) インクリメンタル 3) 自動インクリメンタル 4) ハイブリッド 5) 通常" >&2
    echo -n "選択 [4]: " >&2
    read -r impl_mode
    export CLAUDEFLOW_IMPL_MODE="${impl_mode:-4}"
    
    echo "実装レベルを選択:" >&2
    echo "1) ラフ 2) 標準 3) 商用" >&2
    echo -n "選択 [2]: " >&2
    read -r impl_level
    export CLAUDEFLOW_IMPL_LEVEL="${impl_level:-2}"
    
    echo "機能選択を選択:" >&2
    echo "A) 全機能 C) コア機能のみ S) 手動選択" >&2
    echo -n "選択 [A]: " >&2
    read -r feature_selection
    export CLAUDEFLOW_FEATURE_SELECTION="${feature_selection:-A}"
    
    echo -e "${GREEN}カスタム設定を適用しました${NC}" >&2
}

# ==========================================
# 表示制御関数
# ==========================================

# 簡潔モードの制御
CLAUDEFLOW_QUIET_MODE="${CLAUDEFLOW_QUIET_MODE:-false}"
CLAUDEFLOW_SHOW_PROGRESS="${CLAUDEFLOW_SHOW_PROGRESS:-true}"

# プログレスバー表示関数
show_progress() {
    local current=$1
    local total=$2
    local message="$3"
    local width=50
    
    if [ "$CLAUDEFLOW_SHOW_PROGRESS" = "true" ]; then
        local percent=$((current * 100 / total))
        local filled=$((current * width / total))
        local empty=$((width - filled))
        
        printf "\r%s [" "$message"
        printf "%*s" $filled '' | tr ' ' '█'
        printf "%*s" $empty '' | tr ' ' '░'
        printf "] %d%% (%d/%d)" $percent $current $total
        
        if [ $current -eq $total ]; then
            printf " ✅\n"
        fi
    fi
}

# 簡潔ログ関数
log_concise() {
    if [ "$CLAUDEFLOW_QUIET_MODE" = "false" ]; then
        echo -e "$1"
    fi
}

# フェーズ開始表示
phase_start() {
    local phase_name="$1"
    if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
        printf "%-20s ... " "$phase_name"
    else
        echo -e "${CYAN}=== $phase_name 開始 ===${NC}"
    fi
}

# フェーズ完了表示
phase_complete() {
    local phase_name="$1"
    local result="$2"
    if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
        echo "✅"
    else
        echo -e "${GREEN}=== $phase_name 完了 ===${NC}"
        [ -n "$result" ] && echo "$result"
    fi
}

# エラー表示
phase_error() {
    local phase_name="$1"
    local error="$2"
    if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
        echo "❌"
        echo "エラー: $error"
    else
        echo -e "${RED}=== $phase_name エラー ===${NC}"
        echo "$error"
    fi
}

# ====================================
# 行数制限関連機能
# ====================================

# 単一ファイルの行数チェック
count_file_lines() {
    local file="$1"
    if [ -f "$file" ] && [ -s "$file" ]; then
        wc -l < "$file" 2>/dev/null || echo 0
    else
        echo 0
    fi
}

# プロジェクト全体の行数チェック
check_project_line_limit() {
    local output_dir="$1"
    local max_lines="${CLAUDEFLOW_MAX_LINES:-2000}"
    local warning_threshold="${CLAUDEFLOW_WARNING_THRESHOLD:-80}"
    
    if [ "$CLAUDEFLOW_LINE_CHECK" != "true" ]; then
        return 0  # 制限チェック無効時はスキップ
    fi
    
    local total_lines=0
    local file_count=0
    local detailed_report=""
    
    echo -e "${BLUE}📏 行数制限チェック開始 (最大: ${max_lines}行)${NC}"
    
    # 対象ファイル拡張子
    local extensions=("html" "js" "css" "ts" "jsx" "tsx" "vue" "py" "java" "cpp" "c")
    
    for ext in "${extensions[@]}"; do
        for file in "$output_dir"/*."$ext" "$output_dir"/**/*."$ext"; do
            if [ -f "$file" ]; then
                local lines=$(count_file_lines "$file")
                total_lines=$((total_lines + lines))
                file_count=$((file_count + 1))
                local relative_path=$(basename "$file")
                detailed_report="${detailed_report}  📄 $relative_path: ${lines}行\n"
            fi
        done
    done
    
    # 結果表示
    local percent=$((total_lines * 100 / max_lines))
    local warning_limit=$((max_lines * warning_threshold / 100))
    
    echo -e "${BLUE}検出ファイル数: ${file_count}${NC}"
    echo -e "$detailed_report"
    echo -e "${CYAN}総行数: ${total_lines} / ${max_lines} (${percent}%)${NC}"
    
    # 進捗バー表示
    local bar_width=40
    local filled=$((percent * bar_width / 100))
    local empty=$((bar_width - filled))
    
    printf "["
    printf "%*s" $filled '' | tr ' ' '█'
    printf "%*s" $empty '' | tr ' ' '░'
    printf "] %d%%\n" $percent
    
    # 状況判定と警告
    if [ "$total_lines" -gt "$max_lines" ]; then
        echo -e "${RED}🚨 エラー: ${total_lines}行 > ${max_lines}行制限を超過しています${NC}"
        echo -e "${YELLOW}💡 提案: 機能削減または最適化が必要です${NC}"
        return 1
    elif [ "$total_lines" -gt "$warning_limit" ]; then
        echo -e "${YELLOW}⚠️  警告: ${total_lines}行 > ${warning_limit}行 (${warning_threshold}%制限)${NC}"
        echo -e "${BLUE}💡 提案: コードの最適化を検討してください${NC}"
        return 2
    else
        echo -e "${GREEN}✅ 制限内: ${total_lines}行 ≤ ${max_lines}行${NC}"
        local remaining=$((max_lines - total_lines))
        echo -e "${CYAN}📈 残り: ${remaining}行利用可能${NC}"
        return 0
    fi
}

# 行数制限の詳細レポート生成
generate_line_limit_report() {
    local output_dir="$1"
    local report_file="$output_dir/LINE_LIMIT_REPORT.md"
    local max_lines="${CLAUDEFLOW_MAX_LINES:-2000}"
    
    cat > "$report_file" << EOF
# 📏 行数制限レポート

**作成日時**: $(date '+%Y-%m-%d %H:%M:%S')  
**制限設定**: ${max_lines}行  
**プロジェクト**: $(basename "$output_dir")  

## 📊 ファイル別行数

| ファイル | 行数 | 割合 |
|---------|------|------|
EOF
    
    local total_lines=0
    local extensions=("html" "js" "css" "ts" "jsx" "tsx")
    
    for ext in "${extensions[@]}"; do
        for file in "$output_dir"/*."$ext"; do
            if [ -f "$file" ]; then
                local lines=$(count_file_lines "$file")
                local filename=$(basename "$file")
                local percent=$((lines * 100 / max_lines))
                total_lines=$((total_lines + lines))
                echo "| $filename | $lines | ${percent}% |" >> "$report_file"
            fi
        done
    done
    
    local total_percent=$((total_lines * 100 / max_lines))
    
    cat >> "$report_file" << EOF

## 📈 サマリー

- **総行数**: ${total_lines}行
- **制限**: ${max_lines}行
- **使用率**: ${total_percent}%
- **残り**: $((max_lines - total_lines))行

## 💡 最適化提案

EOF
    
    if [ "$total_lines" -gt "$max_lines" ]; then
        cat >> "$report_file" << EOF
### 🚨 制限超過 - 緊急対応必要

- **削減が必要**: $((total_lines - max_lines))行
- **推奨アクション**:
  1. 不要なコメント削除
  2. CSS/JS最小化
  3. 冗長な機能削除
  4. アルゴリズム効率化

EOF
    elif [ "$total_lines" -gt "$((max_lines * 80 / 100))" ]; then
        cat >> "$report_file" << EOF
### ⚠️ 警告レベル - 最適化推奨

- **推奨アクション**:
  1. コードレビューと効率化
  2. 重複コード削除
  3. 関数の統合
  4. 変数名の短縮化

EOF
    else
        cat >> "$report_file" << EOF
### ✅ 制限内 - 良好な状態

- **状況**: 制限内で適切に実装されています
- **余裕**: $((max_lines - total_lines))行の余裕があります

EOF
    fi
    
    echo -e "${GREEN}📄 詳細レポート生成: $report_file${NC}"
}

# モード別の行数制限設定
apply_mode_line_limits() {
    local mode="${CLAUDEFLOW_MODE:-standard}"
    
    case "$mode" in
        "ultra_light")
            export CLAUDEFLOW_MAX_LINES="${CLAUDEFLOW_MAX_LINES:-800}"
            echo -e "${CYAN}🚀 超軽量モード: 最大${CLAUDEFLOW_MAX_LINES}行${NC}"
            ;;
        "light")
            export CLAUDEFLOW_MAX_LINES="${CLAUDEFLOW_MAX_LINES:-1500}"
            echo -e "${YELLOW}⚡ 軽量モード: 最大${CLAUDEFLOW_MAX_LINES}行${NC}"
            ;;
        "standard")
            export CLAUDEFLOW_MAX_LINES="${CLAUDEFLOW_MAX_LINES:-2000}"
            echo -e "${BLUE}📋 標準モード: 最大${CLAUDEFLOW_MAX_LINES}行${NC}"
            ;;
        *)
            export CLAUDEFLOW_MAX_LINES="${CLAUDEFLOW_MAX_LINES:-2000}"
            echo -e "${BLUE}📋 デフォルトモード: 最大${CLAUDEFLOW_MAX_LINES}行${NC}"
            ;;
    esac
}

# ====================================
# CodeFit Design ユーザー協働システム
# ====================================

# 機能の行数見積もり
estimate_feature_lines() {
    local feature_type="$1"
    local complexity="$2"
    
    case "$feature_type" in
        "ui")
            case "$complexity" in
                "simple") echo 30 ;;
                "medium") echo 60 ;;
                "complex") echo 100 ;;
                *) echo 50 ;;
            esac
            ;;
        "logic")
            case "$complexity" in
                "simple") echo 50 ;;
                "medium") echo 100 ;;
                "complex") echo 200 ;;
                *) echo 80 ;;
            esac
            ;;
        "data")
            case "$complexity" in
                "simple") echo 40 ;;
                "medium") echo 80 ;;
                "complex") echo 150 ;;
                *) echo 60 ;;
            esac
            ;;
        "animation")
            case "$complexity" in
                "simple") echo 20 ;;
                "medium") echo 50 ;;
                "complex") echo 100 ;;
                *) echo 40 ;;
            esac
            ;;
        *)
            echo 50
            ;;
    esac
}

# インタラクティブ機能選択システム
interactive_feature_selection() {
    local max_lines="${CLAUDEFLOW_MAX_LINES:-2000}"
    local app_name="$1"
    local requirements_file="$2"
    
    echo -e "${CYAN}🎯 CodeFit Design 機能選択システム${NC}"
    echo -e "${BLUE}アプリ名: $app_name${NC}"
    echo -e "${BLUE}行数制限: $max_lines行${NC}"
    echo ""
    
    # 機能リストの初期化
    local features=()
    local feature_lines=()
    local feature_priorities=()
    local total_estimated_lines=0
    
    echo -e "${YELLOW}💡 制約内で実装する機能を一緒に選択しましょう${NC}"
    echo ""
    
    # 基本機能の提案
    local basic_features=(
        "基本UI:ui:simple:必須のユーザーインターフェース"
        "コア機能:logic:medium:アプリの中核となる機能"
        "データ処理:data:simple:基本的なデータ操作"
        "エラーハンドリング:logic:simple:エラー処理と例外対応"
    )
    
    # 拡張機能の提案
    local extended_features=(
        "アニメーション:animation:medium:視覚的効果とアニメーション"
        "高度なUI:ui:complex:リッチなユーザーインターフェース"
        "データ永続化:data:medium:データの保存と読み込み"
        "API連携:logic:complex:外部APIとの連携"
        "マルチユーザー:logic:complex:複数ユーザー対応"
        "パフォーマンス最適化:logic:medium:速度と効率の改善"
    )
    
    # 基本機能の自動選択
    echo -e "${GREEN}📋 基本機能（自動選択）${NC}"
    for feature in "${basic_features[@]}"; do
        IFS=':' read -r name type complexity desc <<< "$feature"
        lines=$(estimate_feature_lines "$type" "$complexity")
        features+=("$name")
        feature_lines+=("$lines")
        feature_priorities+=("高")
        total_estimated_lines=$((total_estimated_lines + lines))
        echo -e "${BLUE}  ✓ $name ($lines行) - $desc${NC}"
    done
    
    echo ""
    echo -e "${CYAN}現在の見積もり: ${total_estimated_lines}行 / ${max_lines}行${NC}"
    show_line_usage_bar "$total_estimated_lines" "$max_lines"
    echo ""
    
    # 拡張機能の対話的選択
    echo -e "${YELLOW}🚀 拡張機能選択（制限内で追加可能）${NC}"
    for feature in "${extended_features[@]}"; do
        IFS=':' read -r name type complexity desc <<< "$feature"
        lines=$(estimate_feature_lines "$type" "$complexity")
        projected_total=$((total_estimated_lines + lines))
        
        if [ "$projected_total" -le "$max_lines" ]; then
            echo -e "${BLUE}💫 $name ($lines行) - $desc${NC}"
            echo -e "${CYAN}   追加後: ${projected_total}行 / ${max_lines}行${NC}"
            echo -n "   この機能を追加しますか？ (y/N): "
            read -r choice
            
            if [[ "$choice" =~ ^[Yy]$ ]]; then
                features+=("$name")
                feature_lines+=("$lines")
                feature_priorities+=("中")
                total_estimated_lines=$projected_total
                echo -e "${GREEN}   ✅ 追加されました${NC}"
                show_line_usage_bar "$total_estimated_lines" "$max_lines"
            else
                echo -e "${YELLOW}   ⏭️ スキップされました${NC}"
            fi
        else
            echo -e "${RED}💥 $name ($lines行) - 制限を超過するため追加不可${NC}"
            echo -e "${YELLOW}   💡 他の機能を削除すれば追加可能です${NC}"
        fi
        echo ""
    done
    
    # 最終確認
    echo -e "${CYAN}🎯 最終的な機能選択${NC}"
    echo -e "${BLUE}総行数見積もり: ${total_estimated_lines}行 / ${max_lines}行${NC}"
    show_line_usage_bar "$total_estimated_lines" "$max_lines"
    echo ""
    
    for i in "${!features[@]}"; do
        echo -e "${GREEN}  ✓ ${features[i]} (${feature_lines[i]}行) - 優先度: ${feature_priorities[i]}${NC}"
    done
    
    echo ""
    echo -n "この機能選択で実装を開始しますか？ (Y/n): "
    read -r final_choice
    
    if [[ "$final_choice" =~ ^[Nn]$ ]]; then
        echo -e "${YELLOW}機能選択をキャンセルしました${NC}"
        return 1
    fi
    
    # 選択結果をファイルに保存
    save_feature_selection "$app_name" "$total_estimated_lines" "$max_lines" "features" "feature_lines" "feature_priorities"
    
    echo -e "${GREEN}✅ 機能選択が完了しました${NC}"
    return 0
}

# 行数使用量バーを表示
show_line_usage_bar() {
    local current_lines="$1"
    local max_lines="$2"
    local width=50
    
    local percent=$((current_lines * 100 / max_lines))
    local filled=$((current_lines * width / max_lines))
    local empty=$((width - filled))
    
    # 色選択
    local color=""
    if [ "$percent" -ge 90 ]; then
        color="$RED"
    elif [ "$percent" -ge 80 ]; then
        color="$YELLOW"
    else
        color="$GREEN"
    fi
    
    printf "  %s[" "$color"
    printf "%*s" $filled '' | tr ' ' '█'
    printf "%*s" $empty '' | tr ' ' '░'
    printf "] %d%% (%d/%d行)%s\n" $percent $current_lines $max_lines "$NC"
}

# 機能選択結果を保存
save_feature_selection() {
    local app_name="$1"
    local total_lines="$2"
    local max_lines="$3"
    local features_array_name="$4"
    local lines_array_name="$5"
    local priorities_array_name="$6"
    
    # 結果ディレクトリが存在しない場合は作成
    mkdir -p "$RESULTS_DIR"
    
    local selection_file="$RESULTS_DIR/codefit_feature_selection.md"
    
    cat > "$selection_file" << EOF
# CodeFit Design 機能選択結果

## プロジェクト情報
- **アプリ名**: $app_name
- **行数制限**: $max_lines行
- **見積もり総行数**: $total_lines行
- **使用率**: $((total_lines * 100 / max_lines))%
- **選択日時**: $(date '+%Y-%m-%d %H:%M:%S')

## 選択された機能

| 機能名 | 見積もり行数 | 優先度 | 説明 |
|--------|-------------|--------|------|
EOF
    
    # 配列の長さを取得
    local array_length=$(eval "echo \${#${features_array_name}[@]}")
    
    # 配列の各要素を処理
    for ((i=0; i<array_length; i++)); do
        local feature_name=$(eval "echo \${${features_array_name}[i]}")
        local feature_lines=$(eval "echo \${${lines_array_name}[i]}")
        local feature_priority=$(eval "echo \${${priorities_array_name}[i]}")
        echo "| $feature_name | ${feature_lines}行 | $feature_priority | - |" >> "$selection_file"
    done
    
    cat >> "$selection_file" << EOF

## CodeFit Design 原則

この選択は以下の原則に基づいて行われました：
- ✅ 制約内での最適化
- ✅ ユーザーとの協働
- ✅ 品質重視の設計
- ✅ 継続的改善の準備

## 実装指針

- **優先度「高」**: 必須機能として確実に実装
- **優先度「中」**: 制約内で実装、必要に応じて最適化
- **優先度「低」**: 余裕があれば実装、最適化対象

## 最適化提案

制限に近づいた場合の最適化案：
1. コメント削除による行数削減
2. CSS/JavaScript の効率化
3. 重複コードの統合
4. アルゴリズムの最適化
EOF
    
    echo -e "${GREEN}📄 機能選択結果保存: $selection_file${NC}"
}

# 自動機能選択システム
auto_select_features() {
    local app_name="$1"
    local requirements_file="$2"
    local max_lines="${CLAUDEFLOW_MAX_LINES:-2000}"
    
    echo -e "${CYAN}🤖 自動機能選択を実行中...${NC}"
    echo -e "${BLUE}アプリ名: $app_name${NC}"
    echo -e "${BLUE}行数制限: $max_lines行${NC}"
    echo ""
    
    # 機能リストの初期化
    local features=()
    local feature_lines=()
    local feature_priorities=()
    local total_estimated_lines=0
    
    # 基本機能の提案
    local basic_features=(
        "基本UI:ui:simple:必須のユーザーインターフェース"
        "コア機能:logic:medium:アプリの中核となる機能"
        "データ処理:data:simple:基本的なデータ操作"
        "エラーハンドリング:logic:simple:エラー処理と例外対応"
    )
    
    # 拡張機能の提案（エンターテイメント性重視の優先度順）
    local extended_features=(
        "アニメーション:animation:medium:視覚的効果とアニメーション"
        "高度なUI:ui:medium:リッチなユーザーインターフェース"
        "ゲームメカニクス:logic:medium:スコア・レベル・進歩システム"
        "インタラクティブ操作:ui:medium:ドラッグ&ドロップ・キー操作"
        "視覚エフェクト:animation:medium:パーティクル・トランジション"
        "データ永続化:data:medium:データの保存と読み込み"
        "パフォーマンス最適化:logic:medium:速度と効率の改善"
        "API連携:logic:complex:外部APIとの連携"
        "マルチユーザー:logic:complex:複数ユーザー対応"
    )
    
    # 基本機能を自動追加
    echo -e "${GREEN}📋 基本機能を追加中...${NC}"
    for feature in "${basic_features[@]}"; do
        IFS=':' read -r name type complexity desc <<< "$feature"
        lines=$(estimate_feature_lines "$type" "$complexity")
        features+=("$name")
        feature_lines+=("$lines")
        feature_priorities+=("高")
        total_estimated_lines=$((total_estimated_lines + lines))
        echo -e "${BLUE}  ✓ $name ($lines行) - $desc${NC}"
    done
    
    echo ""
    echo -e "${CYAN}基本機能小計: ${total_estimated_lines}行 / ${max_lines}行${NC}"
    show_line_usage_bar "$total_estimated_lines" "$max_lines"
    echo ""
    
    # 拡張機能を制限内で自動追加
    echo -e "${YELLOW}🚀 拡張機能を自動選択中...${NC}"
    local added_count=0
    for feature in "${extended_features[@]}"; do
        IFS=':' read -r name type complexity desc <<< "$feature"
        lines=$(estimate_feature_lines "$type" "$complexity")
        projected_total=$((total_estimated_lines + lines))
        
        if [ "$projected_total" -le "$max_lines" ]; then
            features+=("$name")
            feature_lines+=("$lines")
            feature_priorities+=("中")
            total_estimated_lines=$projected_total
            added_count=$((added_count + 1))
            echo -e "${GREEN}  ✓ $name ($lines行) - $desc [自動追加]${NC}"
            echo -e "${CYAN}     現在: ${total_estimated_lines}行 / ${max_lines}行${NC}"
        else
            echo -e "${YELLOW}  ⏭️ $name ($lines行) - 制限超過のためスキップ${NC}"
        fi
    done
    
    if [ "$added_count" -eq 0 ]; then
        echo -e "${YELLOW}  ⚠️ 追加可能な拡張機能はありませんでした${NC}"
    fi
    
    echo ""
    # 最終結果の表示
    echo -e "${CYAN}🎯 自動選択結果${NC}"
    echo -e "${BLUE}総行数見積もり: ${total_estimated_lines}行 / ${max_lines}行 ($((total_estimated_lines * 100 / max_lines))%)${NC}"
    show_line_usage_bar "$total_estimated_lines" "$max_lines"
    echo ""
    
    echo -e "${GREEN}選択された機能:${NC}"
    for i in "${!features[@]}"; do
        echo -e "${GREEN}  ✓ ${features[i]} (${feature_lines[i]}行) - 優先度: ${feature_priorities[i]}${NC}"
    done
    
    # 選択結果をファイルに保存
    save_feature_selection "$app_name" "$total_estimated_lines" "$max_lines" "features" "feature_lines" "feature_priorities"
    
    # features.jsonも生成
    generate_features_json "$app_name" "features" "feature_lines" "feature_priorities"
    
    echo ""
    echo -e "${GREEN}✅ 自動機能選択が完了しました${NC}"
    echo -e "${BLUE}💡 ヒント: 手動選択に戻すには CLAUDEFLOW_AUTO_FEATURES=false を設定してください${NC}"
    
    return 0
}

# features.json生成
generate_features_json() {
    local app_name="$1"
    local features_array_name="$2"
    local lines_array_name="$3"
    local priorities_array_name="$4"
    
    local features_file="$RESULTS_DIR/features.json"
    
    # JSON生成
    echo "{" > "$features_file"
    echo "  \"app_name\": \"$app_name\"," >> "$features_file"
    echo "  \"generated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$features_file"
    echo "  \"auto_selected\": true," >> "$features_file"
    echo "  \"features\": [" >> "$features_file"
    
    # 配列の長さを取得
    local array_length=$(eval "echo \${#${features_array_name}[@]}")
    
    # 配列の各要素を処理
    for ((i=0; i<array_length; i++)); do
        local feature_name=$(eval "echo \${${features_array_name}[i]}")
        local feature_lines=$(eval "echo \${${lines_array_name}[i]}")
        local feature_priority=$(eval "echo \${${priorities_array_name}[i]}")
        
        echo -n "    {" >> "$features_file"
        echo -n "\"name\": \"$feature_name\", " >> "$features_file"
        echo -n "\"estimated_lines\": $feature_lines, " >> "$features_file"
        echo -n "\"priority\": \"$feature_priority\"" >> "$features_file"
        
        if [ $i -lt $((array_length - 1)) ]; then
            echo "}," >> "$features_file"
        else
            echo "}" >> "$features_file"
        fi
    done
    
    echo "  ]" >> "$features_file"
    echo "}" >> "$features_file"
    
    echo -e "${GREEN}📄 features.json生成: $features_file${NC}"
}

# リアルタイム制約フィードバック
show_realtime_constraints() {
    local current_lines="$1"
    local max_lines="${CLAUDEFLOW_MAX_LINES:-2000}"
    local warning_threshold="${CLAUDEFLOW_WARNING_THRESHOLD:-80}"
    
    local percent=$((current_lines * 100 / max_lines))
    local warning_limit=$((max_lines * warning_threshold / 100))
    
    echo -e "${CYAN}📊 リアルタイム制約状況${NC}"
    show_line_usage_bar "$current_lines" "$max_lines"
    
    if [ "$current_lines" -gt "$max_lines" ]; then
        echo -e "${RED}🚨 制限超過！緊急対応が必要です${NC}"
        echo -e "${YELLOW}💡 提案: 機能削減または最適化を実行してください${NC}"
        return 1
    elif [ "$current_lines" -gt "$warning_limit" ]; then
        echo -e "${YELLOW}⚠️ 警告域に到達しました${NC}"
        echo -e "${BLUE}💡 提案: 早期の最適化を検討してください${NC}"
        return 2
    else
        echo -e "${GREEN}✅ 制約内で順調です${NC}"
        local remaining=$((max_lines - current_lines))
        echo -e "${CYAN}📈 残り: ${remaining}行利用可能${NC}"
        return 0
    fi
}

# CodeFit Design 協働プロンプト生成
generate_codefit_prompt() {
    local app_name="$1"
    local max_lines="${CLAUDEFLOW_MAX_LINES:-2000}"
    
    # 結果ディレクトリが存在しない場合は作成
    mkdir -p "$RESULTS_DIR"
    
    local selection_file="$RESULTS_DIR/codefit_feature_selection.md"
    
    cat << EOF
# CodeFit Design 協働実装プロンプト

## アプリ名
$app_name

## CodeFit Design 制約
- **最大行数**: $max_lines行
- **品質優先**: 機能数より使いやすさと安定性を重視
- **効率重視**: 無駄のないコンパクトなコード
- **保守性**: 将来の改善を考慮した設計

## 機能選択結果
$([ -f "$selection_file" ] && cat "$selection_file" || echo "機能選択が実行されていません")

## 実装指針
1. **制約遵守**: 絶対に$max_lines行を超えない
2. **品質重視**: 動作確認済みの安定したコード
3. **効率化**: CSS/JavaScript の最適化
4. **協働精神**: ユーザーとの対話を重視

## 最適化戦略
- 不要なコメント削除
- 効率的なアルゴリズム選択
- CSS/JS の統合と最小化
- 冗長なコードの削除

この制約の中で、最高品質のアプリを一緒に作りましょう！
EOF
}

# ====================================
# コード検証機能
# ====================================

# ファイルの検証を実行
validate_code_file() {
    local file="$1"
    local report_file="${2:-}"
    local auto_fix="${3:-false}"
    
    # auto-validate.shを呼び出す
    local validation_script="$SCRIPT_DIR/auto-validate.sh"
    if [ -f "$validation_script" ]; then
        if [ -n "$report_file" ]; then
            "$validation_script" "$file" -o "$report_file"
        else
            "$validation_script" "$file"
        fi
        return $?
    else
        log_warning "検証スクリプトが見つかりません: $validation_script"
        return 1
    fi
}

# 構文チェック関数
validate_syntax() {
    local file="$1"
    local language="${2:-auto}"
    
    if [ "$language" = "auto" ]; then
        # 拡張子から言語を推測
        case "${file##*.}" in
            js|jsx) language="javascript" ;;
            ts|tsx) language="typescript" ;;
            py) language="python" ;;
            html) language="html" ;;
            *) language="unknown" ;;
        esac
    fi
    
    case "$language" in
        javascript|typescript)
            if command -v node &> /dev/null; then
                node -c "$file" 2>&1
                return $?
            fi
            ;;
        python)
            if command -v python3 &> /dev/null; then
                python3 -m py_compile "$file" 2>&1
                return $?
            fi
            ;;
        html)
            # HTMLの基本的な検証
            if grep -q "<!DOCTYPE" "$file" && grep -q "</html>" "$file"; then
                return 0
            else
                echo "HTML構造エラー: DOCTYPEまたは終了タグが見つかりません"
                return 1
            fi
            ;;
    esac
    
    return 0
}

# ランタイムエラー検出
validate_runtime() {
    local file="$1"
    local validation_dir="$PROJECT_ROOT/validation"
    local patterns_file="$validation_dir/patterns/error-patterns.json"
    
    if [ ! -f "$patterns_file" ]; then
        log_warning "エラーパターンファイルが見つかりません"
        return 1
    fi
    
    # Pythonでパターンマッチング
    python3 -c "
import json
import re

with open('$patterns_file', 'r') as f:
    patterns = json.load(f)

with open('$file', 'r') as f:
    content = f.read()

errors = 0
for category in patterns.values():
    for pattern_info in category.values():
        if isinstance(pattern_info, dict) and 'pattern' in pattern_info:
            try:
                if re.search(pattern_info['pattern'], content):
                    print(f\"[{pattern_info.get('severity', 'warning')}] {pattern_info.get('message', 'エラー検出')}]\")
                    if pattern_info.get('severity') in ['error', 'critical']:
                        errors += 1
            except:
                pass

exit(errors)
"
}

# セキュリティチェック
validate_security() {
    local file="$1"
    
    # 基本的なセキュリティパターンチェック
    local security_issues=0
    
    # ハードコードされた認証情報
    if grep -q -E "(password|secret|key|token)\s*=\s*[\"'][^\"']+[\"']" "$file"; then
        echo "[CRITICAL] ハードコードされた認証情報が検出されました"
        ((security_issues++))
    fi
    
    # SQLインジェクションの可能性
    if grep -q -E "query.*\+.*\$|query.*\+.*request\." "$file"; then
        echo "[ERROR] SQLインジェクションの可能性があります"
        ((security_issues++))
    fi
    
    # XSSの可能性
    if grep -q -E "innerHTML\s*=.*\$|innerHTML\s*=.*request\." "$file"; then
        echo "[ERROR] XSSの可能性があります"
        ((security_issues++))
    fi
    
    return $security_issues
}

# ベストプラクティスチェック
validate_best_practices() {
    local file="$1"
    local warnings=0
    
    # console.logの使用
    if grep -q "console\.log" "$file"; then
        echo "[INFO] console.logが使用されています - 本番環境では削除してください"
        ((warnings++))
    fi
    
    # any型の使用（TypeScript）
    if [[ "$file" =~ \.(ts|tsx)$ ]] && grep -q ":\s*any" "$file"; then
        echo "[WARNING] any型が使用されています - 具体的な型を指定してください"
        ((warnings++))
    fi
    
    return 0
}

# 実装フェーズでの自動検証
validate_implementation() {
    local impl_dir="$1"
    local report_dir="${2:-$impl_dir/validation-reports}"
    
    mkdir -p "$report_dir"
    
    log_info "実装の検証を開始..."
    
    local total_errors=0
    local total_warnings=0
    
    # すべてのコードファイルを検証
    for file in "$impl_dir"/**/*.{js,ts,jsx,tsx,html,py} "$impl_dir"/*.{js,ts,jsx,tsx,html,py}; do
        if [ -f "$file" ]; then
            local basename=$(basename "$file")
            local report_file="$report_dir/validation_${basename%.}.txt"
            
            echo "検証中: $file"
            
            # 各種検証を実行
            {
                echo "=== 検証レポート: $basename ==="
                echo "実行日時: $(date)"
                echo ""
                
                echo "## 構文チェック"
                if validate_syntax "$file"; then
                    echo "✅ 構文エラーなし"
                else
                    echo "❌ 構文エラーあり"
                    ((total_errors++))
                fi
                echo ""
                
                echo "## ランタイムエラーチェック"
                validate_runtime "$file"
                echo ""
                
                echo "## セキュリティチェック"
                if validate_security "$file"; then
                    echo "✅ セキュリティ問題なし"
                else
                    ((total_errors++))
                fi
                echo ""
                
                echo "## ベストプラクティスチェック"
                validate_best_practices "$file"
                
            } > "$report_file"
            
            # サマリー表示
            if grep -q "❌\|ERROR\|CRITICAL" "$report_file"; then
                echo -e "${RED}  ❌ エラーあり${NC}"
            else
                echo -e "${GREEN}  ✅ 検証合格${NC}"
            fi
        fi
    done
    
    # 総合レポート作成
    local summary_file="$report_dir/validation_summary.md"
    {
        echo "# 実装検証サマリー"
        echo ""
        echo "- 実行日時: $(date)"
        echo "- エラー数: $total_errors"
        echo "- 警告数: $total_warnings"
        echo ""
        echo "## 詳細レポート"
        for report in "$report_dir"/validation_*.txt; do
            if [ -f "$report" ]; then
                echo "- [$(basename "$report")]($(basename "$report"))"
            fi
        done
    } > "$summary_file"
    
    log_success "検証完了: $summary_file"
    
    return $total_errors
}

# 自動修正提案
suggest_fixes() {
    local file="$1"
    local issues_file="$2"
    
    log_info "修正提案を生成中..."
    
    # エラーパターンから修正提案を生成
    # この機能は将来的に拡張予定
    echo "修正提案機能は開発中です"
}