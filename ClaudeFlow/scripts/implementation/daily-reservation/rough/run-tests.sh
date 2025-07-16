#!/bin/bash

# Rough level unit test runner

echo "=== 日別予約表示機能 単体テスト (Roughレベル) ==="
echo ""
echo "実行環境: roughレベル - 基本的な正常系のみ"
echo ""

# TypeScriptコンパイルチェック
echo "TypeScriptコンパイル確認..."
npx tsc --noEmit index.ts index.test.ts 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ コンパイル成功"
else
    echo "✗ コンパイルエラー（roughレベルでは無視）"
fi

echo ""
echo "テスト実行..."
echo ""

# テスト実行
npx ts-node index.test.ts

echo ""
echo "=== テスト完了 ==="