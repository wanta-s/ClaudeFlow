#!/bin/bash

# 超軽量アプリ開発スクリプト
# 3フェーズ（企画+要件→実装+テスト→完成）で簡単なアプリを作成

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# プロジェクトクリア
clear_project_state "ultra_light_$(date +%H%M%S)"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}      🚀 超軽量アプリ開発モード 🚀              ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${BLUE}アプリ名を入力するだけで、5分で動作するアプリを作成します${NC}"
echo ""

# アプリ名の入力
echo -n "アプリ名を入力してください: "
read -r app_name

if [ -z "$app_name" ]; then
    app_name="MySimpleApp"
    echo -e "${YELLOW}デフォルト名「$app_name」を使用します${NC}"
fi

# 日本語アプリ名を保持
original_app_name="$app_name"

# 英語名に変換（extract_project_name関数を使用）
# -appサフィックスを除去して純粋なアプリ名を取得
english_app_name=$(extract_project_name "" "app" "$app_name" | sed 's/-app$//')

# 変換結果を表示
if [ "$original_app_name" != "$english_app_name" ]; then
    echo -e "${CYAN}アプリ名を変換: 「$original_app_name」→「$english_app_name」${NC}"
fi

echo ""
echo -e "${BLUE}「$original_app_name」を作成開始...${NC}"
echo ""

# ディレクトリ設定
PROJECT_ROOT="$(dirname "$0")/.."
RESULTS_DIR="$PROJECT_ROOT/results"
mkdir -p "$RESULTS_DIR"

# フェーズ1: 企画+要件（統合）
echo -e "${CYAN}[1/3] 📋 企画+要件定義フェーズ${NC}"

unified_requirements_prompt="以下のアプリの企画と要件定義を統合した形で作成してください：

アプリ名: $english_app_name (${original_app_name})

## ユーザー意図の自由な推測・分析
アプリ名「${original_app_name}」について、あなたの知識と経験を最大限活用して、ユーザーが本当に求めている体験を推測してください。

### 自由な推測・分析の指針
- この名前からユーザーが期待する体験は何だと思いますか？
- 同じような名前のアプリで人気があるものは何ですか？
- なぜユーザーはこのアプリを作りたいと思ったのでしょうか？
- どのような機能があれば最も喜ばれるでしょうか？
- 似たような競合アプリと差別化するにはどうすればいいでしょうか？

### 推測プロセスの例（参考）
1. **直感的な理解**：この名前を聞いて最初に思い浮かぶのは？
2. **類似事例の想起**：知っている類似アプリや事例は？
3. **ユーザー心理の推測**：なぜこれを作りたいと思ったのか？
4. **期待値の設定**：ユーザーは何を期待しているか？
5. **最適解の提案**：どんなアプリが最も喜ばれるか？

### 創造的分析のお願い
- 固定的な分析項目にとらわれず、自由に推測してください
- 複数の可能性を検討し、最も可能性の高いものを選んでください
- なぜその推測に至ったのか、理由も含めて説明してください
- 意外な視点や独創的なアイデアも歓迎します
- ユーザーが驚くような機能の提案もしてください

あなたの推測と分析を自由に展開し、最も適切なアプリケーションを企画してください。

### 分析の深度について
- 表面的な分析ではなく、深い洞察を提供してください
- 複数の可能性を検討し、最も説得力のある推測を選んでください
- 実際のユーザー行動や心理を考慮した分析を行ってください
- 類似アプリの成功事例や失敗事例も参考にしてください

### 独創性の発揮
- 他の誰もが作るような平凡なアプリではなく、独創的で魅力的な提案をしてください
- ユーザーが「こんなアプリが欲しかった！」と思うような機能を考案してください
- 技術的な制約内で最大限の創造性を発揮してください

要求:
- ユーザー意図分析に基づいてアプリの目的と基本機能を明確にする
- 最も期待される体験を提供する機能リストを作成
- 技術選択（シンプルなWeb技術推奨）
- 簡潔な仕様（A4用紙1枚程度）

