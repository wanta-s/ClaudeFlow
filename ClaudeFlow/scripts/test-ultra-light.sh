#!/bin/bash

# 超軽量モード動作テストスクリプト
# 実際のClaudeコマンドの代わりにモックを使用してテスト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🧪 超軽量モード動作テスト${NC}"
echo ""

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# テスト用のモック関数
mock_claude_command() {
    local prompt="$1"
    local output_file="$2"
    
    # プロンプトの種類を判定
    if echo "$prompt" | grep -q "企画と要件定義"; then
        cat > "$output_file" << 'EOF'
# テスト計算機 - 企画・要件書

## 1. アプリ概要
シンプルな四則演算ができるWebブラウザ上で動作する計算機アプリケーションです。

## 2. 主要機能
- 数字入力（0-9）
- 四則演算（+、-、×、÷）
- クリア機能（C）
- 計算実行（=）
- 結果表示

## 3. 技術構成
- HTML5（構造）
- CSS3（スタイリング）
- JavaScript（計算ロジック）
- 単一ファイル構成

## 4. 画面構成
- 結果表示エリア（上部）
- 数字ボタン（0-9）
- 演算子ボタン（+、-、×、÷）
- 機能ボタン（C、=）

## 5. データ設計
- currentValue: 現在の値
- operator: 演算子
- previousValue: 前の値
- display: 表示値
EOF
    elif echo "$prompt" | grep -q "実装を生成"; then
        cat > "$output_file" << 'EOF'
以下の要件に基づいて、完全に動作する計算機アプリを実装しました。

## index.html

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>テスト計算機</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
        }
        .calculator {
            background: #333;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        .display {
            width: 200px;
            height: 50px;
            font-size: 24px;
            text-align: right;
            padding: 10px;
            margin-bottom: 10px;
            background: #000;
            color: #fff;
            border: none;
            border-radius: 5px;
        }
        .buttons {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }
        button {
            width: 50px;
            height: 50px;
            font-size: 18px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            background: #666;
            color: white;
        }
        button:hover {
            background: #777;
        }
        .operator {
            background: #ff9500;
        }
        .operator:hover {
            background: #ffb143;
        }
    </style>
</head>
<body>
    <div class="calculator">
        <input type="text" class="display" id="display" readonly>
        <div class="buttons">
            <button onclick="clearDisplay()">C</button>
            <button onclick="appendToDisplay('/')" class="operator">÷</button>
            <button onclick="appendToDisplay('*')" class="operator">×</button>
            <button onclick="deleteLast()">←</button>
            
            <button onclick="appendToDisplay('7')">7</button>
            <button onclick="appendToDisplay('8')">8</button>
            <button onclick="appendToDisplay('9')">9</button>
            <button onclick="appendToDisplay('-')" class="operator">-</button>
            
            <button onclick="appendToDisplay('4')">4</button>
            <button onclick="appendToDisplay('5')">5</button>
            <button onclick="appendToDisplay('6')">6</button>
            <button onclick="appendToDisplay('+')" class="operator">+</button>
            
            <button onclick="appendToDisplay('1')">1</button>
            <button onclick="appendToDisplay('2')">2</button>
            <button onclick="appendToDisplay('3')">3</button>
            <button onclick="calculate()" class="operator" style="grid-row: span 2;">=</button>
            
            <button onclick="appendToDisplay('0')" style="grid-column: span 2;">0</button>
            <button onclick="appendToDisplay('.')">.</button>
        </div>
    </div>

    <script>
        let currentInput = '';
        let operator = '';
        let previousInput = '';

        function appendToDisplay(value) {
            const display = document.getElementById('display');
            
            if (['+', '-', '*', '/'].includes(value)) {
                if (currentInput !== '') {
                    if (previousInput !== '' && operator !== '') {
                        calculate();
                    }
                    operator = value;
                    previousInput = currentInput;
                    currentInput = '';
                }
            } else {
                currentInput += value;
            }
            
            display.value = currentInput || previousInput + ' ' + operator;
        }

        function clearDisplay() {
            document.getElementById('display').value = '';
            currentInput = '';
            operator = '';
            previousInput = '';
        }

        function deleteLast() {
            currentInput = currentInput.slice(0, -1);
            document.getElementById('display').value = currentInput;
        }

        function calculate() {
            if (previousInput !== '' && currentInput !== '' && operator !== '') {
                try {
                    let result = eval(previousInput + operator + currentInput);
                    document.getElementById('display').value = result;
                    currentInput = result.toString();
                    operator = '';
                    previousInput = '';
                } catch (error) {
                    document.getElementById('display').value = 'Error';
                    clearDisplay();
                }
            }
        }
    </script>
</body>
</html>
```

## README.md

```markdown
# テスト計算機

## 概要
超軽量モードで作成されたシンプルな計算機アプリケーションです。

## 使用方法
1. `index.html`をブラウザで開いてください
2. 数字ボタンをクリックして計算を行います
3. 演算子（+、-、×、÷）で計算式を作成
4. =ボタンで計算実行
5. Cボタンでクリア

## ファイル
- `index.html` - メインアプリケーション
- `COMPLETE_DOCUMENTATION.md` - 詳細な開発記録

