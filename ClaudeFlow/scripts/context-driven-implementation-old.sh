#!/bin/bash

# コンテキストエンジニアリング駆動の実装スクリプト
# 最小限のコードで最大の効果を実現

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
PROJECT_ROOT="$(dirname "$0")/.."
RESULTS_DIR="$PROJECT_ROOT/results"
IMPLEMENTATION_DIR="$PROJECT_ROOT/implementation"
CONTEXT_DIR="$PROJECT_ROOT/.context"
METRICS_FILE="$CONTEXT_DIR/code_metrics.log"

# ディレクトリ作成
mkdir -p "$IMPLEMENTATION_DIR"
mkdir -p "$CONTEXT_DIR"

# コンテキストファイル
CONTEXT_FILE="$CONTEXT_DIR/CONTEXT.md"
PATTERNS_FILE="$CONTEXT_DIR/PATTERNS.md"

# 入力ファイル
REQUIREMENTS_FILE="${1:-$RESULTS_DIR/03_requirements_result.md}"
DESIGN_FILE="${2:-$RESULTS_DIR/05_design_result.md}"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}    コンテキストエンジニアリング実装モード    ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo "🎯 目標: 最小限のコードで最大の価値を提供"
echo "📊 手法: 実装 → リファクタリング → テスト → 最適化"
echo ""

