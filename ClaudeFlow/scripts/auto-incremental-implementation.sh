#!/bin/bash

# 自動インクリメンタル実装スクリプト
# テスト失敗時に自動的に修正を繰り返す

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ディレクトリ設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
TASKS_DIR="$BASE_DIR/tasks"
RESULTS_DIR="$BASE_DIR/../results"
BASE_IMPLEMENTATION_DIR="$RESULTS_DIR/implementation"
PROMPTS_DIR="$BASE_DIR/prompts"

# 共通関数を読み込む
source "$SCRIPT_DIR/common-functions.sh"

# 要件ファイルを特定
REQUIREMENTS_FILE="$RESULTS_DIR/03_requirements_result.md"

# 統一プロジェクト構造を作成
if [ -f "$REQUIREMENTS_FILE" ]; then
    PROJECT_DIR=$(create_unified_project "$REQUIREMENTS_FILE" "$BASE_IMPLEMENTATION_DIR")
    IMPLEMENTATION_DIR="$PROJECT_DIR/src"
    TESTS_DIR="$PROJECT_DIR/tests"
    log_info "統一プロジェクト構造で実行: $PROJECT_DIR"
else
    # 従来の方式をフォールバック
    mkdir -p "$BASE_IMPLEMENTATION_DIR"
    IMPLEMENTATION_DIR="$BASE_IMPLEMENTATION_DIR"
    TESTS_DIR="$RESULTS_DIR/tests"
    PROJECT_DIR="$BASE_IMPLEMENTATION_DIR"
    log_warning "要件ファイルが見つかりません。従来の構造を使用します。"
fi

# 最大リトライ回数
MAX_RETRY=5

# 自動修正モードフラグ
AUTO_FIX=true

# 機能リストを生成
generate_feature_list() {
    echo -e "${YELLOW}機能リストを生成中...${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "09_generate_features")
    prompt=$(apply_prompt_vars "$prompt" \
        "requirements" "$(cat "$RESULTS_DIR/03_requirements_result.md 2>/dev/null || echo '要件定義なし')")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/generate_features.md"
    
    # 機能リスト生成
    cat "$IMPLEMENTATION_DIR/generate_features.md" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$IMPLEMENTATION_DIR/features.json"
}

# 単一機能の実装
implement_feature() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${BLUE}実装中: ${feature_name}...${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "10_implement_feature")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "design_spec" "$(cat "$RESULTS_DIR/05_design_result.md 2>/dev/null || echo '設計仕様なし')")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/implement_${feature_id}.md"
    
    # 実装実行
    cat "$IMPLEMENTATION_DIR/implement_${feature_id}.md" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$IMPLEMENTATION_DIR/${feature_id}_implementation.md"
    
    # 構文エラーチェック
    if [ "${CLAUDEFLOW_AUTO_VALIDATE:-true}" = "true" ]; then
        echo -e "${CYAN}検証中...${NC}"
        
        # 実装から生成されたコードファイルを検証
        local validation_passed=true
        local validation_report="$IMPLEMENTATION_DIR/${feature_id}_validation.txt"
        
        # 検証レポート初期化
        echo "=== 実装検証レポート: $feature_name ===" > "$validation_report"
        echo "実行日時: $(date)" >> "$validation_report"
        echo "" >> "$validation_report"
        
        # すべてのコードファイルをチェック
        for code_file in "$IMPLEMENTATION_DIR"/*.{js,ts,jsx,tsx,py,html} "$PROJECT_DIR"/src/**/*.{js,ts,jsx,tsx,py,html}; do
            if [ -f "$code_file" ]; then
                echo "検証中: $(basename "$code_file")" >> "$validation_report"
                
                # 構文チェック
                if ! validate_syntax "$code_file" >> "$validation_report" 2>&1; then
                    echo "❌ 構文エラー" >> "$validation_report"
                    validation_passed=false
                else
                    echo "✅ 構文OK" >> "$validation_report"
                fi
                
                # ランタイムエラーチェック
                if ! validate_runtime "$code_file" >> "$validation_report" 2>&1; then
                    echo "⚠️ ランタイムエラーの可能性" >> "$validation_report"
                fi
                
                echo "" >> "$validation_report"
            fi
        done
        
        if [ "$validation_passed" = false ]; then
            echo -e "${YELLOW}⚠️ 構文エラーが検出されました${NC}"
            
            # 自動修正モードの場合は修正を試みる
            if [ "$AUTO_FIX" = true ]; then
                echo -e "${YELLOW}自動修正を試みます...${NC}"
                
                local fix_prompt="以下の実装に構文エラーまたはエラーパターンが検出されました。修正してください：

実装内容:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_implementation.md")

検証レポート:
$(cat "$validation_report")

