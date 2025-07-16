#!/bin/bash

# 予約一覧表示機能の単体テストを実行するスクリプト

echo "予約一覧表示機能の単体テストを実行します..."

# 必要なパッケージをインストール
if [ ! -d "node_modules" ]; then
  echo "依存関係をインストールしています..."
  npm install
fi

# テストを実行
npm test

# 実行結果を表示
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ すべてのテストが成功しました！"
else
  echo ""
  echo "❌ テストが失敗しました。"
  exit 1
fi