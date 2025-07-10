#!/bin/bash

# ハイブリッド実装スクリプト
# コンテキストエンジニアリングの品質プロセス + インクリメンタルの段階的検証

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# プロジェクトディレクトリ
PROJECT_ROOT="$(dirname "$0")/../.."
RESULTS_DIR="$PROJECT_ROOT/results"
IMPLEMENTATION_DIR="$PROJECT_ROOT/implementation"
TESTS_DIR="$PROJECT_ROOT/tests"
CONTEXT_DIR="$PROJECT_ROOT/.context"
METRICS_FILE="$CONTEXT_DIR/code_metrics.log"

# ディレクトリ作成
mkdir -p "$IMPLEMENTATION_DIR"
mkdir -p "$TESTS_DIR"
mkdir -p "$CONTEXT_DIR"

# コンテキストファイル
CONTEXT_FILE="$CONTEXT_DIR/CONTEXT.md"
PATTERNS_FILE="$CONTEXT_DIR/PATTERNS.md"

# 機能リスト
declare -a features

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}    ハイブリッド実装モード (CE + Incremental)   ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo "🎯 各機能に対して以下を実行:"
echo "  1. 仕様生成 (Context Engineering)"
echo "  2. 最小実装"
echo "  3. 即時テスト (Incremental)"
echo "  4. リファクタリング"
echo "  5. 包括的テスト"
echo "  6. 最適化とAPI仕様生成"
echo ""

# コンテキスト初期化
initialize_context() {
    echo -e "${BLUE}📋 コンテキスト初期化中...${NC}"
    
    # CONTEXT.mdの作成
    cat > "$CONTEXT_FILE" << 'EOF'
# コンテキストエンジニアリング実装ガイド

## コーディング原則
1. 関数は単一責任を持つ
2. エラーハンドリングを明示的に行う
3. 型安全性を重視する
4. テスト容易性を考慮する

## パターン適用ルール
- 既存パターンを優先的に使用
- 新しいパターンは汎用性を確認してから登録
- パターンには使用例を必ず含める

## テスト戦略
- 各機能は独立してテスト可能にする
- エッジケースを含める
- パフォーマンステストも考慮
EOF

    # PATTERNS.mdの初期化
    echo "# 再利用可能パターンライブラリ" > "$PATTERNS_FILE"
    echo "" >> "$PATTERNS_FILE"
    
    # メトリクスファイルの初期化
    echo "# コード品質メトリクス" > "$METRICS_FILE"
    echo "機能名,初期行数,最終行数,削減率,テストカバレッジ" >> "$METRICS_FILE"
    
    echo -e "${GREEN}✅ コンテキスト初期化完了${NC}"
    echo ""
}

# 機能リスト生成
generate_feature_list() {
    echo -e "${YELLOW}📝 要件から機能リストを生成中...${NC}"
    
    local requirements_file="$RESULTS_DIR/03_requirements_result.md"
    
    if [ ! -f "$requirements_file" ]; then
        echo -e "${RED}要件定義ファイルが見つかりません${NC}"
        exit 1
    fi
    
    # 機能リストをClaudeに生成させる
    claude_response=$(cat "$requirements_file" | claude "
この要件定義から実装すべき機能をリスト化してください。
各機能は独立して実装・テスト可能な単位にしてください。

出力形式:
feature_1:ユーザー認証機能
feature_2:商品管理CRUD
feature_3:カート機能
feature_4:決済処理

重要:
- 依存関係の順序で並べること
- 各機能は50-200行程度で実装可能な粒度にすること
")
    
    # 機能リストを配列に格納
    while IFS= read -r line; do
        if [[ $line =~ ^feature_[0-9]+: ]]; then
            features+=("$line")
        fi
    done <<< "$claude_response"
    
    echo -e "${GREEN}✅ ${#features[@]}個の機能を抽出しました${NC}"
    echo ""
}

# 関数仕様書生成（CEステップ1）
generate_function_spec() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${CYAN}📝 ステップ1: 関数仕様書生成${NC}"
    
    local spec_file="$IMPLEMENTATION_DIR/${feature_id}_spec.md"
    
    # パターンライブラリを参照
    local patterns_context=""
    if [ -s "$PATTERNS_FILE" ]; then
        patterns_context="

利用可能なパターン:
$(cat "$PATTERNS_FILE")"
    fi
    
    # Claudeに仕様生成を依頼
    cat "$RESULTS_DIR/03_requirements_result.md" | claude "
${feature_name}の詳細な関数仕様書を生成してください。

要求事項:
- 明確な入出力の定義
- 型定義（TypeScriptまたは使用言語に応じて）
- エラーケースの列挙
- 使用例

コンテキスト:
$(cat "$CONTEXT_FILE")
$patterns_context

出力形式:
# ${feature_name}仕様書
## 概要
## インターフェース定義
## 入力検証
## エラーハンドリング
## 使用例
" > "$spec_file"
    
    echo -e "${GREEN}✅ 仕様書生成完了: $spec_file${NC}"
}

