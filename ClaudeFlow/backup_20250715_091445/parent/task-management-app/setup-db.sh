#!/bin/bash

echo "🗄️ PostgreSQLデータベースセットアップ..."

# PostgreSQLサービスの開始
echo "📦 PostgreSQLサービスを開始中..."
sudo service postgresql start

# postgresユーザーのパスワード設定（もし未設定の場合）
echo "🔐 postgresユーザーのパスワードを設定中..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# データベースとshadow databaseの作成
echo "📊 データベースを作成中..."
sudo -u postgres psql << 'EOF'
-- メインデータベースの作成
DROP DATABASE IF EXISTS taskmanagement;
CREATE DATABASE taskmanagement;

-- Shadow databaseの作成（Prismaマイグレーション用）
DROP DATABASE IF EXISTS taskmanagement_shadow;
CREATE DATABASE taskmanagement_shadow;

-- 権限確認
\l
EOF

echo "✅ データベースセットアップ完了！"
echo ""
echo "📋 作成されたデータベース:"
echo "  - taskmanagement (メインDB)"
echo "  - taskmanagement_shadow (シャドウDB)"
echo ""
echo "🔗 接続情報:"
echo "  - ユーザー: postgres"
echo "  - パスワード: postgres"
echo "  - ホスト: localhost"
echo "  - ポート: 5432"