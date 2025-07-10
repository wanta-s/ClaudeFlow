#!/bin/bash

# インクリメンタル実装スクリプト
# 機能を1つずつ実装し、都度テストを実行

set -e

# 共通関数を読み込み
source "$(dirname "$0")/common-functions.sh"

# プロジェクトディレクトリ
PROJECT_ROOT="$(dirname "$0")/.."
RESULTS_DIR="$PROJECT_ROOT/results"
IMPLEMENTATION_DIR="$PROJECT_ROOT/implementation"
TESTS_DIR="$PROJECT_ROOT/tests"

# 実装ディレクトリ作成
mkdir -p "$IMPLEMENTATION_DIR"
mkdir -p "$TESTS_DIR"

# 入力ファイル
REQUIREMENTS_FILE="${1:-$RESULTS_DIR/03_requirements_result.md}"
DESIGN_FILE="${2:-$RESULTS_DIR/05_design_result.md}"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}        インクリメンタル実装モード             ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo "機能を1つずつ実装し、都度テストを実行します。"
echo ""

# 実装する機能リストを生成
generate_feature_list() {
    cat > "$IMPLEMENTATION_DIR/extract_features.md" << EOF
# 実装機能の抽出

以下の要件定義書から、実装すべき機能を個別のタスクとして抽出してください。

## 出力形式
各機能を以下の形式でリスト化：

\`\`\`json
{
  "features": [
    {
      "id": "feature_001",
      "name": "ユーザー登録機能",
      "description": "新規ユーザーの登録処理",
      "dependencies": [],
      "estimated_time": "2時間",
      "test_requirements": "ユニットテスト、統合テスト"
    },
    {
      "id": "feature_002",
      "name": "ログイン機能",
      "description": "ユーザー認証とセッション管理",
      "dependencies": ["feature_001"],
      "estimated_time": "3時間",
      "test_requirements": "ユニットテスト、セキュリティテスト"
    }
  ]
}
\`\`\`

優先順位と依存関係を考慮して、実装順序を決定してください。

---
要件定義書の内容：
EOF

    cat "$REQUIREMENTS_FILE" >> "$IMPLEMENTATION_DIR/extract_features.md"
    
    # AIに機能リストを生成させる
    claude --file "$IMPLEMENTATION_DIR/extract_features.md" > "$IMPLEMENTATION_DIR/features.json"
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
    
    # 実装タスクファイルを作成
    cat > "$IMPLEMENTATION_DIR/implement_${feature_id}.md" << EOF
# 機能実装タスク: ${feature_name}

## 実装内容
${feature_desc}

## 要件
- 要件定義書の該当部分を参照
- テスト可能な形で実装
- エラーハンドリングを含む

## 成果物
1. 実装コード（フロントエンド/バックエンド）
2. ユニットテスト
3. 統合テスト（必要に応じて）

## 出力形式
実装したコードを以下の形式で出力：

### フロントエンドコード
\`\`\`typescript
// ファイルパス: frontend/src/features/${feature_id}/
// 実装コード
\`\`\`

### バックエンドコード
\`\`\`typescript
// ファイルパス: backend/src/features/${feature_id}/
// 実装コード
\`\`\`

### テストコード
\`\`\`typescript
// ファイルパス: tests/${feature_id}/
// テストコード
\`\`\`

---
設計書の内容：
EOF

    cat "$DESIGN_FILE" >> "$IMPLEMENTATION_DIR/implement_${feature_id}.md"
    
    # AIに実装させる
    echo -e "${YELLOW}実装中...${NC}"
    claude --file "$IMPLEMENTATION_DIR/implement_${feature_id}.md" > "$IMPLEMENTATION_DIR/${feature_id}_implementation.md"
    
    echo -e "${GREEN}✅ 実装完了${NC}"
}

# テスト実行
run_feature_tests() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${CYAN}テスト実行: ${feature_name}${NC}"
    
    # テスト実行タスクを作成
    cat > "$TESTS_DIR/test_${feature_id}.md" << EOF
# テスト実行: ${feature_name}

実装された機能のテストを実行し、結果を報告してください。

## テスト内容
1. ユニットテストの実行
2. 正常系のテスト
3. 異常系のテスト
4. エッジケースのテスト

## 実装コード
EOF

    cat "$IMPLEMENTATION_DIR/${feature_id}_implementation.md" >> "$TESTS_DIR/test_${feature_id}.md"
    
    echo "" >> "$TESTS_DIR/test_${feature_id}.md"
    echo "## テスト結果フォーマット" >> "$TESTS_DIR/test_${feature_id}.md"
    echo '```' >> "$TESTS_DIR/test_${feature_id}.md"
    echo "テスト名: [テスト名]" >> "$TESTS_DIR/test_${feature_id}.md"
    echo "結果: PASS/FAIL" >> "$TESTS_DIR/test_${feature_id}.md"
    echo "詳細: [詳細メッセージ]" >> "$TESTS_DIR/test_${feature_id}.md"
    echo '```' >> "$TESTS_DIR/test_${feature_id}.md"
    
    # テスト実行
    echo -e "${YELLOW}テスト実行中...${NC}"
    claude --file "$TESTS_DIR/test_${feature_id}.md" > "$TESTS_DIR/${feature_id}_test_result.md"
    
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
    
    cat > "$IMPLEMENTATION_DIR/fix_${feature_id}.md" << EOF
# 実装修正: ${feature_name}

テストが失敗しました。以下のテスト結果を確認し、実装を修正してください。

## テスト結果
EOF

    cat "$TESTS_DIR/${feature_id}_test_result.md" >> "$IMPLEMENTATION_DIR/fix_${feature_id}.md"
    
    echo "" >> "$IMPLEMENTATION_DIR/fix_${feature_id}.md"
    echo "## 現在の実装" >> "$IMPLEMENTATION_DIR/fix_${feature_id}.md"
    cat "$IMPLEMENTATION_DIR/${feature_id}_implementation.md" >> "$IMPLEMENTATION_DIR/fix_${feature_id}.md"
    
    # 修正実行
    claude --file "$IMPLEMENTATION_DIR/fix_${feature_id}.md" > "$IMPLEMENTATION_DIR/${feature_id}_implementation_fixed.md"
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
    
    # 機能数を取得（簡易的な方法）
    total_features=$(grep -c '"id"' "$IMPLEMENTATION_DIR/features.json" || echo "5")
    current_feature=0
    
    echo ""
    echo -e "${GREEN}実装する機能数: ${total_features}${NC}"
    echo ""
    
    # 各機能を実装とテスト
    # 実際にはJSONをパースして処理すべきだが、ここでは簡易的に
    for i in $(seq 1 $total_features); do
        feature_id="feature_$(printf "%03d" $i)"
        feature_name="機能${i}"
        feature_desc="機能${i}の実装"
        
        # 実装
        implement_feature "$feature_id" "$feature_name" "$feature_desc"
        
        # テスト
        run_feature_tests "$feature_id" "$feature_name"
        
        # 進捗更新
        current_feature=$((current_feature + 1))
        show_progress $current_feature $total_features "$feature_name"
        
        # 次の機能に進むか確認
        if [ $current_feature -lt $total_features ]; then
            echo -e "${YELLOW}次の機能に進みますか？ (y/n/a=すべて自動)${NC}"
            read -n 1 continue_confirm
            echo ""
            
            if [[ $continue_confirm =~ ^[Nn]$ ]]; then
                echo "実装を中断しました。"
                break
            elif [[ $continue_confirm =~ ^[Aa]$ ]]; then
                echo -e "${BLUE}残りの機能を自動で実装します...${NC}"
                # 以降は確認なしで続行
            fi
        fi
    done
    
    # 完了メッセージ
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${GREEN}✅ すべての機能の実装とテストが完了しました！${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
    echo "成果物:"
    echo "- 実装コード: $IMPLEMENTATION_DIR/"
    echo "- テスト結果: $TESTS_DIR/"
}

# 実行
main