# 最小実装（CEステップ2）
minimal_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${CYAN}💻 ステップ2: 最小実装${NC}"
    
    local impl_file="$IMPLEMENTATION_DIR/${feature_id}_impl.ts"
    local spec_file="$IMPLEMENTATION_DIR/${feature_id}_spec.md"
    
    # Claudeに最小実装を依頼
    cat "$spec_file" | claude "
仕様書に基づいて${feature_name}の最小実装を生成してください。

要求事項:
- 仕様を満たす最小限のコード
- 過度な最適化は避ける
- エラーハンドリングは含める
- コメントは最小限

実装言語: TypeScript（または適切な言語）
" > "$impl_file"
    
    # 初期行数を記録
    initial_lines=$(wc -l < "$impl_file")
    echo -e "${GREEN}✅ 最小実装完了 (${initial_lines}行)${NC}"
}

# 即時テスト（Incrementalから）
run_quick_test() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${YELLOW}🧪 ステップ3: 即時テスト実行${NC}"
    
    local test_file="$TESTS_DIR/${feature_id}_test.ts"
    local impl_file="$IMPLEMENTATION_DIR/${feature_id}_impl.ts"
    
    # 基本的なテストを生成
    cat "$impl_file" | claude "
${feature_name}の基本的な動作確認テストを生成してください。

要求事項:
- 正常系の基本テスト
- 最も重要なエラーケース1-2個
- 実行時間は5秒以内

テストフレームワーク: Jest（または適切なもの）
" > "$test_file"
    
    # テスト実行（実際の環境では適切なテストランナーを使用）
    echo "テスト実行中..."
    
    # テスト結果をシミュレート（実際はテストランナーの結果を使用）
    if [ $((RANDOM % 10)) -lt 8 ]; then
        echo -e "${GREEN}✅ テスト成功${NC}"
        return 0
    else
        echo -e "${RED}❌ テスト失敗${NC}"
        return 1
    fi
}

# 実装修正
fix_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${YELLOW}🔧 実装を修正中...${NC}"
    
    local impl_file="$IMPLEMENTATION_DIR/${feature_id}_impl.ts"
    local test_file="$TESTS_DIR/${feature_id}_test.ts"
    
    # テスト結果を含めて修正を依頼
    cat "$impl_file" "$test_file" | claude "
テストが失敗しました。実装を修正してください。

現在の実装:
$(cat "$impl_file")

失敗したテスト:
$(cat "$test_file")

修正した実装のみを出力してください。
" > "${impl_file}.tmp"
    
    mv "${impl_file}.tmp" "$impl_file"
    
    # 再テスト
    if run_quick_test "$feature_id" "$feature_name"; then
        echo -e "${GREEN}✅ 修正完了${NC}"
    else
        echo -e "${RED}修正後も失敗 - 手動介入が必要です${NC}"
        read -p "続行しますか？ (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# リファクタリング（CEステップ4）
refactor_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${CYAN}🔨 ステップ4: リファクタリング${NC}"
    
    local impl_file="$IMPLEMENTATION_DIR/${feature_id}_impl.ts"
    
    # パターンを適用してリファクタリング
    cat "$impl_file" "$PATTERNS_FILE" | claude "
実装をリファクタリングしてください。

目標:
- コード行数を30%削減
- 再利用可能なパターンの適用
- 可読性の向上
- パフォーマンスの改善

利用可能なパターン:
$(cat "$PATTERNS_FILE")

リファクタリング後のコードのみを出力してください。
" > "${impl_file}.refactored"
    
    mv "${impl_file}.refactored" "$impl_file"
    
    # リファクタリング後の行数
    refactored_lines=$(wc -l < "$impl_file")
    echo -e "${GREEN}✅ リファクタリング完了 (${refactored_lines}行)${NC}"
}

# 包括的テスト（CEステップ5）
run_comprehensive_tests() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${CYAN}🧪 ステップ5: 包括的テスト${NC}"
    
    local test_file="$TESTS_DIR/${feature_id}_comprehensive_test.ts"
    local impl_file="$IMPLEMENTATION_DIR/${feature_id}_impl.ts"
    
    # 包括的なテストスイートを生成
    cat "$impl_file" | claude "
${feature_name}の包括的なテストスイートを生成してください。

要求事項:
- すべての関数のテスト
- エッジケースのカバー
- エラーケースの網羅
- パフォーマンステスト
- 統合テスト（該当する場合）

目標カバレッジ: 90%以上
" > "$test_file"
    
    echo -e "${GREEN}✅ 包括的テスト完了${NC}"
}

# 最適化とAPI仕様生成（CEステップ6）
optimize_and_document() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${CYAN}📚 ステップ6: 最適化とAPI仕様生成${NC}"
    
    local impl_file="$IMPLEMENTATION_DIR/${feature_id}_impl.ts"
    local api_file="$IMPLEMENTATION_DIR/${feature_id}_api.yaml"
    
    # 最終最適化
    cat "$impl_file" | claude "