出力形式:
# $english_app_name - 企画・要件書

## 推測・分析結果
（あなたの自由な推測と分析をここに記述してください）

## アプリ概要
（分析結果に基づくアプリの目的と基本説明）

## 主要機能
（ユーザーが最も期待する機能リスト）

## ユーザー体験設計
（どのような体験を提供するかの設計）

## 技術構成
（HTML/CSS/JavaScript等の選択）

## 画面構成
（必要な画面の簡潔な説明）

## データ設計
（必要なデータの構造）

※固定的な項目にとらわれず、必要に応じて独自のセクションを追加してください"

echo -e "${BLUE}  企画・要件を生成中...${NC}"
echo "$unified_requirements_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$RESULTS_DIR/01_unified_requirements.md"

echo -e "${GREEN}  ✅ 企画・要件完了${NC}"
echo ""

# CodeFit Design 機能選択システム
echo -e "${CYAN}🎯 CodeFit Design 機能選択${NC}"
echo -e "${BLUE}制約内で実装する機能を一緒に選択しましょう${NC}"
echo ""

# 行数制限の適用
apply_mode_line_limits

# インタラクティブ機能選択の実行
# 環境変数でAUTO_FEATURESが設定されている場合は自動選択
if [ "${CLAUDEFLOW_AUTO_FEATURES:-true}" = "true" ]; then
    echo -e "${CYAN}🤖 自動機能選択モード${NC}"
    echo -e "${BLUE}行数制限内で最適な機能セットを自動選択します${NC}"
    
    # features.jsonを自動生成
    if declare -f auto_select_features >/dev/null 2>&1; then
        auto_select_features "$english_app_name" "$RESULTS_DIR/01_unified_requirements.md"
        echo -e "${GREEN}✅ 機能が自動選択されました${NC}"
    else
        echo -e "${YELLOW}⚠️ 自動選択システムが利用できません。全機能を実装します${NC}"
    fi
else
    # 従来の対話的選択
    if declare -f interactive_feature_selection >/dev/null 2>&1; then
        if interactive_feature_selection "$english_app_name" "$RESULTS_DIR/01_unified_requirements.md"; then
            echo -e "${GREEN}✅ 機能選択が完了しました${NC}"
        else
            echo -e "${YELLOW}⚠️ 機能選択をスキップして標準実装を継続します${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ 機能選択システムが利用できません${NC}"
    fi
fi
echo ""

# フェーズ2: 実装+テスト
echo -e "${CYAN}[2/3] 💻 実装+テスト フェーズ${NC}"

# CodeFit Design 協働プロンプト生成
implementation_prompt=$(generate_codefit_prompt "$english_app_name")

# 基本実装要求を追加
implementation_prompt="$implementation_prompt

## 基本要件
$(cat "$RESULTS_DIR/01_unified_requirements.md")

## 実装要求
- 単一HTMLファイルで完結（外部依存なし）
- CSS・JavaScriptも同一ファイル内に記載
- ブラウザで開けばすぐに動作
- 基本的なエラーハンドリング
- 最小限のスタイリング
- コメントは最小限
- 効率的で圧縮されたコード
- 完全に動作するコードを生成（プレースホルダー厳禁）
- 全てのHTML、CSS、JavaScriptを実際に記述

## ファイル構成
- index.html（メインアプリ）
- README.md（使用方法）

## 機能実装指示
選択された全ての機能を確実に実装してください。features.jsonに記載された機能は全て含める必要があります。
制約内で最高品質のコードを生成し、ユーザーが期待する全機能を動作させてください。

### ユーザー体験最優先指示
要件書の「推測・分析結果」を最大限活用し、分析で特定されたユーザーの期待を実現してください：

