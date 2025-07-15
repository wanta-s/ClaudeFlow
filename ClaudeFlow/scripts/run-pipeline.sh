#!/bin/bash

# UTF-8エンコーディングを強制
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# AI開発パイプライン実行スクリプト
# 各フェーズを順番に実行し、結果を次のフェーズに引き継ぐ

set -e  # エラー時に停止

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

# プロジェクトルート
PROJECT_ROOT="$(dirname "$0")/.."
TASKS_DIR="$PROJECT_ROOT/tasks"
RESULTS_DIR="$PROJECT_ROOT/results"

# 結果ディレクトリ作成
mkdir -p "$RESULTS_DIR"

# フェーズ定義
phases=(
    "01_planning:企画フェーズ"
    "02_research:技術調査フェーズ"
    "03_requirements:要件定義フェーズ"
    "04_prototype:プロトタイプフェーズ"
    "05_design:詳細設計フェーズ"
    "06_implementation:実装フェーズ"
    "07_testing:テストフェーズ"
    "08_code_review:コードレビューフェーズ"
    "09_documentation:ドキュメント生成フェーズ"
)

# 初期入力ファイル（プロジェクトアイデアなど）
INITIAL_INPUT="${1:-}"

# トークン追跡を初期化
init_token_tracking

# 初期入力がある場合は、まずプロジェクトを分析してタスクファイルを生成
if [ -n "$INITIAL_INPUT" ] && [ -f "$INITIAL_INPUT" ]; then
    log_info "プロジェクトを分析してタスクファイルを生成中..."
    "$PROJECT_ROOT/scripts/analyze-and-generate.sh" "$INITIAL_INPUT"
    
    if [ $? -ne 0 ]; then
        log_error "タスクファイルの生成に失敗しました"
        exit 1
    fi
    log_success "タスクファイルの生成が完了しました"
    echo ""
fi