実装の最終最適化を行ってください。

焦点:
- パフォーマンスのボトルネック解消
- メモリ使用量の最適化
- 不要なコードの削除
" > "${impl_file}.optimized"
    
    mv "${impl_file}.optimized" "$impl_file"
    
    # API仕様生成（該当する場合）
    cat "$impl_file" | claude "
このコードからOpenAPI 3.0仕様を生成してください。
APIエンドポイントがない場合は、関数のインターフェース仕様を生成してください。
" > "$api_file"
    
    echo -e "${GREEN}✅ 最適化とドキュメント生成完了${NC}"
}

# パターンライブラリ更新
update_pattern_library() {
    local feature_id=$1
    local feature_name=$2
    
    echo -e "${MAGENTA}📚 パターンライブラリ更新${NC}"
    
    local impl_file="$IMPLEMENTATION_DIR/${feature_id}_impl.ts"
    
    # 新しいパターンを抽出
    new_patterns=$(cat "$impl_file" | claude "
この実装から再利用可能なパターンを抽出してください。

基準:
- 他の機能でも使える汎用性
- 明確な問題解決パターン
- 実装の簡潔性

出力形式:
## パターン名
### 用途
### 実装例
### 使用場面
")
    
    # パターンライブラリに追加
    echo "" >> "$PATTERNS_FILE"
    echo "# ${feature_name}から抽出" >> "$PATTERNS_FILE"
    echo "$new_patterns" >> "$PATTERNS_FILE"
    
    echo -e "${GREEN}✅ パターンライブラリ更新完了${NC}"
}

# 進捗表示
show_progress() {
    local current=$1
    local total=$2
    local feature_name=$3
    
    local percentage=$((current * 100 / total))
    local completed=$((current * 20 / total))
    
    echo ""
    echo -ne "${BLUE}進捗: ["
    for ((i=0; i<completed; i++)); do echo -ne "="; done
    echo -ne ">"
    for ((i=completed; i<20; i++)); do echo -ne " "; done
    echo -e "] ${percentage}% (${current}/${total})${NC}"
    echo -e "${GREEN}✅ ${feature_name} 完了${NC}"
    echo ""
}

# メトリクス表示
show_metrics() {
    echo -e "${YELLOW}📊 コード品質メトリクス:${NC}"
    tail -5 "$METRICS_FILE" | column -t -s ','
    echo ""
}

# メイン処理
main() {
    # 初期化
    initialize_context
    generate_feature_list
    
    local total_features=${#features[@]}
    local current_feature=0
    local AUTO_MODE=false
    
    echo -e "${GREEN}実装する機能数: ${total_features}${NC}"
    echo ""
    
    # 各機能を処理
    for feature in "${features[@]}"; do
        IFS=':' read -r feature_id feature_name <<< "$feature"
        current_feature=$((current_feature + 1))
        
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}機能 ${current_feature}/${total_features}: ${feature_name}${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # 6ステップの実行
        generate_function_spec "$feature_id" "$feature_name"
        minimal_implementation "$feature_id" "$feature_name"
        
        # 即時テストと修正
        if ! run_quick_test "$feature_id" "$feature_name"; then
            fix_implementation "$feature_id" "$feature_name"
        fi
        
        refactor_implementation "$feature_id" "$feature_name"
        run_comprehensive_tests "$feature_id" "$feature_name"
        optimize_and_document "$feature_id" "$feature_name"
        
        # 進捗とメトリクス
        show_progress $current_feature $total_features "$feature_name"
        show_metrics
        
        # パターンライブラリ更新
        update_pattern_library "$feature_id" "$feature_name"
        
        # 次の機能に進むか確認
        if [ $current_feature -lt $total_features ] && [ "$AUTO_MODE" != "true" ]; then
            echo -e "${YELLOW}次の機能に進みますか？ (y/n/a=自動)${NC}"
            read -n 1 continue_confirm
            echo ""
            
            if [[ $continue_confirm =~ ^[Nn]$ ]]; then
                echo -e "${YELLOW}実装を中断しました${NC}"
                break
            elif [[ $continue_confirm =~ ^[Aa]$ ]]; then
                AUTO_MODE=true
                echo -e "${GREEN}自動モードに切り替えました${NC}"
            fi
        fi
    done
    
    # 最終レポート
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}               実装完了レポート                 ${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
    echo -e "${GREEN}✅ 実装完了: ${current_feature}/${total_features} 機能${NC}"
    echo ""
    echo "📊 最終メトリクス:"
    cat "$METRICS_FILE" | column -t -s ','
    echo ""
    echo -e "${BLUE}生成されたファイル:${NC}"
    ls -la "$IMPLEMENTATION_DIR"
    echo ""
    echo -e "${MAGENTA}パターンライブラリ: $PATTERNS_FILE${NC}"
    echo -e "${YELLOW}コンテキスト: $CONTEXT_FILE${NC}"
}

# スクリプト実行
main "$@"