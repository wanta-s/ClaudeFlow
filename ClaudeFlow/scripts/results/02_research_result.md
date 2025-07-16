# 技術調査レポート

## 技術スタック詳細
### フロントエンド
- **フレームワーク**: React v18.3.1 + TypeScript v5.5
- **主要ライブラリ**:
  - UIコンポーネント: Shadcn/ui (Radix UI + Tailwind CSS)
  - 状態管理: Zustand v4.5
  - ルーティング: React Router v6.24
  - フォーム処理: React Hook Form v7.52 + Zod v3.23
  - API通信: TanStack Query (旧React Query) v5.51
  - カレンダー表示: FullCalendar v6.1 または react-big-calendar v1.13
  - 日付処理: date-fns v3.6

### バックエンド
- **フレームワーク**: Node.js v20.15 LTS + Express.js v4.19 + TypeScript v5.5
- **主要ライブラリ**:
  - 認証: jsonwebtoken v9.0 + bcrypt v5.1
  - データベース接続: pg v8.12 (PostgreSQL用) + Drizzle ORM v0.32
  - バリデーション: Zod v3.23 (フロントエンドと共通)
  - APIドキュメント: Swagger (swagger-ui-express v5.0)
  - ロギング: winston v3.13 + morgan v1.10
  - セキュリティ: helmet v7.1 + cors v2.8 + express-rate-limit v7.3

### データベース
- **種類**: PostgreSQL v15.7
- **ORM/ODM**: Drizzle ORM v0.32 (TypeScript対応、型安全)
- **マイグレーション**: Drizzle Kit
- **接続プール**: pg-pool (pgパッケージに含まれる)

## 開発環境セットアップ
### 必要なツール
1. Node.js v20.15 LTS (推奨: nvm or fnm で管理)
2. PostgreSQL v15.7
3. Git v2.40以上
4. VS Code + 推奨拡張機能:
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features
   - Tailwind CSS IntelliSense
   - PostgreSQL (Chris Kolkman)

### インストールコマンド
```bash
# プロジェクトルートの作成
mkdir reservation-system && cd reservation-system

# フロントエンド
npx create-vite@latest frontend --template react-ts
cd frontend
npm install
npm install react-router-dom@6 zustand@4 @tanstack/react-query@5 
npm install react-hook-form@7 zod@3 @hookform/resolvers
npm install date-fns@3 @fullcalendar/react @fullcalendar/daygrid
npm install axios@1.7 lucide-react clsx tailwind-merge
npm install -D @types/node tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
npx shadcn-ui@latest init

# バックエンド
cd ..
mkdir backend && cd backend
npm init -y
npm install express@4 cors@2 helmet@7 morgan@1 winston@3
npm install jsonwebtoken@9 bcrypt@5 express-rate-limit@7
npm install pg@8 drizzle-orm@0.32 dotenv@16
npm install zod@3 swagger-ui-express@5 swagger-jsdoc@6
npm install -D typescript@5 @types/node @types/express
npm install -D @types/cors @types/morgan @types/bcrypt @types/jsonwebtoken
npm install -D tsx@4 nodemon@3 drizzle-kit@0.23
npm install -D eslint@8 @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier

# TypeScript設定
npx tsc --init

# Docker設定（開発環境用）
cd ..
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: reservationuser
      POSTGRES_PASSWORD: reservationpass
      POSTGRES_DB: reservationdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF
```

## セキュリティ実装方針
- **認証**: JWT (Access Token + Refresh Token方式)
  - Access Token有効期限: 15分
  - Refresh Token有効期限: 7日
  - HTTPOnly Cookie + Secure + SameSite設定
- **パスワード**: bcryptでハッシュ化 (salt rounds: 12)
- **データ保護**: 
  - HTTPS必須 (TLS 1.3推奨)
  - 個人情報カラムの暗号化 (AES-256-GCM)
- **アクセス制御**: RBAC (Role-Based Access Control)
  - 管理者: 全機能アクセス可能
  - 一般ユーザー: 自分の予約のみ編集・削除可能
- **API保護**:
  - Rate Limiting: 100リクエスト/15分
  - CORS設定: 許可されたオリジンのみ
  - CSRFトークン実装
  - SQLインジェクション対策: パラメータ化クエリ使用

## パフォーマンス目標
- 初回読み込み: 3秒以内 (Lighthouse Performance Score 90以上)
- API応答時間: 
  - 読み取り操作: 100ms以内
  - 書き込み操作: 200ms以内
- 同時接続数: 100ユーザー
- データベース:
  - 接続プール: 最小5、最大20接続
  - インデックス: 予約日時、ユーザーID、施設IDに設定
  - キャッシュ: Redis導入検討（将来的に）

## 推奨されるプロジェクト構造
```
reservation-system/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # 認証関連コンポーネント
│   │   │   ├── calendar/      # カレンダー表示
│   │   │   ├── reservations/  # 予約管理
│   │   │   └── ui/           # 共通UIコンポーネント
│   │   ├── hooks/            # カスタムフック
│   │   ├── pages/            # ページコンポーネント
│   │   ├── services/         # API通信ロジック
│   │   ├── store/            # Zustand ストア
│   │   ├── types/            # TypeScript型定義
│   │   ├── utils/            # ユーティリティ関数
│   │   └── App.tsx
│   ├── public/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/      # リクエストハンドラー
│   │   ├── middleware/       # Express ミドルウェア
│   │   ├── models/          # データモデル定義
│   │   ├── routes/          # APIルート定義
│   │   ├── services/        # ビジネスロジック
│   │   ├── db/              # データベース設定
│   │   │   ├── schema.ts    # Drizzle スキーマ
│   │   │   └── migrations/  # マイグレーションファイル
│   │   ├── utils/           # ユーティリティ関数
│   │   ├── types/           # TypeScript型定義
│   │   └── app.ts           # Express アプリケーション
│   ├── tests/               # テストファイル
│   ├── .env.example         # 環境変数サンプル
│   └── package.json
├── docker-compose.yml       # Docker設定
├── .gitignore
└── README.md
```

## 次のステップ
1. 要件定義で機能の詳細を確定
2. この技術スタックでプロトタイプを実装
3. 開発環境のセットアップとチーム共有

## 補足事項
### 選定ライブラリの特徴
- **Shadcn/ui**: カスタマイズ可能なコンポーネントライブラリ。Radix UIベースで高いアクセシビリティ
- **Zustand**: Reduxより軽量でシンプルな状態管理。TypeScript対応が優秀
- **TanStack Query**: サーバー状態管理に特化。キャッシュ、同期、更新が自動化
- **Drizzle ORM**: TypeScript型安全なORM。Prismaより軽量で高速
- **date-fns**: moment.jsより軽量で、ツリーシェイキング対応

### 開発効率向上のための追加ツール
- **Biome**: ESLint + Prettierの代替。高速で設定が簡単
- **Turborepo**: モノレポ管理（フロントエンド・バックエンド統合時）
- **Docker**: 開発環境の統一化
- **GitHub Actions**: CI/CD自動化