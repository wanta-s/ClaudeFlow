#!/bin/bash

# 簡易ローマ字変換テスト

echo "Testing romanization with Python3:"

# Python3でテスト
python3 -c "
text = 'スーパーマリオ'

# 簡易的なひらがな→ローマ字変換テーブル
hiragana_to_romaji = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    'ー': '-', '〜': '-'
}

# カタカナ→ひらがな変換
result = []
for char in text:
    if 'ァ' <= char <= 'ヶ':
        # カタカナをひらがなに変換
        hiragana = chr(ord(char) - ord('ァ') + ord('ぁ'))
        result.append(hiragana_to_romaji.get(hiragana, char))
    elif char in hiragana_to_romaji:
        result.append(hiragana_to_romaji[char])
    elif 'A' <= char <= 'Z' or 'a' <= char <= 'z' or '0' <= char <= '9' or char in ' -_':
        result.append(char)
    # 漢字や未知の文字は無視

print('Input:', text)
print('Output:', ''.join(result))
"

echo ""
echo "Testing with sed fallback:"
echo "スーパーマリオ" | sed 's/ス/su/g;s/ー/-/g;s/パ/pa/g;s/マ/ma/g;s/リ/ri/g;s/オ/o/g'