修正要件：
- すべての構文エラーを修正
- DOM要素の存在チェックを追加
- 配列アクセスの境界チェックを追加
- try-catchでエラーハンドリングを追加
- 元の機能を保持"
                
                echo "$fix_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$IMPLEMENTATION_DIR/${feature_id}_implementation.md"
                echo -e "${GREEN}構文エラーを修正しました${NC}"
            fi
        else
            echo -e "${GREEN}✅ 検証合格${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ 実装完了${NC}"
}

# テスト実行（自動リトライ付き）
run_feature_tests_with_retry() {
    local feature_id=$1
    local feature_name=$2
    local retry_count=0
    local test_passed=false
    
    while [ $retry_count -lt $MAX_RETRY ] && [ "$test_passed" = false ]; do
        echo ""
        if [ $retry_count -eq 0 ]; then
            echo -e "${CYAN}テスト実行: ${feature_name}${NC}"
        else
            echo -e "${CYAN}再テスト実行 [${retry_count}/${MAX_RETRY}]: ${feature_name}${NC}"
        fi
        
        # プロンプトを読み込んで変数を適用
        local prompt=$(load_prompt "11_run_tests")
        prompt=$(apply_prompt_vars "$prompt" \
            "feature_name" "$feature_name" \
            "implementation_code" "$(cat "$IMPLEMENTATION_DIR/${feature_id}_implementation.md")")
        
        echo "$prompt" > "$TESTS_DIR/test_${feature_id}.md"
        
        # テスト実行
        echo -e "${YELLOW}テスト実行中...${NC}"
        cat "$TESTS_DIR/test_${feature_id}.md" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$TESTS_DIR/${feature_id}_test_result.md"
        
        # テスト結果の確認
        if grep -q "FAIL" "$TESTS_DIR/${feature_id}_test_result.md"; then
            echo -e "${RED}❌ テスト失敗 [試行 $((retry_count + 1))/${MAX_RETRY}]${NC}"
            
            if [ $retry_count -lt $((MAX_RETRY - 1)) ]; then
                # 自動修正を実行
                if [ "$AUTO_FIX" = true ]; then
                    echo -e "${YELLOW}自動修正を実行中...${NC}"
                    auto_fix_implementation "$feature_id" "$feature_name"
                    ((retry_count++))
                else
                    # 手動確認モード
                    echo -e "${YELLOW}修正を試みますか？ [y/n/a]${NC}"
                    echo "y: はい、n: いいえ、a: 以降すべて自動修正"
                    read -n 1 fix_confirm
                    echo ""
                    
                    if [[ $fix_confirm =~ ^[Aa]$ ]]; then
                        AUTO_FIX=true
                        auto_fix_implementation "$feature_id" "$feature_name"
                        ((retry_count++))
                    elif [[ $fix_confirm =~ ^[Yy]$ ]]; then
                        auto_fix_implementation "$feature_id" "$feature_name"
                        ((retry_count++))
                    else
                        break
                    fi
                fi
            else
                echo -e "${RED}最大リトライ回数に達しました。手動での修正が必要です。${NC}"
                echo "失敗の詳細: $TESTS_DIR/${feature_id}_test_result.md"
                break
            fi
        else
            echo -e "${GREEN}✅ すべてのテストがパス${NC}"
            test_passed=true
        fi
    done
    
    return $([ "$test_passed" = true ] && echo 0 || echo 1)
}

# 実装の自動修正
auto_fix_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${YELLOW}実装を自動修正中...${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "12_fix_implementation")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "test_results" "$(cat "$TESTS_DIR/${feature_id}_test_result.md")" \
        "current_implementation" "$(cat "$IMPLEMENTATION_DIR/${feature_id}_implementation.md")")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/fix_${feature_id}.md"
    
    # 修正実行
    cat "$IMPLEMENTATION_DIR/fix_${feature_id}.md" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$IMPLEMENTATION_DIR/${feature_id}_implementation_fixed.md"
    mv "$IMPLEMENTATION_DIR/${feature_id}_implementation_fixed.md" "$IMPLEMENTATION_DIR/${feature_id}_implementation.md"
    
    echo -e "${GREEN}修正完了${NC}"
}

# 進捗表示（詳細版）
show_detailed_progress() {
    local current=$1
    local total=$2
    local passed=$3
    local failed=$4
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}【進捗状況】${NC}"
    echo -e "実装完了: ${current}/${total} 機能"
    echo -e "${GREEN}テスト成功: ${passed} 機能${NC}"
    if [ $failed -gt 0 ]; then
        echo -e "${RED}テスト失敗: ${failed} 機能${NC}"
    fi
    
    # プログレスバー
    local progress=$((current * 100 / total))
    printf "["
    printf "%0.s=" $(seq 1 $((progress / 5)))
    printf "%0.s " $(seq 1 $((20 - progress / 5)))
    printf "] ${progress}%%\n"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# サマリー表示
