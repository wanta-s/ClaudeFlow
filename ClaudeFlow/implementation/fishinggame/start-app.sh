#!/bin/bash

# fishinggame 起動スクリプト
echo "🚀 fishinggame を起動中..."

# Node.js のチェック
if ! command -v node &> /dev/null; then
    echo "❌ Node.js がインストールされていません"
    echo "📥 https://nodejs.org からダウンロードしてインストールしてください"
    exit 1
fi

# 依存関係のチェック・インストール
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストール中..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依存関係のインストールに失敗しました"
        exit 1
    fi
fi

# プロジェクトタイプ別の起動
case "backend" in
    "web"|"frontend")
        echo "🌐 Next.js 開発サーバーを起動中..."
        echo "📍 ブラウザで http://localhost:3000 を開きます"
        if command -v open &> /dev/null; then
            open http://localhost:3000 &
        elif command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000 &
        fi
        npm run dev
        ;;
    "backend"|"api")
        echo "🔧 Express サーバーを起動中..."
        echo "📍 API: http://localhost:3001"
        npm run dev
        ;;
    "fullstack")
        echo "🌐 フルスタックアプリケーションを起動中..."
        echo "📍 フロントエンド: http://localhost:3000"
        echo "📍 バックエンド: http://localhost:3001"
        npm run dev
        ;;
    "cli")
        echo "🔧 CLI アプリケーションをビルド中..."
        npm run build
        echo "✅ CLI アプリケーションの準備が完了しました"
        echo "使用方法: npm start -- --help"
        ;;
    "library")
        echo "📚 ライブラリをビルド中..."
        npm run build
        echo "✅ ライブラリのビルドが完了しました"
        echo "テスト実行: npm test"
        ;;
    *)
        echo "🚀 開発サーバーを起動中..."
        npm run dev
        ;;
esac
