#!/bin/bash

# UTF-8エンコーディングを強制
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# ClaudeFlow 開発フォルダクリーンアップスクリプト
# 開発で生成されたファイルを安全に削除し、プロジェクトを初期状態に戻す

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# プロジェクトルート
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 削除対象ディレクトリとファイルの定義
declare -a CLEANUP_TARGETS=(
    "implementation"
    "results"
    "security"
    ".env"
    ".env.local"
    ".env.example"
    ".claudeflow_config"
)

# 大規模開発フォルダ（親ディレクトリレベル）
declare -a LARGE_CLEANUP_TARGETS=(
    "../implementation"
    "../results"
    "../minimal-app"
    "../task-management-app"
    "../tests"
    "../*.log"
)

# 保護対象ディレクトリ（削除しない）
declare -a PROTECTED_DIRS=(
    "scripts"
    "tasks"
    "prompts"
    "templates"
    "docs"
    ".git"
)

# ヘルプ表示
show_help() {
    echo -e "${CYAN}ClaudeFlow 開発フォルダクリーンアップツール${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --dry-run, -n     削除対象を表示するのみ（実際には削除しない）"
    echo "  --force, -f       確認なしで削除を実行"
    echo "  --backup, -b      削除前にバックアップを作成"
    echo "  --minimal-backup  node_modulesを除外した最小バックアップ"
    echo "  --help, -h        このヘルプを表示"
    echo ""
    echo "削除対象（ClaudeFlowフォルダ内）:"
    for target in "${CLEANUP_TARGETS[@]}"; do
        echo "  - $target"
    done
    echo ""
    echo "削除対象（親フォルダレベル）:"
    for target in "${LARGE_CLEANUP_TARGETS[@]}"; do
        echo "  - $target"
    done
    echo ""
    echo "保護対象（削除されません）:"
    for protected in "${PROTECTED_DIRS[@]}"; do
        echo "  - $protected"
    done
}

# バックアップ作成
create_backup() {
    local backup_type="${1:-full}"
    local backup_dir="$PROJECT_ROOT/backup_$(date +%Y%m%d_%H%M%S)"
    local parent_dir="$(dirname "$PROJECT_ROOT")"
    
    log_info "バックアップを作成中: $backup_dir (タイプ: $backup_type)"
    mkdir -p "$backup_dir"
    mkdir -p "$backup_dir/parent"
    
    # ClaudeFlowフォルダ内のファイル
    for target in "${CLEANUP_TARGETS[@]}"; do
        local target_path="$PROJECT_ROOT/$target"
        if [ -e "$target_path" ]; then
            cp -r "$target_path" "$backup_dir/" 2>/dev/null || true
            log_info "バックアップ: $target -> $backup_dir/"
        fi
    done
    
    # 親フォルダレベルのファイル
    for target in "${LARGE_CLEANUP_TARGETS[@]}"; do
        local target_path="$PROJECT_ROOT/$target"
        if [ -e "$target_path" ]; then
            # *.logパターンの処理
            if [[ "$target" == *"*.log"* ]]; then
                find "$parent_dir" -name "*.log" -maxdepth 1 2>/dev/null | while read -r logfile; do
                    cp "$logfile" "$backup_dir/parent/" 2>/dev/null || true
                done
            else
                local basename=$(basename "$target")
                if [ "$backup_type" = "minimal" ]; then
                    # node_modulesを除外してバックアップ
                    log_info "最小バックアップ: $target (node_modules除外)"
                    rsync -av --exclude='node_modules' --exclude='package-lock.json' "$target_path" "$backup_dir/parent/" 2>/dev/null || {
                        # rsyncがない場合はtarを使用
                        tar --exclude='node_modules' --exclude='package-lock.json' -cf - -C "$(dirname "$target_path")" "$(basename "$target_path")" 2>/dev/null | tar -xf - -C "$backup_dir/parent/" 2>/dev/null || {
                            # tarでも失敗する場合は手動でコピー（node_modules以外）
                            mkdir -p "$backup_dir/parent/$(basename "$target_path")"
                            find "$target_path" -type f ! -path "*/node_modules/*" ! -name "package-lock.json" 2>/dev/null | while read -r file; do
                                local rel_path="${file#$target_path/}"
                                local dest_dir="$backup_dir/parent/$(basename "$target_path")/$(dirname "$rel_path")"
                                mkdir -p "$dest_dir" 2>/dev/null
                                cp "$file" "$dest_dir/" 2>/dev/null || true
                            done
                        }
                    }
                else
                    # 完全バックアップ
                    cp -r "$target_path" "$backup_dir/parent/" 2>/dev/null || true
                    log_info "バックアップ: $target -> $backup_dir/parent/"
                fi
            fi
        fi
    done
    
    # バックアップサイズを表示
    local backup_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1 || echo "不明")
    log_success "バックアップ完了: $backup_dir (サイズ: $backup_size)"
}