# 各フェーズを実行
for phase in "${phases[@]}"; do
    IFS=':' read -r phase_file phase_name <<< "$phase"
    
    log_info "開始: $phase_name"
    
    task_file="$TASKS_DIR/${phase_file}.md"
    result_file="$RESULTS_DIR/${phase_file}_result.md"
    
    # タスクファイルの存在確認
    if [ ! -f "$task_file" ]; then
        log_error "タスクファイルが見つかりません: $task_file"
        exit 1
    fi
    
    # 要件定義フェーズの場合は特別な処理
    if [ "$phase_file" = "03_requirements" ]; then
        # 要件レベルを確認
        echo -e "${YELLOW}要件定義フェーズです。どのレベルで実行しますか？${NC}"
        echo "A) 最小要件（MVP最優先）- 必須機能のみ、簡潔な仕様書"
        echo "B) 標準要件（バランス重視）- 基本機能 + 一部拡張機能"
        echo "C) 詳細要件（品質重視）- 全機能の詳細定義、包括的な仕様書"
        echo "D) カスタム要件 - 具体的な要件を手動指定"
        echo -n "選択 (A-D): "
        read req_level
        
        # 選択された要件レベルを入力に追加
        temp_input=$(mktemp)
        cat "$task_file" > "$temp_input"
        echo -e "\n\n---\n# 選択された要件レベル: $req_level\n" >> "$temp_input"
        
        case "$req_level" in
            "A"|"a")
                echo "- 最小要件（MVP最優先）を選択しました" >> "$temp_input"
                echo "- 必須機能のみに集中して、簡潔で実装しやすい仕様書を作成してください" >> "$temp_input"
                ;;
            "B"|"b")
                echo "- 標準要件（バランス重視）を選択しました" >> "$temp_input"
                echo "- 基本機能と一部拡張機能を含めた、標準的な仕様書を作成してください" >> "$temp_input"
                ;;
            "C"|"c")
                echo "- 詳細要件（品質重視）を選択しました" >> "$temp_input"
                echo "- 全機能について詳細な定義を含む、包括的な仕様書を作成してください" >> "$temp_input"
                ;;
            "D"|"d")
                echo "- カスタム要件を選択しました" >> "$temp_input"
                echo "- 特定の制約や要求に対応した仕様書を作成してください" >> "$temp_input"
                ;;
            *)
                echo "- 標準要件（デフォルト）を選択しました" >> "$temp_input"
                echo "- 基本機能と一部拡張機能を含めた、標準的な仕様書を作成してください" >> "$temp_input"
                ;;
        esac
        
        # 前フェーズの結果を追加
        if [ -f "$RESULTS_DIR/01_planning_result.md" ]; then
            echo -e "\n\n---\n# 企画書\n" >> "$temp_input"
            cat "$RESULTS_DIR/01_planning_result.md" >> "$temp_input"
        fi
        if [ -f "$RESULTS_DIR/02_research_result.md" ]; then
            echo -e "\n\n---\n# 技術調査結果\n" >> "$temp_input"
            cat "$RESULTS_DIR/02_research_result.md" >> "$temp_input"
        fi
        
        # 実行（自動認証トークン追跡付き）
        log_info "実行中: $phase_name (要件レベル: $req_level)"
        input_content=$(cat "$temp_input" | tr -d '\0')
        run_claude_auto_auth "$input_content" "$result_file" "$phase_name"
        
        # 一時ファイルを削除
        rm -f "$temp_input"
        
        # 結果確認と表示
        if [ -s "$result_file" ]; then
            log_success "完了: $phase_name -> $result_file"
            
            # 結果のサマリを表示
            echo -e "\n${CYAN}=== $phase_name 結果サマリ ===${NC}"
            head -n 20 "$result_file" | tr -d '\0'
            if [ $(wc -l < "$result_file") -gt 20 ]; then
                echo -e "${CYAN}... (以下省略) ...${NC}"
                echo -e "${CYAN}全体: $(wc -l < "$result_file")行${NC}"
            fi
            echo -e "${CYAN}========================${NC}"
        else
            log_error "結果ファイルが空です: $result_file"
            exit 1
        fi
        
        continue
    fi
    
    # 実装フェーズの場合は特別な処理
    if [ "$phase_file" = "06_implementation" ]; then
        # 実装モードを確認
        echo -e "${YELLOW}実装フェーズです。どのモードで実行しますか？${NC}"
        echo "1) コンテキストエンジニアリング（実装→リファクタ→テスト）"
        echo "2) インクリメンタル（機能ごとに実装・テスト）"
        echo "3) 自動インクリメンタル（完全自動修正）"
        echo "4) ハイブリッド（CE + インクリメンタル）- 推奨"
        echo "5) 通常モード（すべて一度に実装）"
        echo -n "選択 (1-5): "
        read impl_mode
        
        if [ "$impl_mode" = "1" ]; then
            log_info "コンテキストエンジニアリング実装モードで実行"
            # コンテキスト駆動実装スクリプトを実行
            "$PROJECT_ROOT/scripts/context-driven-implementation.sh" \
                "$RESULTS_DIR/03_requirements_result.md" \
                "$RESULTS_DIR/05_design_result.md"
            
            # 結果をまとめる
            if ls "$PROJECT_ROOT/implementation/"*_final.ts 1> /dev/null 2>&1; then
                cat "$PROJECT_ROOT/implementation/"*_final.ts > "$result_file"
            else
                log_error "実装結果ファイルが見つかりません"
                exit 1
            fi
            continue
        elif [ "$impl_mode" = "2" ]; then
            log_info "インクリメンタル実装モードで実行"
            # インクリメンタル実装スクリプトを実行
            "$PROJECT_ROOT/scripts/incremental-implementation.sh" \
                "$RESULTS_DIR/03_requirements_result.md" \
                "$RESULTS_DIR/05_design_result.md"
            
            # 結果をまとめる
            if ls "$PROJECT_ROOT/implementation/"*.md 1> /dev/null 2>&1; then
                cat "$PROJECT_ROOT/implementation/"*.md > "$result_file"
            else
                log_error "実装結果ファイルが見つかりません"
                exit 1
            fi
            continue
        elif [ "$impl_mode" = "3" ]; then
            log_info "自動インクリメンタル実装モードで実行"
            # 自動インクリメンタル実装スクリプトを実行
            "$PROJECT_ROOT/scripts/auto-incremental-implementation.sh"
            
            # 結果をまとめる
            if ls "$PROJECT_ROOT/results/implementation/"*.md 1> /dev/null 2>&1; then
                cat "$PROJECT_ROOT/results/implementation/"*.md > "$result_file"
            else
                log_error "実装結果ファイルが見つかりません"
                exit 1
            fi
            continue
        elif [ "$impl_mode" = "4" ]; then
            log_info "ハイブリッド実装モードで実行"
            # ハイブリッド実装スクリプトを実行
            "$PROJECT_ROOT/scripts/hybrid-implementation.sh" \
                "$RESULTS_DIR/03_requirements_result.md" \
                "$RESULTS_DIR/05_design_result.md"
            
            # 結果をまとめる
            if [ -f "$PROJECT_ROOT/implementation/integrated_implementation.ts" ]; then
                cp "$PROJECT_ROOT/implementation/integrated_implementation.ts" "$result_file"
            else
                log_error "統合実装ファイルが見つかりません"
                exit 1
            fi
            continue
        fi
    fi
    
    # Claudeコマンドの構築
    # ファイルを結合してClaudeに渡す
    temp_input="$RESULTS_DIR/.temp_input_${phase_file}.md"
    cat "$task_file" > "$temp_input"
    
    # 前のフェーズの結果を入力として追加
    if [ -n "$previous_result" ] && [ -f "$previous_result" ]; then
        echo -e "\n\n---\n# 前のフェーズの結果\n" >> "$temp_input"
        cat "$previous_result" >> "$temp_input"
    fi
    
    # 初期入力ファイルがある場合（最初のフェーズのみ）
    if [ -n "$INITIAL_INPUT" ] && [ "$phase_file" = "01_planning" ] && [ -f "$INITIAL_INPUT" ]; then
        echo -e "\n\n---\n# ユーザー入力\n" >> "$temp_input"
        cat "$INITIAL_INPUT" >> "$temp_input"
    fi
    
    # 実行（自動認証トークン追跡付き）
    log_info "実行中: $phase_name"
    input_content=$(cat "$temp_input" | tr -d '\0')
    run_claude_auto_auth "$input_content" "$result_file" "$phase_name"
    
    # 一時ファイルを削除
    rm -f "$temp_input"
    
    # 結果確認
    if [ -s "$result_file" ]; then
        log_success "完了: $phase_name -> $result_file"
        
        # 結果のサマリを表示
        echo -e "\n${CYAN}=== $phase_name 結果サマリ ===${NC}"
        # 最初の20行を表示（null byteを除去）
        head -n 20 "$result_file" | tr -d '\0'
        if [ $(wc -l < "$result_file") -gt 20 ]; then
            echo -e "${CYAN}... (以下省略) ...${NC}"
            echo -e "${CYAN}全体: $(wc -l < "$result_file")行${NC}"
        fi
        echo -e "${CYAN}========================${NC}\n"
        
        previous_result="$result_file"
    else
        log_error "結果ファイルが空です: $result_file"
        exit 1
    fi
    
    # フェーズ間の待機（必要に応じて）
    sleep 2
done

log_success "すべてのフェーズが完了しました！"
log_info "結果は $RESULTS_DIR に保存されています"

# 最終的なトークン使用量を表示
echo ""
echo -e "${CYAN}=== 最終トークン使用量 ===${NC}"
show_token_usage 0 "合計"
echo -e "${CYAN}========================${NC}"

# セキュリティサマリー表示
show_security_summary

# 最終レポート生成（オプション）
if command -v tree &> /dev/null; then
    echo -e "\n${BLUE}生成されたファイル:${NC}"
    tree "$RESULTS_DIR"
else
    echo -e "\n${BLUE}生成されたファイル:${NC}"
    ls -la "$RESULTS_DIR"
fi