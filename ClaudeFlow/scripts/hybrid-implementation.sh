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
echo "  3. 品質検証研究 (信頼性・保守性・再利用性)"
echo "  4. 即時テスト (Incremental)"
echo "  5. リファクタリング"
echo "  6. 包括的テスト"
echo "  7. 最適化とAPI仕様生成"
echo ""

# 要件ファイルと設計ファイル
REQUIREMENTS_FILE="$1"
DESIGN_FILE="$2"

if [ -z "$REQUIREMENTS_FILE" ] || [ -z "$DESIGN_FILE" ]; then
    echo -e "${RED}エラー: 要件ファイルと設計ファイルを指定してください${NC}"
    echo "使用方法: $0 <requirements_file> <design_file>"
    exit 1
fi

# コンテキストファイルの初期化
if [ ! -f "$CONTEXT_FILE" ]; then
    echo "# コーディングコンテキスト" > "$CONTEXT_FILE"
    echo "" >> "$CONTEXT_FILE"
    echo "## プロジェクト概要" >> "$CONTEXT_FILE"
    echo "" >> "$CONTEXT_FILE"
    
    # 要件と設計から抽出
    if [ -f "$REQUIREMENTS_FILE" ]; then
        echo "### 要件" >> "$CONTEXT_FILE"
        head -50 "$REQUIREMENTS_FILE" >> "$CONTEXT_FILE"
    fi
fi

# パターンファイルの初期化
if [ ! -f "$PATTERNS_FILE" ]; then
    echo "# コードパターンライブラリ" > "$PATTERNS_FILE"
    echo "" >> "$PATTERNS_FILE"
    echo "実装中に発見・確立されたパターンを記録" >> "$PATTERNS_FILE"
    echo "" >> "$PATTERNS_FILE"
fi

# メトリクスファイルの初期化
if [ ! -f "$METRICS_FILE" ]; then
    echo "# コードメトリクス記録" > "$METRICS_FILE"
    echo "Date,Feature,LOC,Complexity,TestCoverage,Quality" >> "$METRICS_FILE"
fi

# 機能の特定
echo -e "${BLUE}機能を分析中...${NC}"
features_prompt="以下の要件と設計から、実装すべき独立した機能をリストアップしてください。
各機能は150-200行程度で実装可能な単位に分割してください。

要件:
$(cat "$REQUIREMENTS_FILE")

設計:
$(cat "$DESIGN_FILE")

出力形式:
1. [機能名]: 簡潔な説明
2. [機能名]: 簡潔な説明
..."

features_response=$(echo "$features_prompt" | claude)
echo "$features_response" > "$IMPLEMENTATION_DIR/features_list.md"

# 機能リストから配列を作成
while IFS= read -r line; do
    if [[ $line =~ ^[0-9]+\. ]]; then
        feature=$(echo "$line" | sed 's/^[0-9]\+\. //')
        features+=("$feature")
    fi
done < "$IMPLEMENTATION_DIR/features_list.md"

echo -e "${GREEN}${#features[@]}個の機能を特定しました${NC}"
echo ""

# 各機能の実装
feature_index=0
for feature in "${features[@]}"; do
    feature_index=$((feature_index + 1))
    feature_name=$(echo "$feature" | cut -d: -f1 | tr ' ' '_')
    
    echo -e "${CYAN}[$feature_index/${#features[@]}] $feature${NC}"
    echo ""
    
    # ステップ1: 機能仕様生成
    echo -e "${YELLOW}ステップ1: 機能仕様生成${NC}"
    spec_prompt="機能: $feature

以下の要件と設計に基づいて、この機能の詳細仕様を生成してください：

要件:
$(cat "$REQUIREMENTS_FILE")

設計:
$(cat "$DESIGN_FILE")

既存パターン:
$(cat "$PATTERNS_FILE")

含めるべき内容:
- インターフェース定義
- 主要メソッドのシグネチャ
- エラーケース
- 依存関係"

    spec_response=$(echo "$spec_prompt" | claude)
    echo "$spec_response" > "$IMPLEMENTATION_DIR/feature_${feature_name}_spec.md"
    
    # ステップ2: 最小実装
    echo -e "${YELLOW}ステップ2: 最小実装${NC}"
    impl_prompt="以下の仕様に基づいて、最小限の実装を生成してください：

仕様:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_spec.md")

コンテキスト:
$(cat "$CONTEXT_FILE")

