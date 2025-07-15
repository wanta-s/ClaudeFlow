#!/bin/bash

# インクリメンタル実装スクリプト
# 機能を1つずつ実装し、都度テストを実行

set -e

# 共通関数を読み込み
source "$(dirname "$0")/common-functions.sh"

# プロジェクトディレクトリ
PROJECT_ROOT="$(dirname "$0")/.."
RESULTS_DIR="$PROJECT_ROOT/results"
BASE_IMPLEMENTATION_DIR="$PROJECT_ROOT/implementation"

# 引数処理
REQUIREMENTS_FILE="${1:-$RESULTS_DIR/03_requirements_result.md}"
DESIGN_FILE="${2:-$RESULTS_DIR/05_design_result.md}"

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
    TESTS_DIR="$PROJECT_ROOT/tests"
    PROJECT_DIR="$BASE_IMPLEMENTATION_DIR"
    log_warning "要件ファイルが見つかりません。従来の構造を使用します。"
fi

mkdir -p "$TESTS_DIR"

echo -e "${CYAN}=====================================${NC}"
echo -e "${CYAN}     インクリメンタル実装モード      ${NC}"
echo -e "${CYAN}=====================================${NC}"
echo ""

# 実装する機能リストを生成
generate_feature_list() {
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "13_extract_features")
    prompt=$(apply_prompt_vars "$prompt" \
        "requirements_content" "$(cat "$REQUIREMENTS_FILE")")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/extract_features.md"
    
    # AIに機能リストを生成させる
    cat "$IMPLEMENTATION_DIR/extract_features.md" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$IMPLEMENTATION_DIR/features.json"
}

# 個別機能の実装
implement_feature() {
    local feature_id=$1
    local feature_name=$2
    local feature_desc=$3
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}実装開始: ${feature_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "10_implement_feature")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "feature_description" "$feature_desc" \
        "feature_id" "$feature_id" \
        "design_content" "$(cat "$DESIGN_FILE")")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/implement_${feature_id}.md"
    
    # AIに実装させる
    echo -e "${YELLOW}実装中...${NC}"
    cat "$IMPLEMENTATION_DIR/implement_${feature_id}.md" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$IMPLEMENTATION_DIR/${feature_id}_implementation.md"
    
    echo -e "${GREEN}✅ 実装完了${NC}"
}

# テスト実行
run_feature_tests() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${CYAN}テスト実行: ${feature_name}${NC}"
    
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
        echo -e "${RED}❌ テスト失敗${NC}"
        echo "詳細: $TESTS_DIR/${feature_id}_test_result.md"
        
        # 修正するか確認
        echo -e "${YELLOW}修正を試みますか？ (y/n)${NC}"
        read -n 1 fix_confirm
        echo ""
        
        if [[ $fix_confirm =~ ^[Yy]$ ]]; then
            fix_implementation "$feature_id" "$feature_name"
        fi
    else
        echo -e "${GREEN}✅ すべてのテストがパス${NC}"
    fi
}

# 実装の修正
fix_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${YELLOW}実装を修正中...${NC}"
    
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
    
    # 再テスト
    run_feature_tests "$feature_id" "$feature_name"
}

# 進捗表示
show_progress() {
    local current=$1
    local total=$2
    local feature_name=$3
    
    echo ""
    echo -e "${CYAN}【進捗状況】${NC}"
    echo -e "完了: ${current}/${total} 機能"
    
    # プログレスバー
    local progress=$((current * 100 / total))
    printf "["
    printf "%0.s=" $(seq 1 $((progress / 5)))
    printf "%0.s " $(seq 1 $((20 - progress / 5)))
    printf "] ${progress}%%\n"
    echo ""
}

# メイン処理
main() {
    # 機能リストを生成
    echo -e "${BLUE}機能リストを生成中...${NC}"
    generate_feature_list
    
    # JSONから機能リストを抽出
    if command -v jq &> /dev/null; then
        # jqが利用可能な場合
        features=$(jq -r '.features[]' "$IMPLEMENTATION_DIR/features.json")
        total_features=$(echo "$features" | jq -s 'length')
    else
        # jqが利用できない場合はPythonを使用
        echo -e "${YELLOW}jqが見つかりません。Pythonを使用してJSONを解析します...${NC}"
        features=$(python3 -c "
import json
with open('$IMPLEMENTATION_DIR/features.json', 'r') as f:
    data = json.load(f)
    for feature in data['features']:
        print(json.dumps(feature))
")
        total_features=$(python3 -c "
import json
with open('$IMPLEMENTATION_DIR/features.json', 'r') as f:
    data = json.load(f)
    print(len(data['features']))
")
    fi
    current=0
    
    echo -e "${GREEN}実装する機能数: ${total_features}${NC}"
    echo ""
    
    # 各機能を実装
    echo "$features" | while read -r feature; do
        if command -v jq &> /dev/null; then
            feature_id=$(echo "$feature" | jq -r '.id')
            feature_name=$(echo "$feature" | jq -r '.name')
            feature_desc=$(echo "$feature" | jq -r '.description')
        else
            # Pythonを使用してJSONを解析
            feature_id=$(echo "$feature" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
            feature_name=$(echo "$feature" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])")
            feature_desc=$(echo "$feature" | python3 -c "import json,sys; print(json.load(sys.stdin)['description'])")
        fi
        
        current=$((current + 1))
        
        # 機能を実装
        implement_feature "$feature_id" "$feature_name" "$feature_desc"
        
        # テストを実行
        run_feature_tests "$feature_id" "$feature_name"
        
        # 進捗を表示
        show_progress $current $total_features "$feature_name"
        
        # 次の機能に進むか確認
        if [ $current -lt $total_features ]; then
            echo -e "${YELLOW}次の機能に進みますか？ (y/n/a=全自動)${NC}"
            read -n 1 continue_confirm
            echo ""
            
            if [[ $continue_confirm =~ ^[Nn]$ ]]; then
                echo -e "${YELLOW}実装を中断しました。${NC}"
                break
            elif [[ $continue_confirm =~ ^[Aa]$ ]]; then
                # 自動モードに切り替え
                export AUTO_MODE=true
            fi
            
            # 自動モードでない場合のみ確認
            if [ "$AUTO_MODE" != "true" ]; then
                continue
            fi
        fi
    done
    
    echo ""
    echo -e "${CYAN}=====================================${NC}"
    echo -e "${GREEN}インクリメンタル実装完了！${NC}"
    echo -e "${CYAN}=====================================${NC}"
}

# スクリプト実行
main