import re

# HTMLファイルを読み込む
with open('fishinggame.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('=== 魚釣りゲーム機能チェック ===\n')

# 必須機能のチェック
features = {
    '20種類の魚': [
        'マグロ', 'カツオ', 'サバ', 'アジ', 'イワシ', 'タイ', 'ヒラメ', 'カレイ',
        'フグ', 'アンコウ', 'タコ', 'イカ', 'エビ', 'カニ', 'クラゲ', 'サメ',
        'マンボウ', 'エイ', 'ウナギ', 'クジラ'
    ],
    'ゴミアイテム': ['空き缶', 'ペットボトル', 'ビニール袋', '流木', '古い長靴'],
    '時間帯システム': ['morning', 'day', 'evening', 'night'],
    'エコポイント': ['ecoPoints'],
    '魚図鑑': ['collection', 'fishCard'],
    'データ保存': ['localStorage', 'saveGame', 'loadGame']
}

print('✅ 実装されている機能:')
for feature, keywords in features.items():
    found = []
    for keyword in keywords:
        if keyword in content:
            found.append(keyword)
    
    if found:
        print(f'  - {feature}: {len(found)}/{len(keywords)} 項目確認')
        if len(found) < len(keywords):
            missing = [k for k in keywords if k not in found]
            print(f'    未確認: {", ".join(missing[:3])}{"..." if len(missing) > 3 else ""}')
    else:
        print(f'  ❌ {feature}: 未実装')

# ゲームロジックの確認
print('\n✅ ゲームロジック:')
logic_patterns = {
    '釣り開始処理': r'startFishing < /dev/null | cast',
    '魚の判定': r'checkBite|catchFish',
    '時間経過': r'timeSystem|updateTime',
    'スコア管理': r'score|points',
    'アニメーション': r'animation|animate',
    'サウンド': r'playSound|audio'
}

for logic, pattern in logic_patterns.items():
    if re.search(pattern, content, re.IGNORECASE):
        print(f'  - {logic}: 実装済み')
    else:
        print(f'  ❌ {logic}: 未確認')

# UI要素の確認
print('\n✅ UI要素:')
ui_elements = {
    'ヘッダー': 'header',
    '池': 'pond',
    '空': 'sky',
    '釣り竿': 'rod',
    'コントロール': 'controls',
    'モーダル': 'modal',
    '統計表示': 'stats'
}

for element, keyword in ui_elements.items():
    if keyword in content:
        print(f'  - {element}: 実装済み')

print('\n=== チェック完了 ===')