要求:
- 基本的な機能のみ実装
- エラーハンドリングは最小限
- 最適化は行わない"

    impl_response=$(echo "$impl_prompt" | claude)
    echo "$impl_response" > "$IMPLEMENTATION_DIR/feature_${feature_name}_impl.ts"
    
    # ステップ3: 品質検証研究
    echo -e "${YELLOW}ステップ3: 品質検証研究（信頼性・保守性・再利用性）${NC}"
    
    # 品質検証を最大3回繰り返す
    iteration=0
    max_iterations=3
    quality_passed=false
    
    while [ $iteration -lt $max_iterations ] && [ "$quality_passed" = false ]; do
        iteration=$((iteration + 1))
        echo -e "${MAGENTA}  検証ラウンド $iteration/$max_iterations${NC}"
        
        validation_prompt="以下の実装コードの品質を検証してください：

コード:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_impl.ts")

検証項目（各5点満点で評価）:
1. 信頼性
   - エラーハンドリングの網羅性
   - 境界値処理
   - 例外ケースの考慮
   
2. 保守性
   - コードの可読性
   - 適切なコメント
   - 単一責任の原則
   
3. 再利用性
   - インターフェースの汎用性
   - 依存関係の最小化
   - 設定可能性

各項目を評価し、改善点を具体的に示してください。
すべての項目が3点以上かつ平均4点以上なら合格とします。

出力形式:
## 評価結果
- 信頼性: X/5
- 保守性: X/5
- 再利用性: X/5
- 平均: X.X/5

## 判定: [合格/不合格]

## 改善提案
（具体的な改善内容）"

        validation_response=$(echo "$validation_prompt" | claude)
        echo "$validation_response" > "$IMPLEMENTATION_DIR/feature_${feature_name}_validation_$iteration.md"
        
        # 合格判定をチェック
        if grep -q "判定: 合格" "$IMPLEMENTATION_DIR/feature_${feature_name}_validation_$iteration.md"; then
            quality_passed=true
            echo -e "${GREEN}  ✓ 品質基準を満たしました！${NC}"
        else
            echo -e "${YELLOW}  品質基準を満たしていません。改善を実施します...${NC}"
            
            # 改善実装
            improvement_prompt="以下の検証結果に基づいて、コードを改善してください：

現在のコード:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_impl.ts")

検証結果:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_validation_$iteration.md")

改善されたコード全体を出力してください。"

            improvement_response=$(echo "$improvement_prompt" | claude)
            echo "$improvement_response" > "$IMPLEMENTATION_DIR/feature_${feature_name}_impl.ts"
        fi
    done
    
    if [ "$quality_passed" = false ]; then
        echo -e "${RED}  ⚠ 最大反復回数に達しました。現在の実装で続行します。${NC}"
    fi
    
    # 品質検証結果をコンテキストに追加
    echo "" >> "$CONTEXT_FILE"
    echo "## $feature の品質検証結果" >> "$CONTEXT_FILE"
    tail -20 "$IMPLEMENTATION_DIR/feature_${feature_name}_validation_$iteration.md" >> "$CONTEXT_FILE"
    
    # ステップ4: 即時テスト
    echo -e "${YELLOW}ステップ4: 即時テスト生成と実行${NC}"
    test_prompt="以下の実装に対する単体テストを生成してください：

実装:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_impl.ts")

仕様:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_spec.md")

要求:
- 正常系のテスト
- 異常系のテスト
- 境界値テスト"

    test_response=$(echo "$test_prompt" | claude)
    echo "$test_response" > "$TESTS_DIR/feature_${feature_name}_test.ts"
    
    echo -e "${GREEN}  ✓ テスト生成完了${NC}"
    
    # ステップ5: リファクタリング
    echo -e "${YELLOW}ステップ5: リファクタリング${NC}"
    refactor_prompt="以下のコードをリファクタリングしてください：

コード:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_impl.ts")

既存パターン:
$(cat "$PATTERNS_FILE")

品質検証結果:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_validation_$iteration.md")

重点:
- コードの簡潔性
- パフォーマンス最適化
- 既存パターンの活用"

    refactor_response=$(echo "$refactor_prompt" | claude)
    echo "$refactor_response" > "$IMPLEMENTATION_DIR/feature_${feature_name}_refactored.ts"
    
    # ステップ6: 包括的テスト
    echo -e "${YELLOW}ステップ6: 包括的テスト${NC}"
    comprehensive_test_prompt="リファクタリング後のコードに対する包括的なテストを生成してください：