# 削除対象のサイズを計算
calculate_cleanup_size() {
    local total_size=0
    local total_files=0
    local parent_dir="$(dirname "$PROJECT_ROOT")"
    
    # ClaudeFlowフォルダ内のファイル
    for target in "${CLEANUP_TARGETS[@]}"; do
        local target_path="$PROJECT_ROOT/$target"
        if [ -e "$target_path" ]; then
            if [ -d "$target_path" ]; then
                local dir_size=$(du -sb "$target_path" 2>/dev/null | cut -f1 || echo "0")
                local file_count=$(find "$target_path" -type f 2>/dev/null | wc -l || echo "0")
                total_size=$((total_size + dir_size))
                total_files=$((total_files + file_count))
            elif [ -f "$target_path" ]; then
                local file_size=$(stat -c%s "$target_path" 2>/dev/null || echo "0")
                total_size=$((total_size + file_size))
                total_files=$((total_files + 1))
            fi
        fi
    done
    
    # 親フォルダレベルのファイル
    for target in "${LARGE_CLEANUP_TARGETS[@]}"; do
        local target_path="$PROJECT_ROOT/$target"
        if [ -e "$target_path" ]; then
            if [[ "$target" == *"*.log"* ]]; then
                # *.logファイルのサイズを計算
                find "$parent_dir" -name "*.log" -maxdepth 1 2>/dev/null | while read -r logfile; do
                    local file_size=$(stat -c%s "$logfile" 2>/dev/null || echo "0")
                    total_size=$((total_size + file_size))
                    total_files=$((total_files + 1))
                done
            elif [ -d "$target_path" ]; then
                local dir_size=$(du -sb "$target_path" 2>/dev/null | cut -f1 || echo "0")
                local file_count=$(find "$target_path" -type f 2>/dev/null | wc -l || echo "0")
                total_size=$((total_size + dir_size))
                total_files=$((total_files + file_count))
            elif [ -f "$target_path" ]; then
                local file_size=$(stat -c%s "$target_path" 2>/dev/null || echo "0")
                total_size=$((total_size + file_size))
                total_files=$((total_files + 1))
            fi
        fi
    done
    
    echo "$total_files:$total_size"
}

