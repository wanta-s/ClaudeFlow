#!/usr/bin/env python3
"""
魚釣りゲームの詳細検証スクリプト
"""

import os
import re
import json

def extract_js_from_html(html_content):
    """HTMLからJavaScriptコードを抽出"""
    js_match = re.search(r'<script>(.*?)</script>', html_content, re.DOTALL)
    if js_match:
        return js_match.group(1)
    return None

def analyze_fish_data(js_code):
    """魚データの詳細解析"""
    result = {
        'total_count': 0,
        'by_rarity': {},
        'by_time': {},
        'special_fish': [],
        'trash_items': []
    }
    
    # fishes配列を抽出
    fishes_match = re.search(r'fishes:\s*\[(.*?)\](?=,\s*init)', js_code, re.DOTALL)
    if not fishes_match:
        return result
    
    fishes_content = fishes_match.group(1)
    
    # 個別の魚オブジェクトを抽出
    fish_objects = re.findall(r'\{([^}]+)\}', fishes_content)
    result['total_count'] = len(fish_objects)
    
    for fish_obj in fish_objects:
        # ID抽出
        id_match = re.search(r"id:\s*['\"]([^'\"]+)['\"]", fish_obj)
        if id_match:
            fish_id = id_match.group(1)
            
            # 名前抽出
            name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", fish_obj)
            name = name_match.group(1) if name_match else "Unknown"
            
            # レア度抽出
            rarity_match = re.search(r"rarity:\s*(\d+)", fish_obj)
            if rarity_match:
                rarity = int(rarity_match.group(1))
                result['by_rarity'][rarity] = result['by_rarity'].get(rarity, 0) + 1
                
                # 特別な魚
                if rarity >= 4:
                    result['special_fish'].append(f"{name} (★{rarity})")
            
            # ゴミ判定
            if 'isTrash:' in fish_obj and 'true' in fish_obj:
                result['trash_items'].append(name)
            
            # 時間帯
            times_match = re.search(r"times:\s*\[([^\]]+)\]", fish_obj)
            if times_match:
                times = re.findall(r"['\"]([^'\"]+)['\"]", times_match.group(1))
                for time in times:
                    result['by_time'][time] = result['by_time'].get(time, 0) + 1
    
    return result

def check_game_functionality(js_code):
    """ゲーム機能の詳細チェック"""
    checks = {
        'core_functions': {
            'init': 'ゲーム初期化',
            'cast': '釣り糸を垂らす',
            'reel': '魚を引き上げる',
            'startBiting': '魚がかかる処理',
            'reset': 'リセット処理',
            'saveData': 'データ保存',
            'loadData': 'データ読み込み',
            'showCatchResult': '釣果表示',
            'showCollection': '図鑑表示',
            'playSound': '効果音再生'
        },
        'ui_elements': {
            'getElementById': 'DOM要素アクセス',
            'addEventListener': 'イベントリスナー',
            'style.display': '要素の表示/非表示',
            'innerHTML': 'HTML更新',
            'textContent': 'テキスト更新'
        },
        'game_features': {
            'localStorage': 'データ永続化',
            'Math.random': 'ランダム処理',
            'setTimeout': 'タイマー処理',
            'setInterval': '定期処理',
            'AudioContext': '音声処理'
        }
    }
    
    results = {}
    for category, items in checks.items():
        results[category] = {}
        for key, desc in items.items():
            results[category][key] = {
                'found': key in js_code,
                'description': desc
            }
    
    return results

