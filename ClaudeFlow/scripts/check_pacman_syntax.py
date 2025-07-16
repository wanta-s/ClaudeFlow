#!/usr/bin/env python3
import re
import json

def check_javascript_syntax():
    """JavaScriptの構文エラーをチェック"""
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    # scriptタグ内のJavaScriptを抽出
    script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
    if not script_match:
        print("JavaScriptコードが見つかりません")
        return
    
    js_code = script_match.group(1)
    errors = []
    
    # 行ごとにチェック
    lines = js_code.split('\n')
    for i, line in enumerate(lines, 1):
        # セミコロンのチェック（関数定義とif/for文以外）
        if line.strip() and not line.strip().startswith('//'):
            if not any(line.strip().startswith(x) for x in ['function', 'if', 'for', 'while', 'else', '}', '{', 'try', 'catch']):
                if not line.strip().endswith((';', '{', '}', ',')) and '://' not in line:
                    print(f"警告: 行{i}: セミコロンが不足している可能性: {line.strip()[:50]}...")
    
    # 特定のパターンをチェック
    print("\n=== 潜在的な問題箇所 ===")
    
    # maze配列の確認
    maze_lines = []
    in_maze = False
    for i, line in enumerate(lines, 1):
        if 'const maze=[' in line:
            in_maze = True
        if in_maze:
            maze_lines.append(line)
            if '];' in line:
                break
    
    print(f"迷路配列: {len(maze_lines)-2}行")
    
    # 関数の存在確認
    required_functions = [
        'initAudio', 'createSounds', 'playSound', 'drawMaze', 'drawPacman',
        'drawGhosts', 'canMove', 'getNextPos', 'updatePacman', 'updateGhosts',
        'checkCollisions', 'resetPositions', 'gameLoop', 'updateUI', 'initLevel',
        'startGame', 'gameOver', 'resetGame', 'showMenu'
    ]
    
    missing = []
    for func in required_functions:
        if f'function {func}' not in js_code:
            missing.append(func)
    
    if missing:
        print(f"不足している関数: {missing}")
    else:
        print("すべての必須関数が存在します")
    
    # 変数の初期化確認
    print("\n=== 変数の初期化 ===")
    vars_pattern = r'(let|const|var)\s+(\w+)'
    matches = re.findall(vars_pattern, js_code)
    print(f"定義された変数数: {len(matches)}")
    
    # 括弧のバランス
    print("\n=== 括弧のバランス ===")
    parens = js_code.count('(') - js_code.count(')')
    braces = js_code.count('{') - js_code.count('}')
    brackets = js_code.count('[') - js_code.count(']')
    
    if parens != 0:
        print(f"エラー: 丸括弧のバランスが崩れています: {parens}")
    if braces != 0:
        print(f"エラー: 波括弧のバランスが崩れています: {braces}")
    if brackets != 0:
        print(f"エラー: 角括弧のバランスが崩れています: {brackets}")
    
    if parens == 0 and braces == 0 and brackets == 0:
        print("すべての括弧のバランスは正常です")

if __name__ == "__main__":
    check_javascript_syntax()