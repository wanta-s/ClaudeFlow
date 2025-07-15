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

# 自動認証機能（Claudeコマンド実行時）
run_claude_auto_auth() {
    local input="$1"
    local output_file="$2"
    local phase_name="${3:-処理}"
    
    if [ "$AUTO_APPROVE_ENABLED" = true ]; then
        log_info "自動認証モードでClaude実行: $phase_name"
        
        # 必要な認証情報を自動生成
        if echo "$input" | grep -q -i "password\|auth\|jwt\|secret\|key"; then
            log_warning "認証関連の処理を検出しました。必要に応じて認証情報を自動生成します。"
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
    
    log_info "プロジェクト構造を作成中: $project_name ($project_type)"
    
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
    
    log_success "プロジェクト構造作成完了: $project_dir"
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
    
    log_info "プロジェクトファイルを生成中: $project_type"
    
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
    
    log_info "統一プロジェクト作成完了:"
    log_info "  名前: $project_name"
    log_info "  タイプ: $project_type"
    log_info "  場所: $project_dir"
    
    echo "$project_dir"
}