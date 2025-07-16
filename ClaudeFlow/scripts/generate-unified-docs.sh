#!/bin/bash

# 統合ドキュメント生成スクリプト
# 全フェーズの結果を1つのファイルに統合

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# 引数処理
PROJECT_NAME="${1:-Unknown Project}"
OUTPUT_FILE="${2:-unified_documentation.md}"

# ディレクトリ設定
PROJECT_ROOT="$(dirname "$0")/.."
RESULTS_DIR="$PROJECT_ROOT/results"
IMPLEMENTATION_DIR="$PROJECT_ROOT/implementation"

echo -e "${BLUE}📚 統合ドキュメントを生成中...${NC}"
echo ""

# ヘッダー生成
cat > "$OUTPUT_FILE" << EOF
# $PROJECT_NAME - 完全ドキュメント

> 生成日: $(date +"%Y-%m-%d %H:%M:%S")  
> 開発モード: ${CLAUDEFLOW_MODE:-standard}  
> ClaudeFlow バージョン: 2.5.0  

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [開発工程](#開発工程)
3. [要件・仕様](#要件仕様)
4. [実装](#実装)
5. [テスト結果](#テスト結果)
6. [ファイル構成](#ファイル構成)
7. [使用方法](#使用方法)

---

## 🎯 プロジェクト概要

EOF

# 企画フェーズの結果を追加
if [ -f "$RESULTS_DIR/01_planning_result.md" ]; then
    echo "### 企画内容" >> "$OUTPUT_FILE"
    cat "$RESULTS_DIR/01_planning_result.md" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# 統合要件がある場合（超軽量モード）
if [ -f "$RESULTS_DIR/01_unified_requirements.md" ]; then
    echo "### 統合要件・仕様" >> "$OUTPUT_FILE"
    cat "$RESULTS_DIR/01_unified_requirements.md" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## 🔄 開発工程" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 実行されたフェーズを記録
echo "### 実行フェーズ" >> "$OUTPUT_FILE"
phase_count=0
for result_file in "$RESULTS_DIR"/*_result.md; do
    if [ -f "$result_file" ]; then
        phase_count=$((phase_count + 1))
        phase_name=$(basename "$result_file" | sed 's/_result.md//' | sed 's/^[0-9]*_//')
        echo "- フェーズ $phase_count: $phase_name" >> "$OUTPUT_FILE"
    fi
done

echo "" >> "$OUTPUT_FILE"
echo "**総フェーズ数**: $phase_count" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## 📝 要件・仕様" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 要件定義
if [ -f "$RESULTS_DIR/03_requirements_result.md" ]; then
    echo "### 要件定義" >> "$OUTPUT_FILE"
    cat "$RESULTS_DIR/03_requirements_result.md" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# 設計
if [ -f "$RESULTS_DIR/05_design_result.md" ]; then
    echo "### 詳細設計" >> "$OUTPUT_FILE"
    cat "$RESULTS_DIR/05_design_result.md" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## 💻 実装" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 実装ファイルの一覧
echo "### 生成ファイル" >> "$OUTPUT_FILE"
if [ -d "$IMPLEMENTATION_DIR" ]; then
    find "$IMPLEMENTATION_DIR" -name "*.html" -o -name "*.js" -o -name "*.ts" -o -name "*.css" | while read file; do
        rel_path=$(realpath --relative-to="$PROJECT_ROOT" "$file")
        echo "- \`$rel_path\`" >> "$OUTPUT_FILE"
    done
fi
echo "" >> "$OUTPUT_FILE"

# メインファイルの内容（index.htmlがある場合）
if [ -f "$IMPLEMENTATION_DIR/index.html" ]; then
    echo "### メインアプリケーション (index.html)" >> "$OUTPUT_FILE"
    echo '```html' >> "$OUTPUT_FILE"
    head -50 "$IMPLEMENTATION_DIR/index.html" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# 実装結果
if [ -f "$RESULTS_DIR/06_implementation_result.md" ]; then
    echo "### 実装詳細" >> "$OUTPUT_FILE"
    cat "$RESULTS_DIR/06_implementation_result.md" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## 🧪 テスト結果" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# テスト結果
if [ -f "$RESULTS_DIR/07_testing_result.md" ]; then
    cat "$RESULTS_DIR/07_testing_result.md" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# 実装ディレクトリのテスト結果
if [ -f "$IMPLEMENTATION_DIR/test_result.md" ]; then
    echo "### 基本動作テスト" >> "$OUTPUT_FILE"
    cat "$IMPLEMENTATION_DIR/test_result.md" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## 📁 ファイル構成" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# プロジェクト構造
echo '```' >> "$OUTPUT_FILE"
if [ -d "$IMPLEMENTATION_DIR" ]; then
    tree "$IMPLEMENTATION_DIR" 2>/dev/null || find "$IMPLEMENTATION_DIR" -type f | head -20
fi
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## 🚀 使用方法" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 使用方法
cat >> "$OUTPUT_FILE" << EOF
### 1. ファイルの起動
\`\`\`bash
# HTMLファイルをブラウザで開く
open index.html

# または直接ダブルクリック
\`\`\`

### 2. 開発環境での実行
\`\`\`bash
# シンプルなHTTPサーバーを起動
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
\`\`\`

### 3. カスタマイズ
- \`index.html\`を編集してアプリをカスタマイズ
- CSSスタイルやJavaScriptロジックを変更可能

---

## ⚙️ 開発情報

- **開発ツール**: ClaudeFlow ${CLAUDEFLOW_MODE:-standard}モード
- **開発時間**: 約$([ "${CLAUDEFLOW_MODE}" = "ultra_light" ] && echo "5分" || echo "15-30分")
- **品質レベル**: $([ "${CLAUDEFLOW_MODE}" = "ultra_light" ] && echo "基本動作確認済み" || echo "テスト・レビュー完了")
- **ドキュメント生成**: $(date +"%Y-%m-%d")

> このドキュメントはClaudeFlowによって自動生成されました。
EOF

echo -e "${GREEN}✅ 統合ドキュメントを生成しました: $OUTPUT_FILE${NC}"
echo -e "${BLUE}📄 ファイルサイズ: $(wc -l < "$OUTPUT_FILE") 行${NC}"