show_summary() {
    local total=$1
    local passed=$2
    local failed=$3
    local duration=$4
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}【実装サマリー】${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "総機能数: ${total}"
    echo -e "${GREEN}成功: ${passed} [$(( passed * 100 / total ))%]${NC}"
    if [ $failed -gt 0 ]; then
        echo -e "${RED}失敗: ${failed} [$(( failed * 100 / total ))%]${NC}"
    fi
    echo -e "実行時間: ${duration}秒"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# メイン処理
main() {
    # 開始時刻
    local start_time=$(date +%s)
    
    # ディレクトリ作成
    mkdir -p "$IMPLEMENTATION_DIR" "$TESTS_DIR"
    
    # 自動修正モードの確認
    echo -e "${YELLOW}自動修正モードで実行しますか？ [y/n]${NC}"
    echo "y: 自動修正（推奨）、n: 手動確認"
    read -n 1 auto_mode
    echo ""
    if [[ $auto_mode =~ ^[Yy]$ ]]; then
        AUTO_FIX=true
        echo -e "${GREEN}自動修正モードで実行します${NC}"
    else
        AUTO_FIX=false
        echo -e "${YELLOW}手動確認モードで実行します${NC}"
    fi
    
    # 機能リストを生成
    echo -e "${BLUE}機能リストを生成中...${NC}"
    generate_feature_list
    
    # JSONから機能リストを抽出
    if command -v jq &> /dev/null; then
        # jqが利用可能な場合
        features=$(jq -r '.features[]' "$IMPLEMENTATION_DIR/features.json" 2>/dev/null || echo '[]')
        total_features=$(echo "$features" | jq -s 'length' 2>/dev/null || echo 0)
    else
        # jqが利用できない場合はPythonを使用
        echo -e "${YELLOW}jqが見つかりません。Pythonを使用してJSONを解析します...${NC}"
        features=$(python3 -c "
import json
try:
    with open('$IMPLEMENTATION_DIR/features.json', 'r') as f:
        data = json.load(f)
        for feature in data['features']:
            print(json.dumps(feature))
except:
    pass
" 2>/dev/null || echo '[]')
        total_features=$(python3 -c "
import json
try:
    with open('$IMPLEMENTATION_DIR/features.json', 'r') as f:
        data = json.load(f)
        print(len(data['features']))
except:
    print(0)
" 2>/dev/null || echo 0)
    fi
    
    if [ "$total_features" -eq 0 ]; then
        echo -e "${RED}エラー: 機能リストの生成に失敗しました${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}実装する機能数: ${total_features}${NC}"
    echo ""
    
    # 統計情報
    local current=0
    local passed=0
    local failed=0
    
    # 各機能を実装
    echo "$features" | while read -r feature; do
        if command -v jq &> /dev/null; then
            feature_id=$(echo "$feature" | jq -r '.id')
            feature_name=$(echo "$feature" | jq -r '.name')
        else
            # Pythonを使用してJSONを解析
            feature_id=$(echo "$feature" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
            feature_name=$(echo "$feature" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])")
        fi
        
        ((current++))
        
        # 実装
        implement_feature "$feature_id" "$feature_name"
        
        # テスト実行（自動リトライ付き）
        if run_feature_tests_with_retry "$feature_id" "$feature_name"; then
            ((passed++))
        else
            ((failed++))
        fi
        
        # 進捗表示
        show_detailed_progress $current $total_features $passed $failed
        
        # 最後の機能の場合、統計情報をファイルに保存
        if [ "$current" -eq "$total_features" ]; then
            echo "$passed" > "$IMPLEMENTATION_DIR/.passed_count"
            echo "$failed" > "$IMPLEMENTATION_DIR/.failed_count"
        fi
    done
    
    # 統計情報を読み込む
    passed=$(cat "$IMPLEMENTATION_DIR/.passed_count" 2>/dev/null || echo 0)
    failed=$(cat "$IMPLEMENTATION_DIR/.failed_count" 2>/dev/null || echo 0)
    
    # 終了時刻と実行時間
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # サマリー表示
    show_summary $total_features $passed $failed $duration
    
    # 後片付け
    rm -f "$IMPLEMENTATION_DIR/.passed_count" "$IMPLEMENTATION_DIR/.failed_count"
    
    echo ""
    echo ""
    echo -e "${GREEN}自動インクリメンタル実装が完了しました！${NC}"
    
    if [ $failed -gt 0 ]; then
        echo -e "${YELLOW}失敗した機能については手動での確認が必要です。${NC}"
        exit 1
    fi
}

# エラーハンドリング
set -e
trap 'echo -e "${RED}エラーが発生しました。処理を中止します。${NC}"' ERR

# メイン処理を実行
main "$@"

