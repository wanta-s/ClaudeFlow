#!/bin/bash

# ユーザー入力を分析して、最適なタスク生成方法を選択するスクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 入力ファイル
INPUT_FILE="${1:-results/00_user_input.md}"
ANALYSIS_DIR="$(dirname "$0")/../.analysis"

# 分析用ディレクトリ作成
mkdir -p "$ANALYSIS_DIR"

# 入力ファイルの存在確認
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${YELLOW}エラー: 入力ファイルが見つかりません: $INPUT_FILE${NC}"
    exit 1
fi

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}        プロジェクト分析とタスク生成            ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Step 1: プロジェクトの分析
echo -e "${BLUE}Step 1: プロジェクトを分析中...${NC}"

cat > "$ANALYSIS_DIR/analyze_project.md" << 'EOF'
# プロジェクト分析タスク

以下のユーザー入力を分析し、プロジェクトの特性を判定してください。

## 分析項目
1. **アプリケーションカテゴリ**
   - ビジネスアプリケーション（業務システム、管理ツール等）
   - エンターテインメント（ゲーム、メディア、創作ツール等）
   - 教育・学習（Eラーニング、トレーニング等）
   - コミュニケーション（チャット、SNS、フォーラム等）
   - ユーティリティ（ツール、自動化、分析等）
   - マーケットプレイス（EC、予約、マッチング等）
   - その他（具体的に特定）

2. **アプリケーション特性**（複数選択可）
   - データ管理中心（CRUD操作が主体）
   - リアルタイムインタラクション（即時反応が必要）
   - ビジュアル/グラフィック重視（ゲーム、デザインツール等）
   - マルチユーザー対応（同時接続、協調作業）
   - オフライン動作可能（ローカル処理重視）
   - AI/自動化機能（推論、最適化、自動処理）
   - 外部サービス連携（API統合、データ連携）
   - コンテンツ配信（動画、音楽、記事等）

3. **実装形態**
   - Webブラウザ向け（レスポンシブ対応）
   - モバイルアプリ（ネイティブ/PWA）
   - デスクトップアプリ
   - API/バックエンドのみ
   - ハイブリッド（複数プラットフォーム）

4. **パフォーマンス要件**
   - 応答速度重視（ゲーム、リアルタイムアプリ）
   - 大規模データ処理（分析、バッチ処理）
   - 同時接続数重視（大規模サービス）
   - 省リソース（組み込み、モバイル）

## 出力形式
```json
{
  "category": "判定したカテゴリ",
  "characteristics": ["特性1", "特性2", "..."],
  "platform": "実装形態",
  "performance_focus": "パフォーマンス要件",
  "core_value": "このアプリの本質的価値（一文で）",
  "special_requirements": ["特殊要件のリスト"],
  "recommended_approach": "template|dynamic|custom",
  "key_features": ["識別した主要機能"],
  "estimated_phases": 9
}
```

## recommendation_approachの基準
- **template**: 一般的なWebアプリで、テンプレートベースで十分
- **dynamic**: 特殊な要件があり、動的なタスク生成が必要
- **custom**: 非常に特殊で、完全カスタムのアプローチが必要

---
ユーザー入力：
EOF

cat "$INPUT_FILE" >> "$ANALYSIS_DIR/analyze_project.md"

# AIに分析させる
cat "$ANALYSIS_DIR/analyze_project.md" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$ANALYSIS_DIR/analysis_result.json"

# 分析結果を読み取り
if [ -f "$ANALYSIS_DIR/analysis_result.json" ]; then
    # JSONから推奨アプローチを抽出（簡易的な方法）
    approach=$(grep -o '"recommended_approach"[[:space:]]*:[[:space:]]*"[^"]*"' "$ANALYSIS_DIR/analysis_result.json" | cut -d'"' -f4)
    
    echo -e "${GREEN}✅ 分析完了${NC}"
    echo ""
    echo "分析結果:"
    cat "$ANALYSIS_DIR/analysis_result.json"
    echo ""
else
    echo -e "${YELLOW}分析に失敗しました。デフォルトのアプローチを使用します。${NC}"
    approach="template"
fi

# Step 2: 推奨アプローチに基づいてタスク生成
echo -e "${BLUE}Step 2: 推奨アプローチ: ${approach}${NC}"
echo ""

case "$approach" in
    "template")
        echo -e "${GREEN}テンプレートベースのタスク生成を実行します...${NC}"
        "$(dirname "$0")/generate-tasks.sh" "$INPUT_FILE"
        ;;
    "dynamic"|"custom")
        echo -e "${GREEN}AIによる動的タスク生成を実行します...${NC}"
        "$(dirname "$0")/generate-dynamic-tasks.sh" "$INPUT_FILE"
        ;;
    *)
        echo -e "${YELLOW}不明なアプローチです。デフォルトを使用します...${NC}"
        "$(dirname "$0")/generate-tasks.sh" "$INPUT_FILE"
        ;;
esac

# クリーンアップ
rm -rf "$ANALYSIS_DIR"

echo ""
echo -e "${CYAN}タスク生成が完了しました！${NC}"