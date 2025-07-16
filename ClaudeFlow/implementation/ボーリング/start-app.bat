@echo off
echo 🚀 ボーリング を起動中...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js がインストールされていません
    echo 📥 https://nodejs.org からダウンロードしてインストールしてください
    pause
    exit /b 1
)

if not exist node_modules (
    echo 📦 依存関係をインストール中...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依存関係のインストールに失敗しました
        pause
        exit /b 1
    )
)

if "web"=="web" (
    echo 🌐 Next.js 開発サーバーを起動中...
    echo 📍 ブラウザで http://localhost:3000 を開きます
    start http://localhost:3000
    npm run dev
) else if "web"=="backend" (
    echo 🔧 Express サーバーを起動中...
    echo 📍 API: http://localhost:3001
    npm run dev
) else if "web"=="fullstack" (
    echo 🌐 フルスタックアプリケーションを起動中...
    echo 📍 フロントエンド: http://localhost:3000
    echo 📍 バックエンド: http://localhost:3001
    start http://localhost:3000
    npm run dev
) else if "web"=="cli" (
    echo 🔧 CLI アプリケーションをビルド中...
    npm run build
    echo ✅ CLI アプリケーションの準備が完了しました
    echo 使用方法: npm start -- --help
) else if "web"=="library" (
    echo 📚 ライブラリをビルド中...
    npm run build
    echo ✅ ライブラリのビルドが完了しました
    echo テスト実行: npm test
) else (
    echo 🚀 開発サーバーを起動中...
    npm run dev
)

pause