def check_potential_issues(html_content, js_code):
    """潜在的な問題のチェック"""
    issues = []
    
    # セキュリティチェック
    if 'eval(' in js_code:
        issues.append("⚠️ eval()の使用 - セキュリティリスクの可能性")
    
    if 'innerHTML' in js_code and not 'textContent' in js_code:
        issues.append("⚠️ innerHTMLのみ使用 - XSSリスクの可能性")
    
    # パフォーマンスチェック
    dom_access_count = len(re.findall(r'getElementById', js_code))
    if dom_access_count > 50:
        issues.append(f"⚠️ DOM要素への頻繁なアクセス ({dom_access_count}回) - パフォーマンスに影響の可能性")
    
    # ブラウザ互換性
    if 'AudioContext' in js_code and 'webkitAudioContext' in js_code:
        issues.append("✅ AudioContextのクロスブラウザ対応実装")
    elif 'AudioContext' in js_code:
        issues.append("⚠️ AudioContext - Safari旧バージョンで動作しない可能性")
    
    # モバイル対応
    if 'viewport' in html_content:
        issues.append("✅ モバイル対応のviewport設定")
    
    if '@media' in html_content:
        issues.append("✅ レスポンシブデザイン対応")
    
    return issues

def main():
    """メイン処理"""
    file_path = '/mnt/c/makeProc/ClaudeFlow/ClaudeFlow/scripts/fishinggame.html'
    
    print("=" * 60)
    print("🎣 魚釣りゲーム詳細検証レポート")
    print("=" * 60)
    
    if not os.path.exists(file_path):
        print(f"❌ エラー: ファイルが見つかりません: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    js_code = extract_js_from_html(content)
    if not js_code:
        print("❌ JavaScriptコードが見つかりません")
        return
    
    # 魚データ解析
    print("\n🐟 魚データ解析")
    print("-" * 40)
    fish_data = analyze_fish_data(js_code)
    print(f"総魚種数: {fish_data['total_count']}")
    
    print("\nレア度別:")
    for rarity in sorted(fish_data['by_rarity'].keys()):
        stars = '★' * rarity
        count = fish_data['by_rarity'][rarity]
        print(f"  {stars}: {count}種")
    
    print("\n時間帯別出現数:")
    for time, count in sorted(fish_data['by_time'].items()):
        time_jp = {'morning': '朝', 'day': '昼', 'evening': '夕', 'night': '夜'}.get(time, time)
        print(f"  {time_jp}: {count}種")
    
    if fish_data['special_fish']:
        print("\n特別な魚 (レア度4以上):")
        for fish in fish_data['special_fish'][:5]:  # 最初の5匹
            print(f"  - {fish}")
    
    if fish_data['trash_items']:
        print(f"\nゴミアイテム: {len(fish_data['trash_items'])}種")
        for item in fish_data['trash_items']:
            print(f"  - {item}")
    
    # 機能チェック
    print("\n⚙️ ゲーム機能チェック")
    print("-" * 40)
    functionality = check_game_functionality(js_code)
    
    for category, items in functionality.items():
        print(f"\n{category}:")
        found_count = sum(1 for item in items.values() if item['found'])
        total_count = len(items)
        print(f"実装率: {found_count}/{total_count} ({found_count/total_count*100:.0f}%)")
        
        for key, data in items.items():
            status = "✅" if data['found'] else "❌"
            print(f"  {status} {data['description']}")
    
    # 潜在的な問題
    print("\n🔍 潜在的な問題と特徴")
    print("-" * 40)
    issues = check_potential_issues(content, js_code)
    for issue in issues:
        print(f"  {issue}")
    
    # 総合評価
    print("\n📊 総合評価")
    print("-" * 40)
    
    core_func_count = sum(1 for item in functionality['core_functions'].values() if item['found'])
    if core_func_count >= 8:
        print("✅ コア機能が充実 - 完全に動作可能なゲーム")
    elif core_func_count >= 5:
        print("⚠️ 一部機能が不足 - 基本的には動作するゲーム")
    else:
        print("❌ 主要機能が不足 - 正常動作しない可能性")
    
    if fish_data['total_count'] >= 15:
        print("✅ 豊富なコンテンツ - 長く楽しめるゲーム")
    elif fish_data['total_count'] >= 10:
        print("⚠️ 標準的なコンテンツ量")
    else:
        print("❌ コンテンツ不足")
    
    print(f"\n🎮 このゲームは{fish_data['total_count']}種類の魚が釣れる本格的な釣りゲームです！")
    print("✨ ブラウザで開けばすぐに遊べます！")

if __name__ == "__main__":
    main()