#!/bin/bash

# ハング問題の最小再現テスト

echo "=== ハング問題調査 ==="

# 設定
FEATURES_JSON_PATH="../implementation/features.json"

echo "1. features.json存在確認:"
if [ -f "$FEATURES_JSON_PATH" ]; then
    echo "  ✓ 存在します: $FEATURES_JSON_PATH"
else
    echo "  ✗ 見つかりません: $FEATURES_JSON_PATH"
    exit 1
fi

echo "2. Python実行テスト:"
timeout 5 python3 -c "
import json
with open('$FEATURES_JSON_PATH', 'r') as f:
    data = json.load(f)
    print(f'  ✓ {len(data[\"features\"])} 機能を読み込み')
    for i, feature in enumerate(data['features'][:3]):
        print(f'    {feature[\"id\"]}: {feature[\"name\"]}')
" || echo "  ✗ Python実行失敗"

echo "3. コア機能リスト生成テスト:"
core_list=$(timeout 5 python3 -c "
import json
with open('$FEATURES_JSON_PATH', 'r') as f:
    data = json.load(f)
    for feature in data['features']:
        if feature.get('core', False):
            print(feature['id'])
" 2>/dev/null || echo "ERROR")

if [ "$core_list" = "ERROR" ]; then
    echo "  ✗ コア機能リスト生成失敗"
else
    echo "  ✓ コア機能リスト生成成功:"
    echo "$core_list" | sed 's/^/    /'
fi

echo "4. 配列テスト:"
declare -a test_features
test_features+=("feature_001:テスト1:説明1")
test_features+=("feature_002:テスト2:説明2")
echo "  ✓ 配列サイズ: ${#test_features[@]}"

echo "5. ループテスト:"
for i in "${!test_features[@]}"; do
    feature="${test_features[$i]}"
    echo "  機能 $((i+1)): $feature"
done

echo "=== 調査完了 ==="