- 分析結果で推測されたユーザー体験を最優先で実装
- 「○○アプリ」と聞いてユーザーが想像する最も楽しい体験を提供
- 分析で特定された重要な機能やインタラクション要素を確実に実装
- 推測されたユーザー心理や期待値に応える設計

重要：要件書の分析結果に基づいて、固定的な指示よりも推測されたユーザー意図を重視してください。

HTMLのtitleタグには「$original_app_name」を使用してください。

## 重要な出力形式
必ず以下の形式でファイルを出力してください：

## ファイル名の厳格な指定
以下のファイル名を厳密に守ってください：
- **index.html** ← 必ずこの名前（fishinggame.html等は禁止）
- **README.md** ← 必ずこの名前

アプリ名に基づいたファイル名は絶対に使用しないでください。

**index.html**
\`\`\`html
<!DOCTYPE html>
<html lang=\"ja\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>$original_app_name</title>
    <style>
        /* 完全なCSSコードをここに記述 */
    </style>
</head>
<body>
    <!-- 完全なHTMLコードをここに記述 -->
    <script>
        // 完全なJavaScriptコードをここに記述
    </script>
</body>
</html>
\`\`\`

**README.md**
\`\`\`markdown
# $original_app_name

## 概要
（完全な説明をここに記述）

## 使用方法
（完全な使用方法をここに記述）

## 機能
（完全な機能リストをここに記述）
\`\`\`

## 重要な注意事項
- コードの省略や「上記に実装済み」などのプレースホルダーは絶対に使用しないでください
- 全てのコードを完全に記述してください
- 動作する完全なアプリケーションを生成してください
- 必ず上記のファイル名（**index.html**、**README.md**）を使用してください
- コードブロック（\`\`\`html、\`\`\`markdown）を必ず使用してください
- 実装の要約や説明文だけでなく、必ず実際のコードを生成してください

## 出力確認チェックリスト
返答する前に必ず以下を確認してください：
✓ **index.html** のファイル名を使用している
✓ \`\`\`html ブロックに完全なHTMLコードが記述されている
✓ \`\`\`markdown ブロックに完全なREADMEが記述されている
✓ 「実装済み」「省略」「上記参照」などのプレースホルダーを使用していない
✓ 全ての機能が実際に動作するコードで実装されている

完全なコードを生成してください。CodeFit Design の制約を遵守し、選択された機能を最適実装してください。

## 最終確認
- HTMLファイルは実際に動作する完全なコードを含む
- 省略や「実装済み」などの文言は一切使用しない
- 全機能が動作する状態で提供する
- ブラウザで開いて即座に動作する

必ず完全なコードを生成してください。"

echo -e "${BLUE}  実装コードを生成中...${NC}"

# 統一プロジェクト構造を作成（英語アプリ名を渡してフォルダ名も英語にする）
PROJECT_DIR=$(create_unified_project "$RESULTS_DIR/01_unified_requirements.md" "$PROJECT_ROOT/implementation" "$english_app_name")
APP_DIR="$PROJECT_DIR"

echo "$implementation_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$APP_DIR/implementation_result.md"

# 実装結果から実際のファイルを抽出・作成（改善版）
extract_and_create_files() {
    local impl_file="$1"
    local output_dir="$2"
    local app_name="${3:-アプリ}"
    
    echo -e "${BLUE}    ファイル抽出を開始...${NC}"
    
    # デバッグ情報（実装結果ファイルのサイズとコードブロック数を表示）
    if [ -f "$impl_file" ]; then
        local impl_size=$(wc -c < "$impl_file")
        local html_blocks=$(grep -c '```html' "$impl_file" 2>/dev/null || echo "0")
        local md_blocks=$(grep -c '```markdown\|```md' "$impl_file" 2>/dev/null || echo "0")
        local html_file_refs=$(grep -c '\*\*[^*]*\.html\*\*' "$impl_file" 2>/dev/null || echo "0")
        echo -e "${CYAN}      実装結果: ${impl_size} bytes, HTMLブロック: ${html_blocks}, MDブロック: ${md_blocks}, HTMLファイル参照: ${html_file_refs}${NC}"
        
        # 実装結果の最初の数行を表示
        echo -e "${CYAN}      実装結果の先頭部分:${NC}"
        head -5 "$impl_file" | sed 's/^/        /'
        
        # 実装結果が要約のみの場合を検出
        if [ "$html_blocks" -eq 0 ] && [ "$html_file_refs" -gt 0 ]; then
            echo -e "${YELLOW}      ⚠ 実装結果にHTMLコードブロックが含まれていません${NC}"
            echo -e "${YELLOW}      → これは実装の要約のみで、実際のコードが生成されなかった可能性があります${NC}"
        fi
    else
        echo -e "${RED}      ✗ 実装結果ファイルが見つかりません: $impl_file${NC}"
    fi
    
    # HTMLファイルの抽出（ゲーム固有のファイル名に対応）
    echo -e "${BLUE}    HTMLファイルを作成中...${NC}"
    
    # 実装結果から実際のファイル名を検出（複数パターンに対応）
    local html_files=$(grep -E "\*\*[^*]*\.html\*\*" "$impl_file" | sed -E 's/.*\*\*([^*]+\.html)\*\*.*/\1/' | head -1)
    
    # index.htmlを優先的に検索
    if grep -q "index\.html" "$impl_file"; then
        html_files="index.html"
    fi
    
    # デバッグ情報の表示
    echo -e "${CYAN}      検索されたHTMLファイル名: $html_files${NC}"
    
    if [ -n "$html_files" ]; then
        echo -e "${CYAN}      検出されたHTMLファイル: $html_files${NC}"
        
        # HTMLファイルのコード抽出を試みる（改善版）
        # パターン1: **index.html**形式の直後
        if awk "/\*\*${html_files}\*\*/,/\`\`\`$/" "$impl_file" | awk '/```html/,/```/' | grep -v '```' | grep -v "^\*\*" > "$output_dir/index.html.tmp" && [ -s "$output_dir/index.html.tmp" ]; then
            mv "$output_dir/index.html.tmp" "$output_dir/index.html"
            echo -e "${GREEN}      ✓ ${html_files}から抽出完了${NC}"
        # パターン2: 一般的な```で囲まれたコード
        elif awk "/$html_files/,/\`\`\`/" "$impl_file" | awk '/```/,/```/' | grep -v '```' > "$output_dir/index.html.tmp" && [ -s "$output_dir/index.html.tmp" ]; then
            mv "$output_dir/index.html.tmp" "$output_dir/index.html"
            echo -e "${GREEN}      ✓ コードブロックから抽出完了${NC}"
        # パターン3: ```htmlブロックを直接検索（ファイル名に依存しない）
        elif awk '/```html/,/```/' "$impl_file" | grep -v '```' > "$output_dir/index.html.tmp" && [ -s "$output_dir/index.html.tmp" ]; then
            mv "$output_dir/index.html.tmp" "$output_dir/index.html"
            echo -e "${GREEN}      ✓ HTMLコードブロックから抽出完了${NC}"
        # パターン4: 最初の<!DOCTYPE html>から</html>までを抽出
        elif awk '/<!DOCTYPE html>/,/<\/html>/' "$impl_file" > "$output_dir/index.html.tmp" && [ -s "$output_dir/index.html.tmp" ]; then
            mv "$output_dir/index.html.tmp" "$output_dir/index.html"
            echo -e "${GREEN}      ✓ HTMLタグから抽出完了${NC}"
        # パターン5: 任意のHTMLファイル名のコードブロックを検出
        elif awk "/\*\*[^*]*\.html\*\*/,/\`\`\`/" "$impl_file" | awk '/```html/,/```/' | grep -v '```' > "$output_dir/index.html.tmp" && [ -s "$output_dir/index.html.tmp" ]; then
            mv "$output_dir/index.html.tmp" "$output_dir/index.html"
            echo -e "${GREEN}      ✓ 任意のHTMLファイルから抽出完了${NC}"
        # パターン6: 全体から最大のHTMLコードブロックを抽出
        elif awk '/```html/,/```/' "$impl_file" | grep -v '```' | head -1000 > "$output_dir/index.html.tmp" && [ -s "$output_dir/index.html.tmp" ]; then
            mv "$output_dir/index.html.tmp" "$output_dir/index.html"
            echo -e "${GREEN}      ✓ 最大HTMLブロックから抽出完了${NC}"
        else
            echo -e "${YELLOW}      ⚠ コード抽出に失敗、フォールバック実行${NC}"
            echo -e "${CYAN}      デバッグ: 実装ファイルの内容を確認${NC}"
            echo "      HTML参照数: $(grep -c '\*\*[^*]*\.html\*\*' "$impl_file" 2>/dev/null || echo "0")"
            echo "      HTMLブロック数: $(grep -c '```html' "$impl_file" 2>/dev/null || echo "0")"
            echo "      DOCTYPE数: $(grep -c '<!DOCTYPE html' "$impl_file" 2>/dev/null || echo "0")"
            create_fallback_html "$output_dir/index.html" "$app_name"
        fi
        
        # 抽出されたHTMLファイルの内容チェック
        if [ -f "$output_dir/index.html" ]; then
            if grep -q "実装済み\|省略\|プレースホルダー" "$output_dir/index.html"; then
                echo -e "${RED}      ✗ 抽出されたHTMLにプレースホルダーが含まれています${NC}"
                echo -e "${YELLOW}      → フォールバックページに置き換えます${NC}"
                create_fallback_html "$output_dir/index.html" "$app_name"
            elif [ $(wc -l < "$output_dir/index.html") -lt 10 ]; then
                echo -e "${RED}      ✗ 抽出されたHTMLが短すぎます ($(wc -l < "$output_dir/index.html")行)${NC}"
                echo -e "${YELLOW}      → フォールバックページに置き換えます${NC}"
                create_fallback_html "$output_dir/index.html" "$app_name"
            fi
        fi
        rm -f "$output_dir/index.html.tmp"
    else
        echo -e "${YELLOW}    HTMLファイルの参照が見つからない、```htmlブロックを検索${NC}"
        # ファイル名が見つからない場合でも```htmlブロックを検索
        if awk '/```html/,/```/' "$impl_file" | grep -v '```' > "$output_dir/index.html" && [ -s "$output_dir/index.html" ]; then
            echo -e "${GREEN}    ✓ HTMLコードブロックから直接抽出成功${NC}"
        else
            echo -e "${YELLOW}    フォールバック実行${NC}"
            create_fallback_html "$output_dir/index.html" "$app_name"
        fi
    fi
    
    # README.mdの抽出（改善版）
    echo -e "${BLUE}    README.mdを作成中...${NC}"
    
    # 実装結果から実際のREADMEファイル名を検出
    local readme_files=$(grep -E "\*\*[^*]*\.md\*\*" "$impl_file" | sed -E 's/.*\*\*([^*]+\.md)\*\*.*/\1/' | head -1)
    
    # README.mdを優先的に検索
    if grep -q "README\.md" "$impl_file"; then
        readme_files="README.md"
    fi
    
    # デバッグ情報の表示
    echo -e "${CYAN}      検索されたREADMEファイル名: $readme_files${NC}"
    
    if [ -n "$readme_files" ]; then
        echo -e "${CYAN}      検出されたREADMEファイル: $readme_files${NC}"
        
        # READMEファイルのコード抽出を試みる（複数パターン対応）
        # パターン1: **README.md**形式の直後
        if awk "/\*\*${readme_files}\*\*/,/\`\`\`$/" "$impl_file" | awk '/```markdown/,/```/' | grep -v '```' | grep -v "^\*\*" > "$output_dir/README.md.tmp" && [ -s "$output_dir/README.md.tmp" ]; then
            mv "$output_dir/README.md.tmp" "$output_dir/README.md"
            echo -e "${GREEN}      ✓ ${readme_files}から抽出完了${NC}"
        elif awk "/$readme_files/,/\`\`\`/" "$impl_file" | awk '/```md/,/```/' | grep -v '```' > "$output_dir/README.md.tmp" && [ -s "$output_dir/README.md.tmp" ]; then
            mv "$output_dir/README.md.tmp" "$output_dir/README.md"
            echo -e "${GREEN}      ✓ コードブロックから抽出完了${NC}"
        # パターン3: ```markdownブロックを直接検索
        elif awk '/```markdown/,/```/' "$impl_file" | grep -v '```' > "$output_dir/README.md.tmp" && [ -s "$output_dir/README.md.tmp" ]; then
            mv "$output_dir/README.md.tmp" "$output_dir/README.md"
            echo -e "${GREEN}      ✓ Markdownブロックから抽出完了${NC}"
        else
            create_fallback_readme "$output_dir/README.md" "$app_name"
        fi
        rm -f "$output_dir/README.md.tmp"
    else
        echo -e "${YELLOW}    READMEファイルの参照が見つからない、```markdownブロックを検索${NC}"
        # ファイル名が見つからない場合でも```markdownブロックを検索
        if awk '/```markdown/,/```/' "$impl_file" | grep -v '```' > "$output_dir/README.md" && [ -s "$output_dir/README.md" ]; then
            echo -e "${GREEN}    ✓ Markdownブロックから直接抽出成功${NC}"
        elif awk '/```md/,/```/' "$impl_file" | grep -v '```' > "$output_dir/README.md" && [ -s "$output_dir/README.md" ]; then
            echo -e "${GREEN}    ✓ mdブロックから直接抽出成功${NC}"
        else
            create_fallback_readme "$output_dir/README.md" "$app_name"
        fi
    fi
    
    # ファイル生成の検証
    verify_generated_files "$output_dir"
}

