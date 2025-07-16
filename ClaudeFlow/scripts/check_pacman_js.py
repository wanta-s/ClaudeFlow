#!/usr/bin/env python3
"""パックマンゲームのJavaScript部分を詳細に検証するスクリプト"""

import re
import json

def extract_javascript(html_content):
    """HTMLからJavaScript部分を抽出"""
    script_pattern = r'<script[^>]*>(.*?)</script>'
    scripts = re.findall(script_pattern, html_content, re.DOTALL | re.IGNORECASE)
    return '\n'.join(scripts)

def check_javascript_features(js_content):
    """JavaScriptの主要機能をチェック"""
    print("=== JavaScript機能チェック ===\n")
    
    # 主要なゲームオブジェクトと機能
    features = {
        'ゲーム状態管理': [
            (r'let\s+gameState\s*=|const\s+gameState\s*=|var\s+gameState\s*=', 'gameState変数'),
            (r'gameRunning|isGameRunning|running', 'ゲーム実行フラグ'),
            (r'score\s*=\s*\d+', 'スコア初期化'),
            (r'lives\s*=\s*\d+', 'ライフ初期化'),
            (r'level\s*=\s*\d+', 'レベル初期化')
        ],
        'パックマン制御': [
            (r'pacman\s*=\s*{|class\s+Pacman|function\s+Pacman', 'パックマンオブジェクト/クラス'),
            (r'pacman\.(x|position)', 'パックマンの位置'),
            (r'pacman\.(dir|direction)', 'パックマンの方向'),
            (r'pacman\.speed', 'パックマンの速度'),
            (r'movePacman|updatePacman', 'パックマン移動処理')
        ],
        'ゴースト制御': [
            (r'ghosts?\s*=\s*\[|class\s+Ghost', 'ゴーストオブジェクト/配列'),
            (r'ghost\.ai|ghostAI|updateGhost', 'ゴーストAI'),
            (r'Blinky|Pinky|Inky|Clyde', 'ゴーストの名前'),
            (r'frightened|scared|blue', 'ゴーストの怖がり状態'),
            (r'scatter|chase', 'ゴーストの行動モード')
        ],
        '迷路とマップ': [
            (r'maze\s*=|map\s*=|grid\s*=', '迷路データ'),
            (r'WALL|EMPTY|DOT|POWER', '迷路のセルタイプ'),
            (r'maze\[\d+\]\[\d+\]|maze\[.*?\]\[.*?\]', '迷路へのアクセス'),
            (r'createMaze|generateMaze|initMaze', '迷路生成関数')
        ],
        '衝突検出': [
            (r'collision|collide|checkCollision', '衝突検出'),
            (r'canMove|isValidMove|checkWall', '移動可能チェック'),
            (r'eatDot|collectDot', 'ドット収集'),
            (r'hitGhost|ghostCollision', 'ゴーストとの衝突')
        ],
        'ゲームループ': [
            (r'requestAnimationFrame|setInterval.*game|setTimeout.*game', 'ゲームループ'),
            (r'gameLoop|update|tick|frame', 'ゲーム更新関数'),
            (r'draw|render|paint', '描画関数'),
            (r'deltaTime|dt|frameTime', 'フレーム時間管理')
        ],
        'Canvas描画': [
            (r'getContext\([\'"]2d[\'"]\)', '2Dコンテキスト取得'),
            (r'ctx\.(fillRect|strokeRect|arc)', 'Canvas描画命令'),
            (r'ctx\.fillStyle|ctx\.strokeStyle', 'スタイル設定'),
            (r'clearRect|clear\(', '画面クリア')
        ],
        'イベント処理': [
            (r'addEventListener\([\'"]keydown', 'キーボード入力'),
            (r'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|wasd', '方向キー処理'),
            (r'touchstart|touchmove|touchend', 'タッチイベント'),
            (r'onclick|addEventListener\([\'"]click', 'クリックイベント')
        ],
        'サウンド': [
            (r'Audio\(|sound|playSound', 'オーディオ処理'),
            (r'waka|chomp|eat.*sound', '食べる音'),
            (r'death.*sound|die.*sound', '死亡音'),
            (r'siren|ghost.*sound', 'ゴースト音')
        ],
        'UI更新': [
            (r'updateScore|setScore|displayScore', 'スコア更新'),
            (r'updateLives|setLives|displayLives', 'ライフ更新'),
            (r'getElementById\([\'"]score', 'スコア要素取得'),
            (r'innerHTML|textContent', 'テキスト更新')
        ]
    }
    
    results = {}
    for category, patterns in features.items():
        print(f"\n【{category}】")
        category_found = 0
        for pattern, description in patterns:
            if re.search(pattern, js_content, re.IGNORECASE):
                print(f"✅ {description}")
                category_found += 1
            else:
                print(f"❌ {description}")
        results[category] = (category_found, len(patterns))
    
    # 統計情報
    print("\n\n=== 実装状況サマリー ===")
    total_found = 0
    total_expected = 0
    for category, (found, expected) in results.items():
        percentage = (found / expected * 100) if expected > 0 else 0
        print(f"{category}: {found}/{expected} ({percentage:.0f}%)")
        total_found += found
        total_expected += expected
    
    total_percentage = (total_found / total_expected * 100) if total_expected > 0 else 0
    print(f"\n総合実装率: {total_found}/{total_expected} ({total_percentage:.0f}%)")
    
    return total_percentage >= 70  # 70%以上で合格

