#!/bin/bash

# 自動検証スクリプト
# 生成されたコードの構文チェックとエラーパターン検出を行う

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# スクリプトディレクトリ
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATION_DIR="$PROJECT_ROOT/validation"
PATTERNS_FILE="$VALIDATION_DIR/patterns/error-patterns.json"

# 共通関数を読み込む
source "$SCRIPT_DIR/common-functions.sh"

# 使用方法
usage() {
    echo "使用方法: $0 <file_path> [options]"
    echo "オプション:"
    echo "  -l, --language <lang>  言語を指定 (自動検出される)"
    echo "  -o, --output <file>    レポート出力先"
    echo "  -f, --fix              自動修正を試みる"
    echo "  -s, --strict           厳格モード（警告もエラーとして扱う）"
    echo "  -h, --help             ヘルプを表示"
    exit 1
}

# ファイルの言語を検出
detect_language() {
    local file="$1"
    local extension="${file##*.}"
    
    case "$extension" in
        js|jsx) echo "javascript" ;;
        ts|tsx) echo "typescript" ;;
        py) echo "python" ;;
        java) echo "java" ;;
        go) echo "go" ;;
        html) echo "html" ;;
        css) echo "css" ;;
        *) echo "unknown" ;;
    esac
}

# JavaScriptの構文チェック
validate_javascript_syntax() {
    local file="$1"
    local errors=()
    
    # Node.jsがインストールされているか確認
    if command -v node &> /dev/null; then
        # 構文チェック
        if ! node -c "$file" 2>/dev/null; then
            errors+=("JavaScript構文エラーが検出されました")
        fi
    fi
    
    # 基本的な構文チェック（Pythonスクリプトで実行）
    python3 -c "
import re
import json

with open('$file', 'r', encoding='utf-8') as f:
    content = f.read()

# 括弧のバランスチェック
parens = content.count('(') - content.count(')')
braces = content.count('{') - content.count('}')
brackets = content.count('[') - content.count(']')

errors = []
if parens != 0:
    errors.append(f'括弧のバランスエラー: 差分 {parens}')
if braces != 0:
    errors.append(f'波括弧のバランスエラー: 差分 {braces}')
if brackets != 0:
    errors.append(f'角括弧のバランスエラー: 差分 {brackets}')

# セミコロンチェック（簡易）
lines = content.split('\n')
for i, line in enumerate(lines, 1):
    line = line.strip()
    if line and not line.startswith('//') and not line.startswith('*'):
        if not any(line.endswith(x) for x in [';', '{', '}', ',', ':', ')', ']']):
            if not any(x in line for x in ['if', 'else', 'for', 'while', 'function', 'class']):
                # 次の行が継続でない場合
                if i < len(lines) and not lines[i].strip().startswith(('.', '[', '(', '&&', '||')):
                    print(f'Line {i}: セミコロンが不足している可能性')

for error in errors:
    print(error)
"
    
    echo "${errors[@]}"
}

# Pythonの構文チェック
validate_python_syntax() {
    local file="$1"
    
    # Python構文チェック
    if ! python3 -m py_compile "$file" 2>/dev/null; then
        echo "Python構文エラーが検出されました"
        return 1
    fi
    
    return 0
}

