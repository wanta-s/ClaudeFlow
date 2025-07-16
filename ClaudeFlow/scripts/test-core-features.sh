#!/bin/bash

echo "=== コア機能テスト ==="
echo ""

# 現在のfeatures.jsonの内容を確認
echo "1. features.json の確認"
if [ -f "../implementation/features.json" ]; then
    echo "コア機能 (core: true):"
    grep -B2 -A1 '"core": true' ../implementation/features.json | grep '"name"' | cut -d'"' -f4 || echo "なし"
    echo ""
    echo "非コア機能 (core: false):"
    grep -B2 -A1 '"core": false' ../implementation/features.json | grep '"name"' | cut -d'"' -f4 || echo "なし"
else
    echo "features.json が見つかりません"
fi

echo ""
echo "2. 機能選択のシミュレーション"
echo "選択: C (コア機能のみ)"
echo ""

# 実際にスクリプトを実行（短時間で終了）
echo -e "1\nC" | timeout 10 bash hybrid-implementation.sh ../results/03_requirements_result.md ../results/05_design_result.md 2>&1 | grep -E "(CORE|コア機能|個の機能)" | head -20

echo ""
echo "=== テスト完了 ==="