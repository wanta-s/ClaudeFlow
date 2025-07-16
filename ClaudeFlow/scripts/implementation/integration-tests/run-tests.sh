#!/bin/bash

echo "=== 予約システム統合テスト実行 ==="
echo

# 依存関係のインストール
echo "📦 依存関係をインストール中..."
npm install

echo
echo "🧪 統合テストを実行中..."
echo

# エンドツーエンドテスト
echo "1️⃣ エンドツーエンドシナリオテスト"
npm run test:e2e
echo

# 機能間相互作用テスト
echo "2️⃣ 機能間相互作用テスト"
npm run test:interaction
echo

# データフローテスト
echo "3️⃣ データフローテスト"
npm run test:dataflow
echo

# 全体テスト実行
echo "4️⃣ 全統合テスト実行"
npm test

# カバレッジレポート
echo
echo "📊 カバレッジレポート生成"
npm run test:coverage

echo
echo "✅ 統合テスト完了!"