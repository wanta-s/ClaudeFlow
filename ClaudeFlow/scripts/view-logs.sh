#!/bin/bash

# ログビューアスクリプト

# 共通関数を読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# 使用方法の表示
show_usage() {
    cat << EOF
使用方法: $0 [オプション]

オプション:
    -l, --latest         最新のログファイルを表示（デフォルト）
    -a, --all            すべてのログファイルをリスト表示
    -f, --file <file>    特定のログファイルを表示
    -e, --errors         エラーのみ表示
    -s, --summary        サマリー表示
    -p, --progress       進捗CSVを表示
    -t, --tail <n>       最後のn行のみ表示
    -g, --grep <pattern> パターンでフィルタリング
    -h, --help           このヘルプを表示

例:
    $0                   # 最新のログを表示
    $0 --errors          # 最新のログからエラーのみ表示
    $0 --summary         # 実行サマリーを表示
    $0 --grep "feature_001" # feature_001に関するログのみ表示
EOF
}

# 最新のログファイルを取得
get_latest_log() {
    if [ -d "$LOG_DIR" ]; then
        ls -t "$LOG_DIR"/execution_*.log 2>/dev/null | head -1
    fi
}

# ログファイルのリスト表示
list_logs() {
    echo -e "${CYAN}=== ログファイル一覧 ===${NC}"
    if [ -d "$LOG_DIR" ]; then
        ls -la "$LOG_DIR"/*.log 2>/dev/null | awk '{print $9, $5, $6, $7, $8}'
    else
        echo "ログディレクトリが存在しません: $LOG_DIR"
    fi
}

# エラーのみ表示
show_errors() {
    local log_file="$1"
    echo -e "${RED}=== エラーログ ===${NC}"
    grep -E "\[ERROR\]|\[CLAUDE_API\] ERROR" "$log_file" -A 3
}

# サマリー表示
show_summary() {
    local log_file="$1"
    echo -e "${CYAN}=== 実行サマリー ===${NC}"
    
    # 開始時刻と終了時刻を取得
    local start_time=$(grep "開始時刻:" "$log_file" | head -1 | cut -d' ' -f2-)
    local last_timestamp=$(grep -E "^\[" "$log_file" | tail -1 | cut -d']' -f1 | tr -d '[')
    
    echo "開始時刻: $start_time"
    echo "最終更新: $last_timestamp"
    echo ""
    
    # ステータス別カウント
    echo "ステータス別カウント:"
    echo "  成功: $(grep -c "\[SUCCESS\]" "$log_file")"
    echo "  エラー: $(grep -c "\[ERROR\]" "$log_file")"
    echo "  警告: $(grep -c "\[WARNING\]" "$log_file")"
    echo "  リトライ: $(grep -c "\[RETRY\]" "$log_file")"
    echo ""
    
    # Claude API呼び出し統計
    echo "Claude API呼び出し:"
    echo "  成功: $(grep -c "\[CLAUDE_API\] SUCCESS" "$log_file")"
    echo "  失敗: $(grep -c "\[CLAUDE_API\] ERROR" "$log_file")"
    echo ""
    
    # 機能実装統計
    echo "機能実装:"
    local total_features=$(grep -c "機能実装:.*\[START\]" "$log_file")
    local completed_features=$(grep -c "機能実装:.*\[SUCCESS\]" "$log_file")
    echo "  開始: $total_features"
    echo "  完了: $completed_features"
    echo "  進行中: $((total_features - completed_features))"
}

# 進捗CSV表示
show_progress() {
    if [ -f "$PROGRESS_CSV" ]; then
        echo -e "${CYAN}=== 実装進捗 ===${NC}"
        column -t -s',' "$PROGRESS_CSV" | head -20
        
        echo ""
        echo "統計:"
        local total=$(tail -n +2 "$PROGRESS_CSV" | wc -l)
        local success=$(tail -n +2 "$PROGRESS_CSV" | grep -c ",SUCCESS,")
        local error=$(tail -n +2 "$PROGRESS_CSV" | grep -c ",ERROR,")
        
        echo "  総機能数: $total"
        echo "  成功: $success"
        echo "  エラー: $error"
        [ $total -gt 0 ] && echo "  成功率: $((success * 100 / total))%"
    else
        echo "進捗CSVファイルが見つかりません: $PROGRESS_CSV"
    fi
}

# メイン処理
main() {
    local mode="latest"
    local log_file=""
    local tail_lines=""
    local grep_pattern=""
    
    # オプション解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--latest)
                mode="latest"
                shift
                ;;
            -a|--all)
                mode="all"
                shift
                ;;
            -f|--file)
                mode="file"
                log_file="$2"
                shift 2
                ;;
            -e|--errors)
                mode="errors"
                shift
                ;;
            -s|--summary)
                mode="summary"
                shift
                ;;
            -p|--progress)
                mode="progress"
                shift
                ;;
            -t|--tail)
                tail_lines="$2"
                shift 2
                ;;
            -g|--grep)
                grep_pattern="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                echo "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # モードに応じた処理
    case $mode in
        all)
            list_logs
            ;;
        progress)
            show_progress
            ;;
        *)
            # ログファイルが指定されていない場合は最新を使用
            if [ -z "$log_file" ]; then
                log_file=$(get_latest_log)
                if [ -z "$log_file" ]; then
                    echo "ログファイルが見つかりません"
                    exit 1
                fi
            fi
            
            if [ ! -f "$log_file" ]; then
                echo "ログファイルが存在しません: $log_file"
                exit 1
            fi
            
            echo -e "${CYAN}ログファイル: $log_file${NC}"
            echo ""
            
            case $mode in
                errors)
                    show_errors "$log_file"
                    ;;
                summary)
                    show_summary "$log_file"
                    ;;
                *)
                    # 通常表示
                    if [ -n "$grep_pattern" ]; then
                        grep -E "$grep_pattern" "$log_file"
                    elif [ -n "$tail_lines" ]; then
                        tail -n "$tail_lines" "$log_file"
                    else
                        cat "$log_file"
                    fi
                    ;;
            esac
            ;;
    esac
}

# スクリプト実行
main "$@"