#!/bin/bash

echo "🚀 タスク管理アプリ セットアップ開始"

# ディレクトリ移動
cd "$(dirname "$0")"

# PostgreSQLの起動確認
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQLがインストールされていません"
    echo "インストール手順:"
    echo "Ubuntu/WSL: sudo apt update && sudo apt install postgresql postgresql-contrib"
    echo "macOS: brew install postgresql"
    exit 1
fi

# PostgreSQL起動確認
if ! sudo -u postgres psql -c "SELECT 1;" &> /dev/null; then
    echo "📦 PostgreSQLを起動中..."
    sudo service postgresql start
fi

# データベース作成
echo "🗄️ データベースセットアップ中..."
sudo -u postgres psql << 'EOF'
-- データベースが存在しない場合のみ作成
SELECT 'CREATE DATABASE taskmanagement'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'taskmanagement')\gexec

-- ユーザーが存在しない場合のみ作成
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'taskuser') THEN

      CREATE ROLE taskuser LOGIN PASSWORD 'taskpass123';
   END IF;
END
$do$;

GRANT ALL PRIVILEGES ON DATABASE taskmanagement TO taskuser;
EOF

# バックエンドセットアップ
echo "⚙️ バックエンドセットアップ中..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストール中..."
    npm install
fi

# 環境変数の更新
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://taskuser:taskpass123@localhost:5432/taskmanagement"

# JWT
JWT_SECRET="task-management-super-secret-jwt-key-change-in-production"

# Server
PORT=3000
NODE_ENV=development

# CORS
CLIENT_URL="http://localhost:3001"
EOF

echo "🗃️ Prismaセットアップ中..."
npx prisma generate
npx prisma migrate dev --name init

echo ""
echo "✅ セットアップ完了!"
echo ""
echo "🚀 アプリケーションを起動するには:"
echo "   cd backend && npm run dev"
echo ""
echo "📊 ヘルスチェック: http://localhost:3000/health"
echo "🔐 API: http://localhost:3000/api/auth/register"
echo ""
echo "📝 ユーザー登録テスト:"
echo 'curl -X POST http://localhost:3000/api/auth/register \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"email\":\"test@example.com\",\"password\":\"SecureP@ss123\",\"name\":\"テストユーザー\"}"'