# エラーパターンの検出
check_error_patterns() {
    local file="$1"
    local language="$2"
    local report_file="$3"
    
    echo -e "${CYAN}=== エラーパターン検査 ===${NC}" >> "$report_file"
    
    # Pythonスクリプトでパターンマッチング
    python3 -c "
import json
import re

# パターンファイルを読み込む
with open('$PATTERNS_FILE', 'r', encoding='utf-8') as f:
    patterns = json.load(f)

# 対象ファイルを読み込む
with open('$file', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# 言語別パターンと共通パターンをチェック
issues = []
for pattern_type in ['$language', 'general']:
    if pattern_type in patterns:
        for key, pattern_info in patterns[pattern_type].items():
            pattern = pattern_info['pattern']
            try:
                # 各行をチェック
                for i, line in enumerate(lines, 1):
                    if re.search(pattern, line):
                        issues.append({
                            'line': i,
                            'type': key,
                            'severity': pattern_info['severity'],
                            'message': pattern_info['message'],
                            'code': line.strip()
                        })
            except re.error:
                pass

# 重要度でソート
severity_order = {'critical': 0, 'error': 1, 'warning': 2, 'info': 3}
issues.sort(key=lambda x: (severity_order.get(x['severity'], 4), x['line']))

# レポート出力
for issue in issues:
    severity_color = {
        'critical': '\033[0;31m',  # RED
        'error': '\033[0;31m',     # RED
        'warning': '\033[0;33m',   # YELLOW
        'info': '\033[0;36m'       # CYAN
    }.get(issue['severity'], '\033[0m')
    
    print(f\"{severity_color}[{issue['severity'].upper()}]\033[0m Line {issue['line']}: {issue['message']}\")
    print(f\"  コード: {issue['code'][:80]}{'...' if len(issue['code']) > 80 else ''}\")
    print()

# サマリー
if issues:
    critical = sum(1 for i in issues if i['severity'] == 'critical')
    errors = sum(1 for i in issues if i['severity'] == 'error')
    warnings = sum(1 for i in issues if i['severity'] == 'warning')
    info = sum(1 for i in issues if i['severity'] == 'info')
    
    print(f\"\\n検出された問題: Critical: {critical}, Error: {errors}, Warning: {warnings}, Info: {info}\")
else:
    print(\"\\n問題は検出されませんでした。\")
" >> "$report_file"
}

# HTMLファイル内のJavaScript検証
validate_html_javascript() {
    local file="$1"
    local report_file="$2"
    
    echo -e "${CYAN}=== HTMLファイル内のJavaScript検証 ===${NC}" >> "$report_file"
    
    # scriptタグ内のJavaScriptを抽出して検証
    python3 -c "
import re
import tempfile
import os

with open('$file', 'r', encoding='utf-8') as f:
    html_content = f.read()

# scriptタグ内のJavaScriptを抽出
script_pattern = r'<script[^>]*>(.*?)</script>'
scripts = re.findall(script_pattern, html_content, re.DOTALL)

if scripts:
    for i, script in enumerate(scripts):
        # 一時ファイルに書き出して検証
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as tmp:
            tmp.write(script)
            tmp_path = tmp.name
        
        print(f'\\nScript Block {i+1}:')
        os.system(f'$0 {tmp_path} -l javascript')
        os.unlink(tmp_path)
else:
    print('JavaScriptコードは検出されませんでした。')
"
}

# メイン処理
main() {
    local file=""
    local language=""
    local output_file=""
    local fix_mode=false
    local strict_mode=false
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--language)
                language="$2"
                shift 2
                ;;
            -o|--output)
                output_file="$2"
                shift 2
                ;;
            -f|--fix)
                fix_mode=true
                shift
                ;;
            -s|--strict)
                strict_mode=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                if [ -z "$file" ]; then
                    file="$1"
                fi
                shift
                ;;
        esac
    done
    
    # ファイルチェック
    if [ -z "$file" ] || [ ! -f "$file" ]; then
        echo -e "${RED}エラー: ファイルが指定されていないか、存在しません${NC}"
        usage
    fi
    
    # 言語の自動検出
    if [ -z "$language" ]; then
        language=$(detect_language "$file")
        echo -e "${BLUE}検出された言語: $language${NC}"
    fi
    
    # 出力ファイルの設定
    if [ -z "$output_file" ]; then
        timestamp=$(date +%Y%m%d_%H%M%S)
        output_file="$VALIDATION_DIR/reports/validation_${timestamp}.txt"
        mkdir -p "$VALIDATION_DIR/reports"
    fi
    
    # レポートヘッダー
    {
        echo "=== ClaudeFlow 検証レポート ==="
        echo "ファイル: $file"
        echo "言語: $language"
        echo "実行日時: $(date)"
        echo "================================"
        echo
    } > "$output_file"
    
    # 構文チェック
    echo -e "${CYAN}=== 構文チェック ===${NC}" >> "$output_file"
    case "$language" in
        javascript|typescript)
            if validate_javascript_syntax "$file" >> "$output_file" 2>&1; then
                echo -e "${GREEN}構文チェック: OK${NC}" >> "$output_file"
            else
                echo -e "${RED}構文チェック: エラー${NC}" >> "$output_file"
            fi
            ;;
        python)
            if validate_python_syntax "$file" >> "$output_file" 2>&1; then
                echo -e "${GREEN}構文チェック: OK${NC}" >> "$output_file"
            else
                echo -e "${RED}構文チェック: エラー${NC}" >> "$output_file"
            fi
            ;;
        html)
            validate_html_javascript "$file" "$output_file"
            ;;
        *)
            echo -e "${YELLOW}構文チェック: この言語はサポートされていません${NC}" >> "$output_file"
            ;;
    esac
    
    echo >> "$output_file"
    
    # エラーパターンチェック
    check_error_patterns "$file" "$language" "$output_file"
    
    # 結果表示
    echo -e "\n${GREEN}検証完了！${NC}"
    echo -e "レポート: $output_file"
    echo
    cat "$output_file"
    
    # 自動修正モード
    if [ "$fix_mode" = true ]; then
        echo -e "\n${YELLOW}自動修正機能は現在開発中です${NC}"
    fi
}

# スクリプトを実行
main "$@"