# 削除対象を表示
show_cleanup_targets() {
    echo -e "\n${CYAN}=== 削除対象の確認 ===${NC}"
    
    local found_targets=()
    local total_info=$(calculate_cleanup_size)
    local total_files=$(echo "$total_info" | cut -d: -f1)
    local total_size=$(echo "$total_info" | cut -d: -f2)
    local parent_dir="$(dirname "$PROJECT_ROOT")"
    
    echo -e "${BLUE}ClaudeFlowフォルダ内:${NC}"
    for target in "${CLEANUP_TARGETS[@]}"; do
        local target_path="$PROJECT_ROOT/$target"
        if [ -e "$target_path" ]; then
            found_targets+=("$target")
            if [ -d "$target_path" ]; then
                local file_count=$(find "$target_path" -type f 2>/dev/null | wc -l || echo "0")
                local dir_size=$(du -sh "$target_path" 2>/dev/null | cut -f1 || echo "不明")
                echo -e "${YELLOW}  📁 $target/${NC} ($file_count ファイル, $dir_size)"
            elif [ -f "$target_path" ]; then
                local file_size=$(du -sh "$target_path" 2>/dev/null | cut -f1 || echo "不明")
                echo -e "${YELLOW}  📄 $target${NC} ($file_size)"
            fi
        fi
    done
    
    echo -e "\n${BLUE}親フォルダレベル:${NC}"
    for target in "${LARGE_CLEANUP_TARGETS[@]}"; do
        local target_path="$PROJECT_ROOT/$target"
        if [ -e "$target_path" ]; then
            found_targets+=("$target")
            if [[ "$target" == *"*.log"* ]]; then
                local log_count=$(find "$parent_dir" -name "*.log" -maxdepth 1 2>/dev/null | wc -l || echo "0")
                if [ "$log_count" -gt 0 ]; then
                    echo -e "${YELLOW}  📄 *.log ファイル${NC} ($log_count ファイル)"
                fi
            elif [ -d "$target_path" ]; then
                local file_count=$(find "$target_path" -type f 2>/dev/null | wc -l || echo "0")
                local dir_size=$(du -sh "$target_path" 2>/dev/null | cut -f1 || echo "不明")
                echo -e "${YELLOW}  📁 $(basename "$target")/${NC} ($file_count ファイル, $dir_size)"
            elif [ -f "$target_path" ]; then
                local file_size=$(du -sh "$target_path" 2>/dev/null | cut -f1 || echo "不明")
                echo -e "${YELLOW}  📄 $(basename "$target")${NC} ($file_size)"
            fi
        fi
    done
    
    if [ ${#found_targets[@]} -eq 0 ]; then
        echo -e "${GREEN}削除対象のファイル・フォルダは見つかりませんでした${NC}"
        echo -e "${GREEN}プロジェクトは既にクリーンな状態です${NC}"
        return 1
    else
        echo -e "\n${MAGENTA}合計: $total_files ファイル, $(numfmt --to=iec --suffix=B $total_size)${NC}"
        echo -e "${CYAN}========================${NC}"
        return 0
    fi
}

# 安全性チェック
safety_check() {
    # 現在のディレクトリがClaudeFlowプロジェクトかチェック
    if [ ! -f "$PROJECT_ROOT/scripts/run-pipeline.sh" ] || [ ! -d "$PROJECT_ROOT/tasks" ]; then
        log_error "ClaudeFlowプロジェクトディレクトリではありません"
        log_error "現在のディレクトリ: $PROJECT_ROOT"
        exit 1
    fi
    
    # 重要なファイルが存在するかチェック
    if [ ! -f "$PROJECT_ROOT/README.md" ]; then
        log_warning "README.mdが見つかりません。正しいディレクトリか確認してください"
    fi
}

# 実際の削除実行
perform_cleanup() {
    local dry_run="$1"
    local backup_created="$2"
    local parent_dir="$(dirname "$PROJECT_ROOT")"
    
    if [ "$dry_run" = "true" ]; then
        log_info "DRY RUN モード: 実際の削除は行いません"
        return 0
    fi
    
    log_info "クリーンアップを開始します..."
    
    local deleted_count=0
    local error_count=0
    
    echo -e "${BLUE}ClaudeFlowフォルダ内のクリーンアップ:${NC}"
    for target in "${CLEANUP_TARGETS[@]}"; do
        local target_path="$PROJECT_ROOT/$target"
        if [ -e "$target_path" ]; then
            echo -n "  削除中: $target ... "
            if rm -rf "$target_path" 2>/dev/null; then
                echo -e "${GREEN}完了${NC}"
                deleted_count=$((deleted_count + 1))
            else
                echo -e "${RED}失敗${NC}"
                error_count=$((error_count + 1))
            fi
        fi
    done
    
    echo -e "\n${BLUE}親フォルダレベルのクリーンアップ:${NC}"
    for target in "${LARGE_CLEANUP_TARGETS[@]}"; do
        local target_path="$PROJECT_ROOT/$target"
        if [ -e "$target_path" ]; then
            if [[ "$target" == *"*.log"* ]]; then
                echo -n "  削除中: *.log ファイル ... "
                local log_deleted=0
                find "$parent_dir" -name "*.log" -maxdepth 1 2>/dev/null | while read -r logfile; do
                    rm -f "$logfile" 2>/dev/null && log_deleted=$((log_deleted + 1))
                done
                echo -e "${GREEN}完了${NC}"
                deleted_count=$((deleted_count + 1))
            else
                local basename=$(basename "$target")
                echo -n "  削除中: $basename ... "
                if rm -rf "$target_path" 2>/dev/null; then
                    echo -e "${GREEN}完了${NC}"
                    deleted_count=$((deleted_count + 1))
                else
                    echo -e "${RED}失敗${NC}"
                    error_count=$((error_count + 1))
                fi
            fi
        fi
    done
    
    # 一時ファイルも削除
    echo -e "\n${BLUE}一時ファイルのクリーンアップ:${NC}"
    find "$PROJECT_ROOT" -name "*.tmp" -o -name ".temp_*" -o -name "claude_output_*.log" 2>/dev/null | while read -r temp_file; do
        rm -f "$temp_file" 2>/dev/null || true
    done
    find "$parent_dir" -name "*.tmp" -o -name ".temp_*" -o -name "claude_output_*.log" -maxdepth 1 2>/dev/null | while read -r temp_file; do
        rm -f "$temp_file" 2>/dev/null || true
    done
    
    echo ""
    if [ $error_count -eq 0 ]; then
        log_success "クリーンアップが完了しました！"
        log_info "削除したアイテム: $deleted_count"
        if [ "$backup_created" = "true" ]; then
            log_info "バックアップが作成されているので、必要に応じて復元できます"
        fi
    else
        log_warning "クリーンアップが完了しましたが、$error_count 個のエラーが発生しました"
        log_info "削除できたアイテム: $deleted_count"
    fi
}

# メイン処理
main() {
    local dry_run="false"
    local force="false"
    local backup="false"
    local backup_type="full"
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run|-n)
                dry_run="true"
                shift
                ;;
            --force|-f)
                force="true"
                shift
                ;;
            --backup|-b)
                backup="true"
                shift
                ;;
            --minimal-backup)
                backup="true"
                backup_type="minimal"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "不明なオプション: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # ヘッダー表示
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}  ClaudeFlow クリーンアップツール  ${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
    
    # 安全性チェック
    safety_check
    
    # 削除対象を表示
    if ! show_cleanup_targets; then
        exit 0
    fi
    
    # バックアップ作成
    if [ "$backup" = "true" ]; then
        create_backup "$backup_type"
        backup_created="true"
    else
        backup_created="false"
    fi
    
    # 確認プロンプト（forceモードでない場合）
    if [ "$force" = "false" ] && [ "$dry_run" = "false" ]; then
        echo ""
        echo -e "${YELLOW}⚠️  警告: この操作は元に戻せません${NC}"
        echo -e "${YELLOW}上記のファイル・フォルダを削除しますか？${NC}"
        echo -n "続行しますか？ [y/N]: "
        read -r confirm
        
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            log_info "キャンセルしました"
            exit 0
        fi
    fi
    
    # クリーンアップ実行
    perform_cleanup "$dry_run" "$backup_created"
    
    if [ "$dry_run" = "false" ]; then
        echo ""
        echo -e "${GREEN}プロジェクトがクリーンな状態に戻りました${NC}"
        echo -e "${CYAN}新しいプロジェクトを開始するには:${NC}"
        echo -e "${CYAN}  ./scripts/run-pipeline.sh${NC}"
    fi
}

# スクリプト実行
main "$@"