#!/usr/bin/env python3
import re
import json

def check_html():
    """HTML構文の基本チェック"""
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    errors = []
    
    # DOCTYPEチェック
    if not html.startswith('<!DOCTYPE html>'):
        errors.append('DOCTYPEが正しくありません')
    
    # タグのペアチェック
    tags = ['html', 'head', 'body', 'title', 'style', 'script', 'div', 'canvas', 'button', 'span']
    for tag in tags:
        open_count = len(re.findall(f'<{tag}[\\s>]', html, re.IGNORECASE))
        close_count = len(re.findall(f'</{tag}>', html, re.IGNORECASE))
        if open_count != close_count:
            errors.append(f'{tag}タグの開始と終了が一致しません: 開始={open_count}, 終了={close_count}')
    
    # 必須要素チェック
    if '<title>' not in html:
        errors.append('titleタグがありません')
    if 'charset=' not in html:
        errors.append('文字エンコーディング指定がありません')
    if '<canvas' not in html:
        errors.append('canvasタグがありません')
    
    return errors

def check_javascript():
    """JavaScript構文の基本チェック"""
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    # scriptタグ内のJavaScriptを抽出
    script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
    if not script_match:
        return ['JavaScriptコードが見つかりません']
    
    js_code = script_match.group(1)
    errors = []
    
    # 基本的な構文チェック
    # 括弧のバランス
    open_parens = js_code.count('(')
    close_parens = js_code.count(')')
    if open_parens != close_parens:
        errors.append(f'括弧のバランスが崩れています: ( = {open_parens}, ) = {close_parens}')
    
    open_braces = js_code.count('{')
    close_braces = js_code.count('}')
    if open_braces != close_braces:
        errors.append(f'波括弧のバランスが崩れています: {{ = {open_braces}, }} = {close_braces}')
    
    open_brackets = js_code.count('[')
    close_brackets = js_code.count(']')
    if open_brackets != close_brackets:
        errors.append(f'角括弧のバランスが崩れています: [ = {open_brackets}, ] = {close_brackets}')
    
    # 重要な変数/関数の存在チェック
    required_items = [
        'canvas', 'ctx', 'gameState', 'score', 'level', 'lives',
        'pacman', 'ghosts', 'maze', 'startGame', 'gameLoop', 'updatePacman'
    ]
    
    for item in required_items:
        if item not in js_code:
            errors.append(f'必須の変数/関数 "{item}" が見つかりません')
    
    return errors

def check_game_features():
    """ゲーム機能の実装チェック"""
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    features = {
        'パックマン描画': 'drawPacman' in html,
        'ゴースト描画': 'drawGhosts' in html,
        '迷路描画': 'drawMaze' in html,
        'キーボード操作': 'keydown' in html,
        'タッチ操作': 'touchstart' in html,
        'スコア管理': 'score' in html and 'updateUI' in html,
        'ライフ管理': 'lives' in html,
        'レベル進行': 'level' in html,
        'サウンド': 'AudioContext' in html,
        'ローカルストレージ': 'localStorage' in html,
        '衝突判定': 'checkCollisions' in html,
        'パワーモード': 'powerMode' in html
    }
    
    missing = [name for name, exists in features.items() if not exists]
    return missing

def main():
    print("パックマンゲーム実装の検証を開始します...\n")
    
    # HTML構文チェック
    print("1. HTML構文チェック:")
    html_errors = check_html()
    if not html_errors:
        print("   ✓ エラーなし")
    else:
        print("   × エラーあり:")
        for error in html_errors:
            print(f"     - {error}")
    
    # JavaScript構文チェック
    print("\n2. JavaScript基本構文チェック:")
    js_errors = check_javascript()
    if not js_errors:
        print("   ✓ エラーなし")
    else:
        print("   × エラーあり:")
        for error in js_errors:
            print(f"     - {error}")
    
    # ゲーム機能チェック
    print("\n3. ゲーム機能実装チェック:")
    missing_features = check_game_features()
    if not missing_features:
        print("   ✓ すべての主要機能が実装されています")
    else:
        print("   × 以下の機能が見つかりません:")
        for feature in missing_features:
            print(f"     - {feature}")
    
    # 総合判定
    print("\n総合判定:")
    total_issues = len(html_errors) + len(js_errors) + len(missing_features)
    if total_issues == 0:
        print("✓ 実装に大きな問題は見つかりませんでした")
        print("  ブラウザでindex.htmlを開いて動作確認してください")
    else:
        print(f"× {total_issues}個の問題が見つかりました")
        print("  上記の問題を修正することを推奨します")

if __name__ == "__main__":
    main()