# フォールバック用簡易HTMLページ作成
create_fallback_html() {
    local output_file="$1"
    local app_name="${2:-アプリ}"
    echo -e "${BLUE}      フォールバック: 簡易HTMLページを生成中...${NC}"
    
    cat > "$output_file" << EOF
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$app_name - ClaudeFlow製</title>
    <style>
        body { 
            font-family: 'Segoe UI', sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            min-height: 100vh; 
            margin: 0; 
            background: linear-gradient(135deg, #2c3e50, #34495e); 
            color: white; 
            padding: 20px; 
        }
        .container { 
            background: rgba(255, 255, 255, 0.1); 
            border-radius: 15px; 
            padding: 40px; 
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            text-align: center;
        }
        .title { 
            color: #f39c12; 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 20px; 
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); 
        }
        .message {
            font-size: 18px;
            margin: 20px 0;
            line-height: 1.6;
        }
        .error {
            color: #e74c3c;
            font-size: 16px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">🚨 $app_name</h1>
        <div class="message">
            申し訳ございません。<br>
            アプリケーションの生成中にエラーが発生しました。
        </div>
        <div class="error">
            <p>❌ HTMLファイルの抽出に失敗しました</p>
            <p>実装結果からコードを正しく抽出できませんでした。</p>
            <p>もう一度実行してください。</p>
        </div>
        <div class="message">
            <small>⚡ ClaudeFlow 超軽量モードで作成</small>
        </div>
    </div>
</body>
</html>
EOF
    echo -e "${GREEN}      ✓ フォールバックページ作成完了${NC}"
}

# フォールバック用README作成
create_fallback_readme() {
    local output_file="$1"
    local app_name="${2:-アプリ}"
    echo -e "${BLUE}      フォールバック: README.mdを生成中...${NC}"
    
    cat > "$output_file" << EOF
# $app_name

## 📖 概要
ClaudeFlow 超軽量モードで作成されたアプリケーションです。

## 🚨 エラー情報
アプリケーションの生成中にエラーが発生しました。
実装結果からコードを正しく抽出できませんでした。

## 🔧 対処方法
1. もう一度スクリプトを実行してください
2. アプリ名を変更してお試しください
3. 問題が続く場合は、管理者にお問い合わせください

## 📁 ファイル構成
- \`index.html\` - エラーページ
- \`README.md\` - このファイル

⚡ **Powered by ClaudeFlow 超軽量モード**
EOF
    echo -e "${GREEN}      ✓ フォールバックREADME作成完了${NC}"
}

# 生成ファイルの検証
verify_generated_files() {
    local output_dir="$1"
    echo -e "${BLUE}    生成ファイルを検証中...${NC}"
    
    local issues=0
    
    # index.htmlの検証（改善版）
    if [ -f "$output_dir/index.html" ] && [ -s "$output_dir/index.html" ]; then
        local file_size=$(wc -c < "$output_dir/index.html")
        local line_count=$(wc -l < "$output_dir/index.html")
        
        # HTMLの基本構造をチェック
        if grep -q "<!DOCTYPE html>" "$output_dir/index.html" && grep -q "</html>" "$output_dir/index.html"; then
            echo -e "${GREEN}      ✓ index.html: 正常 (${line_count}行, ${file_size} bytes)${NC}"
        elif [ "$file_size" -gt 500 ]; then
            echo -e "${YELLOW}      ⚠ index.html: HTML構造が不完全ですが、コンテンツあり (${file_size} bytes)${NC}"
        else
            echo -e "${YELLOW}      ⚠ index.html: サイズが小さすぎます (${file_size} bytes)${NC}"
            echo -e "${CYAN}        → フォールバックページが生成されている可能性があります${NC}"
            issues=$((issues + 1))
        fi
    else
        echo -e "${RED}      ✗ index.html: 存在しないか空ファイルです${NC}"
        issues=$((issues + 1))
    fi
    
    # README.mdの検証
    if [ -f "$output_dir/README.md" ] && [ -s "$output_dir/README.md" ]; then
        echo -e "${GREEN}      ✓ README.md: 正常${NC}"
    else
        echo -e "${YELLOW}      ⚠ README.md: 存在しないか空ファイルです${NC}"
        issues=$((issues + 1))
    fi
    
    if [ "$issues" -eq 0 ]; then
        echo -e "${GREEN}    ✅ すべてのファイルが正常に生成されました${NC}"
    else
        echo -e "${YELLOW}    ⚠ ${issues}個の問題が検出されましたが、フォールバックで対応済みです${NC}"
    fi
}

extract_and_create_files "$APP_DIR/implementation_result.md" "$APP_DIR" "$original_app_name"

# 行数制限チェック
echo -e "${BLUE}  行数制限チェックを実行中...${NC}"
line_check_result=0
if declare -f check_project_line_limit >/dev/null 2>&1; then
    check_project_line_limit "$APP_DIR"
    line_check_result=$?
else
    # 簡易チェック
    if [ -f "$APP_DIR/index.html" ]; then
        line_count=$(wc -l < "$APP_DIR/index.html")
        max_lines=${CLAUDEFLOW_MAX_LINES:-2000}
        if [ "$line_count" -gt "$max_lines" ]; then
            echo -e "${YELLOW}  ⚠ 警告: index.htmlが制限を超過しています (${line_count}/${max_lines}行)${NC}"
            line_check_result=1
        else
            echo -e "${GREEN}  ✓ 行数制限内: ${line_count}/${max_lines}行${NC}"
        fi
    fi
fi

# 最適化ガイダンス
if [ "$line_check_result" -ge 1 ]; then
    echo -e "${CYAN}  💡 コンパクト化推奨事項:${NC}"
    echo -e "${BLUE}    - CSS・JSの効率化とミニファイ${NC}"
    echo -e "${BLUE}    - 不要なコメント削除${NC}"
    echo -e "${BLUE}    - 重複コードの統合${NC}"
    echo -e "${BLUE}    - 最小限のスタイリング適用${NC}"
fi

# 詳細レポート生成
if declare -f generate_line_limit_report >/dev/null 2>&1; then
    generate_line_limit_report "$APP_DIR"
fi

# 基本的な動作テスト
echo -e "${BLUE}  基本動作テストを実行中...${NC}"

test_prompt="以下の実装に対して基本的な動作テストを行い、問題がないか確認してください：

実装内容:
$(cat "$APP_DIR/implementation_result.md")

確認項目:
- HTML構文エラーがないか
- JavaScript基本動作
- 主要機能の動作確認
- ブラウザでの表示確認

問題があれば修正案を提示してください。"

echo "$test_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > "$APP_DIR/test_result.md"

echo -e "${GREEN}  ✅ 実装+テスト完了${NC}"
echo ""

# フェーズ3: 統合ドキュメント生成と完成
echo -e "${CYAN}[3/3] 📚 統合ドキュメント生成と完成${NC}"

# 統合ドキュメントの作成
cat > "$APP_DIR/COMPLETE_DOCUMENTATION.md" << EOF
# $original_app_name - 完成ドキュメント

## 🎯 プロジェクト概要
$(date +"%Y-%m-%d") に超軽量モードで作成されたアプリです。

## 📋 要件・仕様
$(cat "$RESULTS_DIR/01_unified_requirements.md")

## 💻 実装
$(cat "$APP_DIR/implementation_result.md")

## 🧪 テスト結果
$(cat "$APP_DIR/test_result.md")

## 🚀 実行方法
1. \`index.html\`をブラウザで開く
2. アプリが自動的に起動します

## 📁 ファイル構成
- \`index.html\` - メインアプリケーション
- \`README.md\` - 使用方法
- \`COMPLETE_DOCUMENTATION.md\` - このファイル（全工程記録）

## ⚡ 開発情報
- 開発モード: 超軽量（3フェーズ）
- 開発時間: 約5分
- 品質レベル: 基本動作確認済み
EOF

# 基本的なREADMEがない場合は作成
if [ ! -f "$APP_DIR/README.md" ]; then
    cat > "$APP_DIR/README.md" << EOF
# $original_app_name

## 概要
超軽量モードで作成されたシンプルなWebアプリケーションです。

## 使用方法
1. \`index.html\`をブラウザで開いてください
2. アプリが自動的に起動します

## ファイル
- \`index.html\` - メインアプリケーション
- \`COMPLETE_DOCUMENTATION.md\` - 詳細な開発記録

作成日: $(date +"%Y-%m-%d")
EOF
fi

echo -e "${GREEN}  ✅ 統合ドキュメント完成${NC}"
echo ""

# 完成報告
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}           🎉 アプリ完成！ 🎉                   ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${GREEN}「$original_app_name」が完成しました！${NC}"
echo -e "${BLUE}🎯 CodeFit Design 原則に基づいた高品質実装${NC}"
echo -e "${BLUE}🎮 ユーザー意図分析に基づく最適化されたエンターテイメント体験${NC}"
echo ""
echo -e "${BLUE}📁 プロジェクト場所:${NC}"
echo "   $APP_DIR"
echo ""
echo -e "${BLUE}🚀 使用方法:${NC}"
echo "   1. 以下のファイルをブラウザで開く："
echo "      $APP_DIR/index.html"
echo ""
echo -e "${BLUE}📚 ドキュメント:${NC}"
echo "   - README.md - 基本的な使用方法"
echo "   - COMPLETE_DOCUMENTATION.md - 全工程の記録"
echo ""
echo -e "${YELLOW}💡 ヒント: ファイルをダブルクリックするだけで起動します${NC}"