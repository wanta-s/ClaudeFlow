#!/bin/bash

echo "🐳 Dockerを使用してタスク管理アプリを起動します"

# Dockerの確認
if ! command -v docker &> /dev/null; then
    echo "❌ Dockerがインストールされていません"
    echo "Docker Desktop for Windowsをインストールしてください"
    echo "https://docs.docker.com/desktop/install/windows-install/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-composeがインストールされていません"
    exit 1
fi

# ディレクトリ移動
cd "$(dirname "$0")"

echo "📦 データベースとRedisを起動中..."
docker-compose up -d

echo "⏳ データベースの起動を待機中..."
sleep 10

# データベース接続確認
echo "🔍 データベース接続確認..."
until docker-compose exec postgres pg_isready -U postgres; do
  echo "データベースの起動を待機中..."
  sleep 2
done

echo "✅ データベースが起動しました！"

# バックエンドセットアップ
echo "⚙️ バックエンドセットアップ中..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストール中..."
    npm install
fi

echo "🗃️ Prismaセットアップ中..."
npx prisma generate
npx prisma migrate dev --name init

echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "🚀 アプリケーションを起動するには:"
echo "   npm run dev"
echo ""
echo "📊 サービス状況:"
echo "   - PostgreSQL: http://localhost:5432"
echo "   - Redis: http://localhost:6379"
echo "   - API: http://localhost:3000 (起動後)"
echo ""
echo "🛑 停止するには:"
echo "   docker-compose down"