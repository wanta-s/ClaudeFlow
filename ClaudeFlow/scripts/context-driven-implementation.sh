#!/bin/bash

# コンテキストエンジニアリング実装スクリプト
# パターンとコンテキストを構築しながら実装

set -e

# 共通関数を読み込み
source "$(dirname "$0")/common-functions.sh"

# プロジェクトディレクトリ
PROJECT_ROOT="$(dirname "$0")/../.."
RESULTS_DIR="$PROJECT_ROOT/results"
IMPLEMENTATION_DIR="$PROJECT_ROOT/implementation"
CONTEXT_DIR="$PROJECT_ROOT/.context"

# ディレクトリ作成
mkdir -p "$IMPLEMENTATION_DIR"
mkdir -p "$CONTEXT_DIR"

# 引数処理
REQUIREMENTS_FILE="${1:-$RESULTS_DIR/03_requirements_result.md}"
DESIGN_FILE="${2:-$RESULTS_DIR/05_design_result.md}"

# コンテキストファイル
CONTEXT_FILE="$CONTEXT_DIR/CONTEXT.md"
PATTERNS_FILE="$CONTEXT_DIR/PATTERNS.md"
METRICS_FILE="$CONTEXT_DIR/metrics.log"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}       コンテキストエンジニアリング実装        ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "📋 実装とリファクタリングを繰り返しながら、"
echo -e "   パターンとコンテキストを構築します。"
echo ""

