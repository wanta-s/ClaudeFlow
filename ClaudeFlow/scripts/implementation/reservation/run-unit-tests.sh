#!/bin/bash

echo "=== 予約作成機能 単体テスト実行スクリプト ==="
echo ""
echo "roughレベル実装の基本的な正常系テストを実行します。"
echo ""

# Check if jest is available
if ! command -v jest &> /dev/null && ! npx jest --version &> /dev/null 2>&1; then
    echo "Jest がインストールされていません。"
    echo "以下のコマンドでインストールしてください："
    echo ""
    echo "npm install --save-dev jest @types/jest ts-jest typescript"
    echo ""
    exit 1
fi

# Run tests
echo "テストを実行中..."
echo ""

if command -v jest &> /dev/null; then
    jest --config=jest.config.js
else
    npx jest --config=jest.config.js
fi

echo ""
echo "テスト実行完了"