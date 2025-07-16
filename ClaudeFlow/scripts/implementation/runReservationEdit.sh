#!/bin/bash

# TypeScriptファイルを直接実行
echo "予約編集機能の実行テスト"
echo "========================"

# ts-nodeがインストールされていない場合はnodeで実行
if command -v ts-node &> /dev/null; then
    ts-node testReservationEdit.ts
else
    echo "ts-nodeがインストールされていません。"
    echo "以下のコマンドでインストールしてください："
    echo "npm install -g ts-node typescript"
    echo ""
    echo "またはnpxで実行："
    echo "npx ts-node testReservationEdit.ts"
fi

echo ""
echo "単体テストの実行"
echo "================"
npx jest reservationEdit.test.ts --no-coverage