#!/bin/bash

# AI開発パイプライン実行スクリプト
# 各フェーズを順番に実行し、結果を次のフェーズに引き継ぐ

set -e  # エラー時に停止

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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
    
    # 実装フェーズの場合は特別な処理
    if [ "$phase_file" = "06_implementation" ]; then
        # 実装モードを確認
        echo -e "${YELLOW}実装フェーズです。どのモードで実行しますか？${NC}"
        echo "1) コンテキストエンジニアリング（実装→リファクタ→テスト）"
        echo "2) インクリメンタル（機能ごとに実装・テスト）"
        echo "3) ハイブリッド（CE + インクリメンタル）- 推奨"
        echo "4) 通常モード（すべて一度に実装）"
        echo -n "選択 (1-4): "
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
    claude_cmd="claude --file \"$task_file\""
    
    # 前のフェーズの結果を入力として追加
    if [ -n "$previous_result" ] && [ -f "$previous_result" ]; then
        claude_cmd="$claude_cmd --file \"$previous_result\""
    fi
    
    # 初期入力ファイルがある場合（最初のフェーズのみ）
    if [ -n "$INITIAL_INPUT" ] && [ "$phase_file" = "01_planning" ] && [ -f "$INITIAL_INPUT" ]; then
        claude_cmd="$claude_cmd --file \"$INITIAL_INPUT\""
    fi
    
    # 実行
    log_info "実行中: $claude_cmd > \"$result_file\""
    eval "$claude_cmd > \"$result_file\""
    
    # 結果確認
    if [ -s "$result_file" ]; then
        log_success "完了: $phase_name -> $result_file"
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

# 最終レポート生成（オプション）
if command -v tree &> /dev/null; then
    echo -e "\n${BLUE}生成されたファイル:${NC}"
    tree "$RESULTS_DIR"
else
    echo -e "\n${BLUE}生成されたファイル:${NC}"
    ls -la "$RESULTS_DIR"
fi