# 初期コンテキストの構築
initialize_context() {
    echo -e "${BLUE}📋 初期コンテキスト構築中...${NC}"
    
    cat > "$CONTEXT_FILE" << 'EOF'
# コンテキストエンジニアリング実装ガイド

## 原則
1. **DRY (Don't Repeat Yourself)** - 重複コードは即座に抽象化
2. **YAGNI (You Ain't Gonna Need It)** - 必要なものだけ実装
3. **関数型思考** - 純粋関数、不変性、高階関数を優先
4. **コンポーザブル** - 小さな関数を組み合わせて大きな機能を実現

## コーディングルール
- 1関数は20行以内
- 引数は3つ以内
- ネストは3レベルまで
- 早期リターンを活用
- エラーハンドリングは明示的に

## パターン適用基準
- 3回以上使用される処理はパターン化
- 汎用性が高い処理は即座にライブラリ化
```
EOF

    cat > "$PATTERNS_FILE" << 'EOF'
# 再利用可能パターンライブラリ

## 基本パターン
### 1. エラーハンドリングパターン
```typescript
const safely = <T>(fn: () => T, defaultValue: T): T => {
  try {
    return fn();
  } catch {
    return defaultValue;
  }
};
```

### 2. バリデーションパターン
```typescript
const validate = <T>(value: T, rules: Array<(v: T) => boolean>): boolean => 
  rules.every(rule => rule(value));
```
EOF

    echo -e "${GREEN}✅ 初期コンテキスト構築完了${NC}"
}

# 機能リストの抽出
extract_features() {
    echo -e "${BLUE}📋 機能リスト抽出中...${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "13_extract_features")
    prompt=$(apply_prompt_vars "$prompt" \
        "requirements_content" "$(cat "$REQUIREMENTS_FILE")")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/extract_features.md"
    
    cat "$IMPLEMENTATION_DIR/extract_features.md" | claude --print > "$IMPLEMENTATION_DIR/features.json"
    
    echo -e "${GREEN}✅ 機能リスト抽出完了${NC}"
}

# 機能の分析と最適化
analyze_feature() {
    local feature_name=$1
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "14_analyze_feature")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "context_content" "$(cat "$CONTEXT_FILE")" \
        "patterns_content" "$(cat "$PATTERNS_FILE")" \
        "requirements_content" "$(grep -A 20 "$feature_name" "$REQUIREMENTS_FILE" || echo "要件を抽出できません")")
    
    echo "$prompt" > "$CONTEXT_DIR/analyze_${feature_name}.md"
    
    cat "$CONTEXT_DIR/analyze_${feature_name}.md" | claude --print > "$CONTEXT_DIR/analysis_${feature_name}.json"
}

# 関数仕様書の生成
generate_function_spec() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${BLUE}📋 関数仕様書生成: ${feature_name}${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "15_generate_function_spec")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "requirements_content" "$(grep -A 30 "$feature_name" "$REQUIREMENTS_FILE" || echo "")" \
        "patterns_content" "$(cat "$PATTERNS_FILE")")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/spec_${feature_id}.md"
    
    cat "$IMPLEMENTATION_DIR/spec_${feature_id}.md" | claude --print > "$IMPLEMENTATION_DIR/${feature_id}_spec.md"
    
    echo -e "${GREEN}✅ 関数仕様書生成完了${NC}"
}

# 最小実装
minimal_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📝 最小実装: ${feature_name}${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "16_minimal_implementation")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "spec_content" "$(cat "$IMPLEMENTATION_DIR/${feature_id}_spec.md")" \
        "context_content" "$(cat "$CONTEXT_FILE")")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/implement_${feature_id}_minimal.md"
    
    echo -e "${YELLOW}最小実装を生成中...${NC}"
    cat "$IMPLEMENTATION_DIR/implement_${feature_id}_minimal.md" | claude --print > "$IMPLEMENTATION_DIR/${feature_id}_v1.ts"
    
    # コード行数を計測
    local loc=$(wc -l < "$IMPLEMENTATION_DIR/${feature_id}_v1.ts")
    echo -e "${BLUE}初期実装: ${loc}行${NC}"
    echo "$feature_name,v1,$loc" >> "$METRICS_FILE"
}

# リファクタリング
refactor_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${CYAN}♻️  リファクタリング: ${feature_name}${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "17_refactor_implementation")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "current_implementation" "$(cat "$IMPLEMENTATION_DIR/${feature_id}_v1.ts")" \
        "patterns_content" "$(cat "$PATTERNS_FILE")")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/refactor_${feature_id}.md"
    
    echo -e "${YELLOW}リファクタリング中...${NC}"
    cat "$IMPLEMENTATION_DIR/refactor_${feature_id}.md" | claude --print > "$IMPLEMENTATION_DIR/${feature_id}_v2.ts"
    
    # リファクタリング後の行数
    local loc=$(wc -l < "$IMPLEMENTATION_DIR/${feature_id}_v2.ts")
    echo -e "${BLUE}リファクタリング後: ${loc}行${NC}"
    echo "$feature_name,v2,$loc" >> "$METRICS_FILE"
    
    # 新しいパターンを抽出して保存
    extract_new_patterns "$feature_id" "$feature_name"
}

# 新しいパターンの抽出
extract_new_patterns() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${MAGENTA}🔍 パターン抽出: ${feature_name}${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "05_pattern_extraction")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "final_implementation" "$(cat "$IMPLEMENTATION_DIR/${feature_id}_v2.ts")")
    
    echo "$prompt" > "$CONTEXT_DIR/extract_patterns_${feature_id}.md"
    
    local new_patterns=$(cat "$CONTEXT_DIR/extract_patterns_${feature_id}.md" | claude --print)
    
    if [ -n "$new_patterns" ]; then
        echo "" >> "$PATTERNS_FILE"
        echo "## From ${feature_name}" >> "$PATTERNS_FILE"
        echo "$new_patterns" >> "$PATTERNS_FILE"
        echo -e "${GREEN}✅ 新しいパターンを追加しました${NC}"
    fi
}

# テスト生成
generate_tests() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${YELLOW}🧪 テスト生成: ${feature_name}${NC}"
    
    # プロンプトを読み込んで変数を適用
    local prompt=$(load_prompt "06_expanded_implementation")
    prompt=$(apply_prompt_vars "$prompt" \
        "feature_name" "$feature_name" \
        "implementation" "$(cat "$IMPLEMENTATION_DIR/${feature_id}_v2.ts")")
    
    echo "$prompt" > "$IMPLEMENTATION_DIR/test_${feature_id}.md"
    
    cat "$IMPLEMENTATION_DIR/test_${feature_id}.md" | claude --print > "$IMPLEMENTATION_DIR/${feature_id}_test.ts"
    
    echo -e "${GREEN}✅ テスト生成完了${NC}"
}

# 進捗表示
show_progress_status() {
    local current=$1
    local total=$2
    local feature_name=$3
    
    echo ""
    echo -e "${CYAN}【進捗状況】${NC}"
    echo -e "完了: ${current}/${total} 機能"
    
    # common-functions.shのshow_progress関数を使用
    show_progress $current $total
    echo ""
}

# メイン処理
main() {
    # 初期化
    initialize_context
    
    # 機能リストの抽出
    extract_features
    
    # JSONから機能リストを読み込み
    features=$(jq -r '.features[]' "$IMPLEMENTATION_DIR/features.json")
    total_features=$(echo "$features" | jq -s 'length')
    current=0
    
    echo ""
    echo -e "${GREEN}実装する機能数: ${total_features}${NC}"
    echo ""
    
    # 各機能を処理
    echo "$features" | while read -r feature; do
        feature_id=$(echo "$feature" | jq -r '.id')
        feature_name=$(echo "$feature" | jq -r '.name')
        
        current=$((current + 1))
        
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}機能 ${current}/${total_features}: ${feature_name}${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # 機能の分析
        analyze_feature "$feature_name"
        
        # 実装フロー
        generate_function_spec "$feature_id" "$feature_name"
        minimal_implementation "$feature_id" "$feature_name"
        refactor_implementation "$feature_id" "$feature_name"
        generate_tests "$feature_id" "$feature_name"
        
        # 最終化
        cp "$IMPLEMENTATION_DIR/${feature_id}_v2.ts" "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
        
        # 進捗表示
        show_progress_status $current $total_features "$feature_name"
        
        # 次の機能に進むか確認
        if [ $current -lt $total_features ]; then
            echo -e "${YELLOW}次の機能に進みますか？ (y/n)${NC}"
            read -n 1 continue_confirm
            echo ""
            
            if [[ ! $continue_confirm =~ ^[Yy]$ ]]; then
                echo -e "${YELLOW}実装を中断しました。${NC}"
                break
            fi
        fi
    done
    
    # 最終レポート
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${GREEN}コンテキストエンジニアリング実装完了！${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
    echo "📊 メトリクス:"
    cat "$METRICS_FILE" | column -t -s ','
    echo ""
    echo "📚 パターンライブラリ: $PATTERNS_FILE"
    echo "📋 コンテキスト: $CONTEXT_FILE"
}

# スクリプト実行
main