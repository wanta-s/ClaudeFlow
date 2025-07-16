#!/bin/bash

# 算術展開の修正テスト

echo "算術展開テスト:"

# 修正前（エラーになる）
# echo "エラー例: ${((10 * 100 / 20))}%"

# 修正後（正しい）
total=910
max=2000
percent=$((total * 100 / max))
echo "正しい例: ${total}行 / ${max}行 ($percent%)"

# 別の計算例
echo ""
echo "他の計算例:"
for i in 100 500 1000 1500 2000; do
    p=$((i * 100 / 2000))
    echo "  $i / 2000 = $p%"
done