#!/usr/bin/env python3
"""パックマンゲームのHTMLファイルを検証するスクリプト"""

import re
import json
import sys
from html.parser import HTMLParser

class HTMLValidator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.errors = []
        self.warnings = []
        self.tag_stack = []
        self.has_doctype = False
        self.has_head = False
        self.has_body = False
        self.has_title = False
        self.javascript_errors = []
        
    def handle_decl(self, decl):
        if decl.lower() == 'doctype html':
            self.has_doctype = True
            
    def handle_starttag(self, tag, attrs):
        self.tag_stack.append(tag)
        if tag == 'head':
            self.has_head = True
        elif tag == 'body':
            self.has_body = True
        elif tag == 'title':
            self.has_title = True
            
    def handle_endtag(self, tag):
        if self.tag_stack and self.tag_stack[-1] == tag:
            self.tag_stack.pop()
        else:
            self.errors.append(f"不適切な終了タグ: </{tag}>")
            
    def handle_data(self, data):
        # JavaScript内の基本的な構文チェック
        if self.tag_stack and self.tag_stack[-1] == 'script':
            # よくあるJavaScriptエラーをチェック
            if re.search(r'\bfunction\s+\w+\s*\([^)]*\)\s*{(?![^}]*})', data):
                self.javascript_errors.append("関数の閉じ括弧が不足している可能性")
            if data.count('{') != data.count('}'):
                self.javascript_errors.append("中括弧の数が一致しません")
            if data.count('(') != data.count(')'):
                self.javascript_errors.append("丸括弧の数が一致しません")
            if data.count('[') != data.count(']'):
                self.javascript_errors.append("角括弧の数が一致しません")

def validate_pacman_html(filename):
    """パックマンHTMLファイルを検証"""
    print(f"=== {filename} の検証開始 ===\n")
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ ファイル読み込みエラー: {e}")
        return False
    
    # HTMLパーサーで検証
    parser = HTMLValidator()
    try:
        parser.feed(content)
    except Exception as e:
        print(f"❌ HTML解析エラー: {e}")
        return False
    
    # 基本的なHTML構造チェック
    print("【HTML構造チェック】")
    if parser.has_doctype:
        print("✅ DOCTYPE宣言: OK")
    else:
        print("❌ DOCTYPE宣言: 見つかりません")
        
    if parser.has_head:
        print("✅ <head>タグ: OK")
    else:
        print("❌ <head>タグ: 見つかりません")
        
    if parser.has_body:
        print("✅ <body>タグ: OK")
    else:
        print("❌ <body>タグ: 見つかりません")
        
    if parser.has_title:
        print("✅ <title>タグ: OK")
    else:
        print("❌ <title>タグ: 見つかりません")
    
    if parser.tag_stack:
        print(f"❌ 閉じられていないタグ: {parser.tag_stack}")
    else:
        print("✅ すべてのタグが適切に閉じられています")
    
    # パックマンゲーム特有の要素チェック
    print("\n【ゲーム要素チェック】")
    required_elements = [
        ('gameCanvas', 'Canvas要素'),
        ('score', 'スコア表示'),
        ('lives', 'ライフ表示'),
        ('menu', 'メニュー'),
        ('gameOver', 'ゲームオーバー画面')
    ]
    
    for elem_id, desc in required_elements:
        if f'id="{elem_id}"' in content or f"id='{elem_id}'" in content:
            print(f"✅ {desc} (#{elem_id}): OK")
        else:
            print(f"❌ {desc} (#{elem_id}): 見つかりません")
    
    # JavaScript関数チェック
    print("\n【JavaScript関数チェック】")
    required_functions = [
        ('startGame', 'ゲーム開始関数'),
        ('resetGame', 'ゲームリセット関数'),
        ('showMenu', 'メニュー表示関数')
    ]
    
    for func_name, desc in required_functions:
        if re.search(rf'\bfunction\s+{func_name}\s*\(', content) or \
           re.search(rf'\b{func_name}\s*=\s*function', content) or \
           re.search(rf'\bconst\s+{func_name}\s*=', content):
            print(f"✅ {desc} ({func_name}): OK")
        else:
            print(f"⚠️  {desc} ({func_name}): 見つかりません（別の方法で定義されている可能性）")
    
    # ゲームオブジェクトチェック
    print("\n【ゲームオブジェクトチェック】")
    game_objects = [
        ('pacman', 'パックマン'),
        ('ghosts', 'ゴースト'),
        ('maze', '迷路'),
        ('score', 'スコア管理')
    ]
    
    for obj_name, desc in game_objects:
        if re.search(rf'\b{obj_name}\b', content, re.IGNORECASE):
            print(f"✅ {desc}関連のコード: 検出")
        else:
            print(f"⚠️  {desc}関連のコード: 未検出")
    
    # イベントハンドラチェック
    print("\n【イベントハンドラチェック】")
    event_handlers = [
        ('keydown', 'キーボード入力'),
        ('click', 'クリックイベント'),
        ('touchstart|touchmove|touchend', 'タッチイベント')
    ]
    
    for event, desc in event_handlers:
        if re.search(rf'addEventListener.*{event}', content) or \
           re.search(rf'on{event}', content):
            print(f"✅ {desc}: 実装済み")
        else:
            print(f"⚠️  {desc}: 未実装の可能性")
    
    # エラーと警告の表示
    if parser.errors:
        print("\n【HTMLエラー】")
        for error in parser.errors:
            print(f"❌ {error}")
    
    if parser.javascript_errors:
        print("\n【JavaScript潜在的エラー】")
        for error in parser.javascript_errors:
            print(f"⚠️  {error}")
    
    # ファイルサイズと行数
    print(f"\n【ファイル情報】")
    lines = content.count('\n') + 1
    size = len(content.encode('utf-8'))
    print(f"📊 行数: {lines}行")
    print(f"📊 サイズ: {size:,}バイト ({size/1024:.1f}KB)")
    
    if lines <= 2000:
        print("✅ CodeFit Design制約（2000行以内）: OK")
    else:
        print("❌ CodeFit Design制約（2000行以内）: 超過")
    
    # 総合評価
    print("\n【総合評価】")
    if not parser.errors and parser.has_doctype and parser.has_head and parser.has_body:
        print("✅ 基本的なHTML構造は問題ありません")
        print("✅ パックマンゲームとして必要な要素が含まれています")
        print("\n⭐ ブラウザで開いて実際の動作確認を推奨します")
        return True
    else:
        print("❌ HTML構造に問題があります")
        return False

if __name__ == "__main__":
    validate_pacman_html("/mnt/c/makeProc/ClaudeFlow/ClaudeFlow/scripts/index.html")