def check_common_issues(js_content):
    """よくある問題をチェック"""
    print("\n\n=== 潜在的な問題チェック ===")
    
    issues = []
    
    # 未定義変数の使用
    undefined_vars = re.findall(r'\b(\w+)\s*=\s*undefined\b', js_content)
    if undefined_vars:
        issues.append(f"未定義変数の使用: {', '.join(set(undefined_vars))}")
    
    # console.logの残存
    console_logs = len(re.findall(r'console\.(log|error|warn)', js_content))
    if console_logs > 10:
        issues.append(f"デバッグ用console.logが多数残存 ({console_logs}箇所)")
    
    # エラーハンドリング
    try_catch = len(re.findall(r'try\s*{', js_content))
    if try_catch == 0:
        issues.append("エラーハンドリング(try-catch)が見つかりません")
    
    # メモリリーク可能性
    if 'removeEventListener' not in js_content and js_content.count('addEventListener') > 5:
        issues.append("イベントリスナーの削除処理が見つかりません（メモリリークの可能性）")
    
    # グローバル変数の過度な使用
    global_vars = len(re.findall(r'^(var|let|const)\s+\w+\s*=', js_content, re.MULTILINE))
    if global_vars > 30:
        issues.append(f"グローバル変数が多すぎる可能性 ({global_vars}個)")
    
    if issues:
        for issue in issues:
            print(f"⚠️  {issue}")
    else:
        print("✅ 特に問題は見つかりませんでした")
    
    return len(issues) == 0

def main():
    filename = "/mnt/c/makeProc/ClaudeFlow/ClaudeFlow/scripts/index.html"
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"❌ ファイル読み込みエラー: {e}")
        return
    
    js_content = extract_javascript(html_content)
    
    if not js_content:
        print("❌ JavaScriptコードが見つかりません")
        return
    
    print(f"📊 JavaScript総行数: {len(js_content.splitlines())}行")
    print(f"📊 JavaScript総文字数: {len(js_content)}文字\n")
    
    # 機能チェック
    features_ok = check_javascript_features(js_content)
    
    # 問題チェック
    issues_ok = check_common_issues(js_content)
    
    # 最終評価
    print("\n\n=== 最終評価 ===")
    if features_ok and issues_ok:
        print("✅ パックマンゲームとして十分な実装がされています")
        print("✅ 重大な問題は見つかりませんでした")
        print("\n⭐ ブラウザで実際に動作確認することを推奨します")
    elif features_ok:
        print("✅ 基本的な機能は実装されています")
        print("⚠️  いくつかの潜在的な問題があります")
    else:
        print("❌ 必要な機能の実装が不足しています")

if __name__ == "__main__":
    main()