作成日: $(date +"%Y-%m-%d")
```
EOF
    elif echo "$prompt" | grep -q "動作テスト"; then
        cat > "$output_file" << 'EOF'
# 基本動作テスト結果

## テスト実行結果

### ✅ HTML構文チェック
- HTML5構文: 正常
- DOCTYPE宣言: 正常
- 必須要素: 正常

### ✅ JavaScript基本動作
- 数字入力: 正常
- 演算子処理: 正常
- 計算機能: 正常
- クリア機能: 正常

### ✅ CSS適用確認
- レイアウト: 正常
- ボタンスタイル: 正常
- レスポンシブ: 正常

### ✅ 主要機能テスト
- 基本計算（2+3=5）: ✓ 合格
- 連続計算: ✓ 合格
- 小数点計算: ✓ 合格
- エラーハンドリング: ✓ 合格

## 結論
すべての基本動作テストに合格しました。
ブラウザでの表示・動作に問題ありません。
EOF
    else
        echo "# モックレスポンス" > "$output_file"
        echo "テスト用の応答です。" >> "$output_file"
    fi
    
    return 0
}

# テスト用のcreate_unified_project関数
test_create_unified_project() {
    local req_file="$1"
    local base_dir="$2"
    local project_dir="$base_dir/test-calculator"
    
    mkdir -p "$project_dir"
    echo "$project_dir"
}

# オリジナル関数をバックアップしてモックに置き換え
if declare -f create_unified_project > /dev/null; then
    eval "original_$(declare -f create_unified_project)"
fi
create_unified_project() {
    test_create_unified_project "$@"
}

echo -e "${BLUE}📋 テスト開始: 超軽量モードシミュレーション${NC}"
echo ""

# テスト実行
app_name="テスト計算機"
PROJECT_ROOT="$(dirname "$0")/.."
RESULTS_DIR="$PROJECT_ROOT/test-results"
mkdir -p "$RESULTS_DIR"

echo -e "${CYAN}[1/3] 📋 企画+要件定義フェーズ${NC}"

unified_requirements_prompt="以下のアプリの企画と要件定義を統合した形で作成してください：

アプリ名: $app_name

要求:
- アプリの目的と基本機能を明確にする
- 必要最小限の機能リストを作成
- 技術選択（シンプルなWeb技術推奨）
- 簡潔な仕様（A4用紙1枚程度）"

echo -e "${BLUE}  企画・要件を生成中...${NC}"
mock_claude_command "$unified_requirements_prompt" "$RESULTS_DIR/01_unified_requirements.md"
echo -e "${GREEN}  ✅ 企画・要件完了${NC}"
echo ""

# フェーズ2: 実装+テスト
echo -e "${CYAN}[2/3] 💻 実装+テスト フェーズ${NC}"

PROJECT_DIR=$(create_unified_project "$RESULTS_DIR/01_unified_requirements.md" "$PROJECT_ROOT/test-implementation")
APP_DIR="$PROJECT_DIR"

implementation_prompt="以下の要件に基づいて、完全に動作するアプリを実装してください：

要件:
$(cat "$RESULTS_DIR/01_unified_requirements.md")

実装要求:
- 単一HTMLファイルで完結（外部依存なし）
- CSS・JavaScriptも同一ファイル内に記載
- ブラウザで開けばすぐに動作
- 基本的なエラーハンドリング"

echo -e "${BLUE}  実装コードを生成中...${NC}"
mock_claude_command "$implementation_prompt" "$APP_DIR/implementation_result.md"

# 実装結果からHTMLファイルを抽出
echo -e "${BLUE}    index.htmlを作成中...${NC}"
awk '/```html/,/```/' "$APP_DIR/implementation_result.md" | grep -v '```' > "$APP_DIR/index.html"

# README.mdを抽出
echo -e "${BLUE}    README.mdを作成中...${NC}"
awk '/README.md/,/^```/' "$APP_DIR/implementation_result.md" | grep -v '```' | tail -n +2 > "$APP_DIR/README.md"

# 基本的な動作テスト
echo -e "${BLUE}  基本動作テストを実行中...${NC}"
test_prompt="実装の動作テストを行います"
mock_claude_command "$test_prompt" "$APP_DIR/test_result.md"

echo -e "${GREEN}  ✅ 実装+テスト完了${NC}"
echo ""

# フェーズ3: 統合ドキュメント生成
echo -e "${CYAN}[3/3] 📚 統合ドキュメント生成と完成${NC}"

# 統合ドキュメントの作成
cat > "$APP_DIR/COMPLETE_DOCUMENTATION.md" << EOF
# $app_name - 完成ドキュメント（テスト版）

## 🎯 プロジェクト概要
$(date +"%Y-%m-%d") に超軽量モード（テスト）で作成されたアプリです。

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
- 開発モード: 超軽量（テスト）
- 開発時間: 約5分（シミュレーション）
- 品質レベル: 基本動作確認済み
EOF

echo -e "${GREEN}  ✅ 統合ドキュメント完成${NC}"
echo ""

# 完成報告
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}           🎉 テスト完了！ 🎉                   ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${GREEN}「$app_name」のテストが完成しました！${NC}"
echo ""
echo -e "${BLUE}📁 テスト結果場所:${NC}"
echo "   $APP_DIR"
echo ""
echo -e "${BLUE}📚 生成ファイル:${NC}"
echo "   - index.html - 計算機アプリ"
echo "   - README.md - 使用方法"
echo "   - COMPLETE_DOCUMENTATION.md - 全工程記録"
echo ""

# ファイル存在確認
echo -e "${BLUE}📋 ファイル生成確認:${NC}"
for file in "index.html" "README.md" "COMPLETE_DOCUMENTATION.md"; do
    if [ -f "$APP_DIR/$file" ]; then
        echo -e "  ${GREEN}✓ $file${NC}"
    else
        echo -e "  ${RED}✗ $file (見つかりません)${NC}"
    fi
done

echo ""
echo -e "${YELLOW}💡 実際の動作テストは、生成されたindex.htmlをブラウザで開いて確認してください${NC}"

# テスト結果をログに記録
echo "$(date): 超軽量モードテスト完了 - $app_name" >> "$PROJECT_ROOT/test.log"