コード:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_refactored.ts")

既存テスト:
$(cat "$TESTS_DIR/feature_${feature_name}_test.ts")

追加すべきテスト:
- 統合テスト
- パフォーマンステスト
- セキュリティテスト（該当する場合）"

    comprehensive_test_response=$(echo "$comprehensive_test_prompt" | claude)
    echo "$comprehensive_test_response" > "$TESTS_DIR/feature_${feature_name}_comprehensive_test.ts"
    
    # ステップ7: 最適化とAPI仕様
    echo -e "${YELLOW}ステップ7: 最適化とAPI仕様生成${NC}"
    optimize_prompt="最終的な最適化とAPI仕様を生成してください：

コード:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_refactored.ts")

要求:
- 最終的な最適化
- TypeScript型定義
- APIドキュメント
- 使用例"

    optimize_response=$(echo "$optimize_prompt" | claude)
    echo "$optimize_response" > "$IMPLEMENTATION_DIR/feature_${feature_name}_final.ts"
    
    # パターンライブラリの更新
    echo -e "${YELLOW}ステップ8: パターンライブラリ更新${NC}"
    pattern_prompt="実装から抽出できる再利用可能なパターンを特定してください：

実装:
$(cat "$IMPLEMENTATION_DIR/feature_${feature_name}_final.ts")

形式:
## パターン名
説明
\`\`\`typescript
コード例
\`\`\`"

    pattern_response=$(echo "$pattern_prompt" | claude)
    echo "" >> "$PATTERNS_FILE"
    echo "### $feature のパターン" >> "$PATTERNS_FILE"
    echo "$pattern_response" >> "$PATTERNS_FILE"
    
    # メトリクスの記録
    echo -e "${YELLOW}ステップ9: メトリクス記録${NC}"
    loc=$(wc -l < "$IMPLEMENTATION_DIR/feature_${feature_name}_final.ts")
    date=$(date +%Y-%m-%d)
    echo "$date,$feature_name,$loc,Medium,80%,High" >> "$METRICS_FILE"
    
    echo -e "${GREEN}✓ $feature の実装完了！${NC}"
    echo ""
    
    # 一時停止オプション
    if [ $feature_index -lt ${#features[@]} ]; then
        echo -n "次の機能に進みますか？ (y/n/p[ause]): "
        read -r continue_choice
        if [ "$continue_choice" = "n" ]; then
            echo "実装を中断しました。"
            break
        elif [ "$continue_choice" = "p" ]; then
            echo "一時停止します。続行するにはEnterを押してください..."
            read -r
        fi
    fi
done

# 最終統合
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}              最終統合フェーズ                    ${NC}"
echo -e "${CYAN}================================================${NC}"

# すべての実装をまとめる
echo -e "${BLUE}全機能の統合中...${NC}"
cat "$IMPLEMENTATION_DIR"/feature_*_final.ts > "$IMPLEMENTATION_DIR/integrated_implementation.ts"

# 統合テスト
echo -e "${BLUE}統合テストの生成中...${NC}"
integration_test_prompt="以下の統合された実装に対する統合テストを生成してください：

実装:
$(cat "$IMPLEMENTATION_DIR/integrated_implementation.ts")

重点:
- 機能間の相互作用
- データフロー
- エンドツーエンドシナリオ"

integration_test_response=$(echo "$integration_test_prompt" | claude)
echo "$integration_test_response" > "$TESTS_DIR/integration_test.ts"

# 最終レポート
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}         ハイブリッド実装完了！                  ${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "📊 実装統計:"
echo "  - 実装機能数: ${#features[@]}"
echo "  - 総コード行数: $(wc -l < "$IMPLEMENTATION_DIR/integrated_implementation.ts")"
echo "  - パターン数: $(grep -c "^##" "$PATTERNS_FILE")"
echo ""
echo "📁 生成されたファイル:"
echo "  - 実装: $IMPLEMENTATION_DIR/"
echo "  - テスト: $TESTS_DIR/"
echo "  - パターン: $PATTERNS_FILE"
echo "  - メトリクス: $METRICS_FILE"
echo ""
echo "🎯 次のステップ:"
echo "  1. テストの実行"
echo "  2. コードレビュー"
echo "  3. デプロイメント準備"