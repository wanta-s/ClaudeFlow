#!/bin/bash

# 予約作成機能 Roughレベル実装テスト実行スクリプト

echo "=========================================="
echo "予約作成機能 Roughレベル単体テスト"
echo "=========================================="

# テスト環境のセットアップ
echo "テスト環境をセットアップしています..."

# Jest設定ファイルが存在しない場合は作成
if [ ! -f "jest.config.js" ]; then
  cat > jest.config.js << EOF
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.rough.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true
      }
    }]
  }
};
EOF
fi

# package.jsonが存在しない場合は作成
if [ ! -f "package.json" ]; then
  cat > package.json << EOF
{
  "name": "reservation-create-rough-tests",
  "version": "1.0.0",
  "description": "Rough level tests for reservation creation feature",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  }
}
EOF
fi

# 依存関係のインストール
if [ ! -d "node_modules" ]; then
  echo "依存関係をインストールしています..."
  npm install
fi

# テストの実行
echo ""
echo "テストを実行しています..."
echo ""

# テスト実行
npm test

# 結果の表示
if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "✅ すべてのテストが正常に完了しました"
  echo "=========================================="
else
  echo ""
  echo "=========================================="
  echo "❌ テストの実行中にエラーが発生しました"
  echo "=========================================="
  exit 1
fi