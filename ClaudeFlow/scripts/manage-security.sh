#!/bin/bash

# UTF-8エンコーディングを強制
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# ClaudeFlow セキュリティ管理スクリプト
# 認証情報の生成、管理、参照を行う

set -e

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# ヘルプ表示
show_help() {
    echo "ClaudeFlow セキュリティ管理ツール"
    echo ""
    echo "使用方法:"
    echo "  $0 [コマンド] [オプション]"
    echo ""
    echo "コマンド:"
    echo "  generate-env [サービス名]     - 環境変数ファイルを生成"
    echo "  generate-password [長さ]      - ランダムパスワードを生成"
    echo "  generate-jwt                  - JWTシークレットを生成"
    echo "  generate-db-password [長さ]   - データベースパスワードを生成"
    echo "  show-credentials              - 保存された認証情報を表示"
    echo "  enable-auto-auth              - 自動認証を有効化"
    echo "  disable-auto-auth             - 自動認証を無効化"
    echo "  clear-credentials             - 保存された認証情報をクリア"
    echo "  backup-credentials [ファイル] - 認証情報をバックアップ"
    echo "  restore-credentials [ファイル]- 認証情報を復元"
    echo "  help                          - このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0 generate-env MyApp"
    echo "  $0 generate-password 20"
    echo "  $0 show-credentials"
}

# 自動認証設定の切り替え
toggle_auto_auth() {
    local enable="$1"
    local config_file="$PROJECT_ROOT/.claudeflow_config"
    
    if [ "$enable" = "true" ]; then
        echo "AUTO_APPROVE_ENABLED=true" > "$config_file"
        log_success "自動認証を有効化しました"
        log_warning "セキュリティリスクを理解して使用してください"
    else
        echo "AUTO_APPROVE_ENABLED=false" > "$config_file"
        log_success "自動認証を無効化しました"
    fi
}

# 認証情報のバックアップ
backup_credentials() {
    local backup_file="${1:-$PROJECT_ROOT/security/credentials_backup_$(date +%Y%m%d_%H%M%S).md}"
    
    if [ -f "$SECURITY_LOG_FILE" ]; then
        cp "$SECURITY_LOG_FILE" "$backup_file"
        log_success "認証情報をバックアップしました: $backup_file"
    else
        log_error "バックアップする認証情報がありません"
        return 1
    fi
}

# 認証情報の復元
restore_credentials() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "バックアップファイルが見つかりません: $backup_file"
        return 1
    fi
    
    init_security_dir
    cp "$backup_file" "$SECURITY_LOG_FILE"
    log_success "認証情報を復元しました: $backup_file"
}

# 認証情報のクリア
clear_credentials() {
    echo -n "保存された認証情報をクリアしますか？ [y/N]: "
    read -r confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        if [ -f "$SECURITY_LOG_FILE" ]; then
            # バックアップを作成
            backup_credentials "$PROJECT_ROOT/security/credentials_backup_before_clear_$(date +%Y%m%d_%H%M%S).md"
            
            # ファイルを削除
            rm -f "$SECURITY_LOG_FILE"
            log_success "認証情報をクリアしました"
            log_info "バックアップは security/ ディレクトリに保存されています"
        else
            log_info "クリアする認証情報がありません"
        fi
    else
        log_info "キャンセルしました"
    fi
}

# 保存された認証情報を表示
show_stored_credentials() {
    if [ -f "$SECURITY_LOG_FILE" ]; then
        echo -e "${CYAN}=== 保存された認証情報 ===${NC}"
        cat "$SECURITY_LOG_FILE"
        echo -e "${CYAN}========================${NC}"
        
        # ファイルサイズとエントリ数を表示
        local file_size=$(wc -c < "$SECURITY_LOG_FILE")
        local entry_count=$(grep -c "^## " "$SECURITY_LOG_FILE" 2>/dev/null || echo "0")
        echo -e "${YELLOW}ファイルサイズ: ${file_size} bytes, エントリ数: ${entry_count}${NC}"
    else
        log_info "保存された認証情報がありません"
        log_info "ClaudeFlowを実行すると自動的に認証情報が生成されます"
    fi
}

# メイン処理
main() {
    local command="${1:-help}"
    
    case "$command" in
        "generate-env")
            local service_name="${2:-ClaudeFlowApp}"
            generate_env_file "$PROJECT_ROOT/.env.example" "$service_name"
            ;;
        "generate-password")
            local length="${2:-16}"
            password=$(generate_password "$length")
            echo "生成されたパスワード: $password"
            log_credential "Manual" "Generated Password" "$password" "手動生成パスワード (長さ: $length)"
            ;;
        "generate-jwt")
            jwt_secret=$(generate_jwt_secret)
            echo "生成されたJWTシークレット: $jwt_secret"
            log_credential "Manual" "JWT Secret" "$jwt_secret" "手動生成JWTシークレット"
            ;;
        "generate-db-password")
            local length="${2:-32}"
            db_password=$(generate_db_password "$length")
            echo "生成されたDBパスワード: $db_password"
            log_credential "Manual" "Database Password" "$db_password" "手動生成データベースパスワード (長さ: $length)"
            ;;
        "show-credentials")
            show_stored_credentials
            ;;
        "enable-auto-auth")
            toggle_auto_auth true
            ;;
        "disable-auto-auth")
            toggle_auto_auth false
            ;;
        "clear-credentials")
            clear_credentials
            ;;
        "backup-credentials")
            backup_credentials "$2"
            ;;
        "restore-credentials")
            if [ -z "$2" ]; then
                log_error "復元するバックアップファイルを指定してください"
                echo "使用方法: $0 restore-credentials <バックアップファイル>"
                exit 1
            fi
            restore_credentials "$2"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "不明なコマンド: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"