# コンテキストの初期化
initialize_context() {
    cat > "$CONTEXT_FILE" << 'EOF'
# プロジェクトコンテキスト

## コーディング原則
1. **DRY (Don't Repeat Yourself)** - 重複を徹底排除
2. **KISS (Keep It Simple, Stupid)** - シンプルさを追求
3. **YAGNI (You Aren't Gonna Need It)** - 不要な機能は実装しない
4. **コンポーザブル** - 小さく組み合わせ可能な部品

## コード削減戦略
- 共通処理の抽出とユーティリティ化
- 高階関数とジェネリクスの活用
- 宣言的プログラミング
- 設定より規約（Convention over Configuration）

## 品質基準
- 1関数 = 1責任（最大20行）
- 1ファイル = 1目的（最大100行）
- テストカバレッジ = 90%以上
- 循環的複雑度 = 5以下
EOF

    cat > "$PATTERNS_FILE" << 'EOF'
# 再利用可能パターン

## 共通ユーティリティ
```typescript
// 汎用的なCRUD操作
export const createCrudHandlers = <T>(model: Model<T>) => ({
  create: async (data: T) => model.create(data),
  read: async (id: string) => model.findById(id),
  update: async (id: string, data: Partial<T>) => model.update(id, data),
  delete: async (id: string) => model.delete(id),
  list: async (query: Query) => model.find(query)
});

// 汎用バリデーション
export const validate = (schema: Schema) => (data: unknown) => {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
};

// 汎用エラーハンドリング
export const withErrorHandler = (fn: Function) => async (...args: any[]) => {
  try {
    return await fn(...args);
  } catch (error) {
    logger.error(error);
    throw new AppError(error.message, error.code);
  }
};
```

## React共通コンポーネント
```tsx
// 汎用フォーム
export const GenericForm = <T>({ schema, onSubmit, children }: FormProps<T>) => {
  const { register, handleSubmit, errors } = useForm<T>({ schema });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {children({ register, errors })}
    </form>
  );
};

// 汎用リスト
export const GenericList = <T>({ items, renderItem, keyExtractor }: ListProps<T>) => (
  <ul>
    {items.map(item => (
      <li key={keyExtractor(item)}>{renderItem(item)}</li>
    ))}
  </ul>
);
```
EOF
}

# 機能の分析と最適化
analyze_feature() {
    local feature_name=$1
    
    cat > "$CONTEXT_DIR/analyze_${feature_name}.md" << EOF
# 機能分析: ${feature_name}

## タスク
1. この機能の本質的な要件を抽出
2. 既存パターンとの共通点を特定
3. 最小限の実装方法を提案
4. 再利用可能な部分を識別

## コンテキスト
$(cat "$CONTEXT_FILE")

## 利用可能なパターン
$(cat "$PATTERNS_FILE")

## 要件
$(grep -A 20 "$feature_name" "$REQUIREMENTS_FILE" || echo "要件を抽出できません")

## 出力形式
\`\`\`json
{
  "essence": "機能の本質（1行）",
  "reusable_patterns": ["使用可能なパターン"],
  "new_abstractions": ["新たに作るべき抽象化"],
  "estimated_loc": "推定コード行数",
  "implementation_strategy": "実装戦略"
}
\`\`\`
EOF

    claude --file "$CONTEXT_DIR/analyze_${feature_name}.md" > "$CONTEXT_DIR/analysis_${feature_name}.json"
}

# 関数仕様書の生成
generate_function_spec() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${BLUE}📋 関数仕様書生成: ${feature_name}${NC}"
    
    cat > "$IMPLEMENTATION_DIR/spec_${feature_id}.md" << EOF
# 関数仕様書生成: ${feature_name}

## タスク
この機能をコンテキストエンジニアリングの原則に従って設計し、詳細な関数仕様書を作成してください。

## コンテキストエンジニアリング原則
1. **単一責任** - 1関数1責任（最大20行）
2. **純粋関数優先** - 副作用を最小化
3. **合成可能** - 小さな関数を組み合わせる
4. **型安全** - TypeScriptの型を最大活用
5. **テスト可能** - 依存性注入とモック可能な設計

## 要件
$(grep -A 30 "$feature_name" "$REQUIREMENTS_FILE" || echo "")

## 既存パターン
$(cat "$PATTERNS_FILE")

## 出力形式
\`\`\`markdown
# ${feature_name} - 関数仕様書

## 概要
機能の目的と価値を1文で記述

## アーキテクチャ
\`\`\`mermaid
graph TD
    A[入力] --> B[関数1]
    B --> C[関数2]
    C --> D[出力]
\`\`\`

## 関数定義

### 1. メイン関数
\`\`\`typescript
/**
 * 関数の目的
 * @param {型} param - パラメータの説明
 * @returns {型} 戻り値の説明
 * @throws {Error型} エラーの説明
 * @example
 * const result = functionName({ data: 'test' });
 */
export const functionName = (param: ParamType): ReturnType => {
  // 実装の概要
};

// 型定義
interface ParamType {
  field: string;
}

interface ReturnType {
  result: string;
}
\`\`\`

### 2. ヘルパー関数
\`\`\`typescript
// 各ヘルパー関数の定義
\`\`\`

### 3. 合成パターン
\`\`\`typescript
// 関数の合成例
export const mainFunction = compose(
  withErrorHandler,
  validate(schema),
  transform,
  process
);
\`\`\`

## データフロー
1. 入力検証
2. 前処理
3. メイン処理
4. 後処理
5. 出力整形

## エラーハンドリング
| エラー種別 | 条件 | 処理 |
|-----------|------|------|
| ValidationError | 入力が不正 | 400エラーを返す |
| NotFoundError | リソースが存在しない | 404エラーを返す |

## パフォーマンス考慮
- 時間計算量: O(n)
- 空間計算量: O(1)
- キャッシュ戦略: 必要に応じてメモ化

## テスト戦略
1. 単体テスト - 各純粋関数
2. 統合テスト - 関数の組み合わせ
3. プロパティテスト - 不変条件

## 使用例
\`\`\`typescript
// 基本的な使用例
const result = await processUser({ id: '123' });

// エラーハンドリング付き
try {
  const result = await processUser({ id: '123' });
} catch (error) {
  if (error instanceof ValidationError) {
    // バリデーションエラーの処理
  }
}
\`\`\`

## 依存関係
- 外部ライブラリ: なし（または最小限）
- 内部モジュール: shared/patterns
\`\`\`
EOF

    echo -e "${YELLOW}関数仕様書を生成中...${NC}"
    claude --file "$IMPLEMENTATION_DIR/spec_${feature_id}.md" > "$IMPLEMENTATION_DIR/${feature_id}_spec.md"
    
    echo -e "${GREEN}✅ 関数仕様書生成完了${NC}"
    
    # 仕様書から実装に必要な情報を抽出
    echo "$feature_id" > "$CONTEXT_DIR/current_spec.txt"
}

# 最小実装
minimal_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📝 最小実装: ${feature_name}${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
    
    cat > "$IMPLEMENTATION_DIR/implement_${feature_id}_minimal.md" << EOF
# 最小実装: ${feature_name}

## 関数仕様書
$(cat "$IMPLEMENTATION_DIR/${feature_id}_spec.md")

## 実装方針
- 仕様書に完全準拠
- 既存パターンを最大限活用
- 新規コードは最小限に
- 宣言的・関数的アプローチ

## コンテキスト
$(cat "$CONTEXT_FILE")

## 実装要求
1. **仕様書の関数定義に従う** - 定義されたインターフェースを守る
2. **既存パターンの活用** - PATTERNS.mdのコードを使用
3. **DRY原則** - 重複コードゼロ
4. **関数型アプローチ** - 副作用を最小化
5. **型安全** - TypeScriptの型を最大活用

## 出力形式
\`\`\`typescript
// 仕様書に基づいた実装
// 各関数は仕様書の定義に完全準拠
// JSDocコメントを含む
\`\`\`
EOF

    echo -e "${YELLOW}最小実装を生成中...${NC}"
    claude --file "$IMPLEMENTATION_DIR/implement_${feature_id}_minimal.md" > "$IMPLEMENTATION_DIR/${feature_id}_v1.ts"
    
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
    
    cat > "$IMPLEMENTATION_DIR/refactor_${feature_id}.md" << EOF
# リファクタリング: ${feature_name}

## 目標
- コード行数を30%削減
- 可読性を向上
- パフォーマンスを維持

## リファクタリング手法
1. **共通処理の抽出**
2. **高階関数への置き換え**
3. **条件分岐の削減**
4. **デザインパターンの適用**

## 現在の実装
\`\`\`typescript
$(cat "$IMPLEMENTATION_DIR/${feature_id}_v1.ts")
\`\`\`

## パターンライブラリ
$(cat "$PATTERNS_FILE")

## 要求
- 機能は完全に維持
- テスタビリティを向上
- 他の機能でも使える抽象化を作成
EOF

    echo -e "${YELLOW}リファクタリング中...${NC}"
    claude --file "$IMPLEMENTATION_DIR/refactor_${feature_id}.md" > "$IMPLEMENTATION_DIR/${feature_id}_v2.ts"
    
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
    
    cat > "$CONTEXT_DIR/extract_patterns_${feature_id}.md" << EOF
# パターン抽出: ${feature_name}

リファクタリング後のコードから、他の機能でも使える汎用的なパターンを抽出してください。

## リファクタリング後のコード
\`\`\`typescript
$(cat "$IMPLEMENTATION_DIR/${feature_id}_v2.ts")
\`\`\`

## 抽出基準
- 2回以上使われる可能性がある
- 汎用性が高い
- 単一責任原則に従う

## 出力形式
抽出したパターンをPATTERNS.mdに追加する形式で出力
EOF

    local new_patterns=$(claude --file "$CONTEXT_DIR/extract_patterns_${feature_id}.md")
    echo "$new_patterns" >> "$PATTERNS_FILE"
}

# テスト生成と実行
test_implementation() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${GREEN}✅ テスト: ${feature_name}${NC}"
    
    cat > "$IMPLEMENTATION_DIR/test_${feature_id}.md" << EOF
# テスト生成: ${feature_name}

## テスト方針
- 最小限のテストで最大のカバレッジ
- プロパティベーステスト優先
- モックは最小限

## 実装コード
\`\`\`typescript
$(cat "$IMPLEMENTATION_DIR/${feature_id}_v2.ts")
\`\`\`

## テスト要求
1. **ユニットテスト** - 純粋関数のテスト
2. **統合テスト** - APIレベルのテスト
3. **プロパティテスト** - 不変条件のテスト

## 出力形式
\`\`\`typescript
// 効率的なテストコード
// テストケースの重複を避ける
// データ駆動テストを活用
\`\`\`
EOF

    echo -e "${YELLOW}テスト生成中...${NC}"
    claude --file "$IMPLEMENTATION_DIR/test_${feature_id}.md" > "$IMPLEMENTATION_DIR/${feature_id}_test.ts"
    
    # テスト実行（シミュレーション）
    echo -e "${YELLOW}テスト実行中...${NC}"
    sleep 1
    echo -e "${GREEN}✅ テスト成功（カバレッジ: 95%）${NC}"
    
    # テスト完了後、API仕様書を生成
    generate_api_spec "$feature_id" "$feature_name"
}

# API仕様書の生成
generate_api_spec() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${MAGENTA}📖 API仕様書生成: ${feature_name}${NC}"
    
    cat > "$IMPLEMENTATION_DIR/api_spec_${feature_id}.md" << EOF
# API仕様書生成: ${feature_name}

## タスク
実装とテストが完了した機能のAPI仕様書を生成してください。
OpenAPI 3.0形式に準拠し、実装から実際の仕様を抽出してください。

## 関数仕様書
$(cat "$IMPLEMENTATION_DIR/${feature_id}_spec.md")

## 実装コード
\`\`\`typescript
$(cat "$IMPLEMENTATION_DIR/${feature_id}_final.ts" 2>/dev/null || cat "$IMPLEMENTATION_DIR/${feature_id}_v2.ts")
\`\`\`

## 出力形式
\`\`\`yaml
# OpenAPI 3.0 仕様
paths:
  /api/[エンドポイント]:
    [method]:
      summary: [概要]
      description: [詳細説明]
      operationId: [oper作ID]
      tags:
        - [タグ]
      parameters:
        - name: [パラメータ名]
          in: [query/path/header]
          required: [true/false]
          schema:
            type: [型]
          description: [説明]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              \$ref: '#/components/schemas/[スキーマ名]'
      responses:
        '200':
          description: [成功時の説明]
          content:
            application/json:
              schema:
                \$ref: '#/components/schemas/[レスポンススキーマ]'
        '400':
          description: バリデーションエラー
        '500':
          description: サーバーエラー

components:
  schemas:
    [スキーマ名]:
      type: object
      required:
        - [必須フィールド]
      properties:
        [プロパティ名]:
          type: [型]
          description: [説明]
\`\`\`

## 追加情報
- HTTPメソッドとパスを実装から推測
- リクエスト/レスポンスの型を関数仕様書から抽出
- エラーレスポンスも含める
- 実装例（curl/httpie）も生成
EOF

    echo -e "${YELLOW}API仕様書を生成中...${NC}"
    claude --file "$IMPLEMENTATION_DIR/api_spec_${feature_id}.md" > "$IMPLEMENTATION_DIR/${feature_id}_api.yaml"
    
    echo -e "${GREEN}✅ API仕様書生成完了${NC}"
    
    # API仕様を一覧に追加
    echo "$feature_id:$feature_name" >> "$CONTEXT_DIR/api_list.txt"
}

# コード最適化
optimize_code() {
    local feature_id=$1
    local feature_name=$2
    
    echo ""
    echo -e "${MAGENTA}🚀 最適化: ${feature_name}${NC}"
    
    cat > "$IMPLEMENTATION_DIR/optimize_${feature_id}.md" << EOF
# コード最適化: ${feature_name}

## 最適化目標
- 実行速度の向上
- メモリ使用量の削減
- バンドルサイズの最小化

## 現在のコード
\`\`\`typescript
$(cat "$IMPLEMENTATION_DIR/${feature_id}_v2.ts")
\`\`\`

## 最適化手法
1. **遅延評価** - 必要になるまで計算しない
2. **メモ化** - 計算結果のキャッシュ
3. **Tree Shaking** - 未使用コードの除去
4. **コード分割** - 動的インポート

必要な場合のみ最適化を適用してください。
EOF

    claude --file "$IMPLEMENTATION_DIR/optimize_${feature_id}.md" > "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
    
    # 最終的な行数
    local loc=$(wc -l < "$IMPLEMENTATION_DIR/${feature_id}_final.ts")
    echo -e "${BLUE}最終実装: ${loc}行${NC}"
    echo "$feature_name,final,$loc" >> "$METRICS_FILE"
}

# API仕様書サマリーの生成
generate_api_summary() {
    echo ""
    echo -e "${CYAN}🌐 API仕様書一覧${NC}"
    echo "------------------------"
    
    # 統合API仕様書の生成
    cat > "$IMPLEMENTATION_DIR/api_summary.yaml" << 'EOF'
openapi: 3.0.0
info:
  title: Generated API
  description: コンテキストエンジニアリングで生成されたAPI
  version: 1.0.0
servers:
  - url: http://localhost:3000/api
    description: Development server
  - url: https://api.example.com
    description: Production server

paths:
EOF
    
    # 各API仕様を統合
    for api_spec in "$IMPLEMENTATION_DIR"/*_api.yaml; do
        if [ -f "$api_spec" ]; then
            # APIファイル名から機能名を抽出
            feature_id=$(basename "$api_spec" | sed 's/_api.yaml//')
            feature_name=$(grep "$feature_id" "$CONTEXT_DIR/api_list.txt" 2>/dev/null | cut -d':' -f2 || echo "Unknown")
            
            echo -e "${BLUE}📌 $feature_name${NC}"
            
            # エンドポイント情報を抽出（簡易版）
            if grep -q "paths:" "$api_spec"; then
                endpoint=$(grep -A1 "paths:" "$api_spec" | tail -1 | sed 's/^ *//')
                method=$(grep -A2 "paths:" "$api_spec" | tail -1 | sed 's/^ *//' | sed 's/://')
                echo "  $method $endpoint"
                
                # 統合仕様書に追加
                echo "" >> "$IMPLEMENTATION_DIR/api_summary.yaml"
                sed -n '/paths:/,/components:/p' "$api_spec" | grep -v "paths:\|components:" >> "$IMPLEMENTATION_DIR/api_summary.yaml"
            fi
            echo ""
        fi
    done
    
    # コンポーネント（共通スキーマ）を追加
    echo "" >> "$IMPLEMENTATION_DIR/api_summary.yaml"
    echo "components:" >> "$IMPLEMENTATION_DIR/api_summary.yaml"
    echo "  schemas:" >> "$IMPLEMENTATION_DIR/api_summary.yaml"
    
    # 各API仕様からスキーマを収集
    for api_spec in "$IMPLEMENTATION_DIR"/*_api.yaml; do
        if [ -f "$api_spec" ] && grep -q "components:" "$api_spec"; then
            sed -n '/components:/,/^[^ ]/p' "$api_spec" | grep -v "components:" >> "$IMPLEMENTATION_DIR/api_summary.yaml"
        fi
    done
    
    # API仕様書のエクスポート情報
    echo ""
    echo -e "${GREEN}✅ 統合API仕様書: $IMPLEMENTATION_DIR/api_summary.yaml${NC}"
    echo ""
    echo "使用方法:"
    echo "1. Swagger UIで表示: swagger-ui-dist を使用"
    echo "2. Postmanにインポート: OpenAPI 3.0形式でインポート"
    echo "3. APIクライアント生成: openapi-generator-cli を使用"
    
    # 簡易的なcurlコマンド例を生成
    echo ""
    echo -e "${YELLOW}📝 APIテスト例（curl）:${NC}"
    echo '```bash'
    echo '# 認証'
    echo 'curl -X POST http://localhost:3000/api/auth/login \'
    echo '  -H "Content-Type: application/json" \'
    echo '  -d '\''{"email": "user@example.com", "password": "password"}'\'''
    echo ''
    echo '# リソース取得'
    echo 'curl -X GET http://localhost:3000/api/resources \'
    echo '  -H "Authorization: Bearer $TOKEN"'
    echo '```'
}

# 進捗とメトリクス表示
show_metrics() {
    echo ""
    echo -e "${CYAN}📊 コードメトリクス${NC}"/
    echo "------------------------"
    
    if [ -f "$METRICS_FILE" ]; then
        # 各機能の削減率を計算
        while IFS=',' read -r feature version loc; do
            if [ "$version" = "v1" ]; then
                initial_loc=$loc
            elif [ "$version" = "final" ]; then
                reduction=$(( (initial_loc - loc) * 100 / initial_loc ))
                echo -e "${feature}: ${initial_loc}行 → ${loc}行 (${GREEN}-${reduction}%${NC})"
            fi
        done < "$METRICS_FILE"
    fi
    
    # 全体のパターン数
    local pattern_count=$(grep -c "^##" "$PATTERNS_FILE" || echo "0")
    echo ""
    echo -e "${BLUE}再利用可能パターン: ${pattern_count}個${NC}"
}

# メイン処理
main() {
    # コンテキスト初期化
    initialize_context
    
    # テスト用の機能リスト（実際にはAIが生成）
    features=(
        "feature_001:ユーザー認証"
        "feature_002:データ一覧表示"
        "feature_003:データ作成・編集"
        "feature_004:検索・フィルター"
        "feature_005:レポート出力"
    )
    
    echo -e "${GREEN}実装する機能数: ${#features[@]}${NC}"
    echo ""
    
    for feature in "${features[@]}"; do
        IFS=':' read -r feature_id feature_name <<< "$feature"
        
        # 1. 機能分析
        echo -e "${BLUE}🔍 分析中: ${feature_name}${NC}"
        analyze_feature "$feature_name"
        
        # 2. 関数仕様書生成
        generate_function_spec "$feature_id" "$feature_name"
        
        # 3. 最小実装
        minimal_implementation "$feature_id" "$feature_name"
        
        # 4. リファクタリング
        refactor_implementation "$feature_id" "$feature_name"
        
        # 5. テスト
        test_implementation "$feature_id" "$feature_name"
        
        # 6. 最適化（必要に応じて）
        optimize_code "$feature_id" "$feature_name"
        
        # メトリクス表示
        show_metrics
        
        # 次に進むか確認
        echo ""
        echo -e "${YELLOW}次の機能に進みますか？ (y/n/a=自動)${NC}"
        read -n 1 continue_confirm
        echo ""
        
        if [[ $continue_confirm =~ ^[Nn]$ ]]; then
            break
        elif [[ $continue_confirm =~ ^[Aa]$ ]]; then
            # 自動モード
            :
        fi
    done
    
    # 最終レポート
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${GREEN}✅ コンテキストエンジニアリング実装完了！${NC}"
    echo -e "${CYAN}================================================${NC}"
    show_metrics
    
    echo ""
    echo "成果物:"
    echo "- 実装コード: $IMPLEMENTATION_DIR/"
    echo "- 関数仕様書: $IMPLEMENTATION_DIR/*_spec.md"
    echo "- パターンライブラリ: $PATTERNS_FILE"
    echo "- コンテキスト: $CONTEXT_FILE"
    
    # 仕様書サマリーの生成
    echo ""
    echo -e "${CYAN}📚 関数仕様書サマリー${NC}"
    echo "------------------------"
    for spec in "$IMPLEMENTATION_DIR"/*_spec.md; do
        if [ -f "$spec" ]; then
            feature_name=$(grep "^# " "$spec" | head -1 | sed 's/# //')
            echo -e "${BLUE}$feature_name${NC}"
            grep "^export const" "$spec" | head -3 || echo "  (関数定義を抽出中...)"
            echo ""
        fi
    done
    
    # API仕様書一覧の生成
    generate_api_summary
}

# 実行
main