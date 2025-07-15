# 技術調査レポート

## 技術スタック詳細
### フロントエンド
- **フレームワーク**: Next.js v14.2.x
- **言語**: TypeScript v5.3.x
- **主要ライブラリ**:
  - UIコンポーネント: shadcn/ui (Radix UI + Tailwind CSS)
  - 状態管理: Zustand v4.5.x
  - ルーティング: Next.js App Router (内蔵)
  - フォーム処理: React Hook Form v7.50.x + Zod v3.22.x
  - API通信: TanStack Query v5.28.x
  - アイコン: Lucide React v0.350.x

### バックエンド
- **フレームワーク**: Next.js API Routes v14.2.x
- **主要ライブラリ**:
  - 認証: NextAuth.js v4.24.x
  - データベース接続: Prisma v5.11.x
  - バリデーション: Zod v3.22.x
  - APIセキュリティ: helmet v7.1.x
  - レート制限: express-rate-limit v7.2.x

### データベース
- **種類**: PostgreSQL v15.x (Supabase)
- **ORM/ODM**: Prisma v5.11.x
- **マイグレーション**: Prisma Migrate

## 開発環境セットアップ
### 必要なツール
1. Node.js v20.11.x LTS
2. pnpm v8.15.x (推奨) または npm v10.x
3. Git v2.40.x以上
4. VS Code (推奨エディタ)

### インストールコマンド
```bash
# プロジェクト作成
npx create-next-app@latest task-manager --typescript --tailwind --app --src-dir
cd task-manager

# 必要なパッケージインストール
npm install @prisma/client prisma
npm install next-auth @auth/prisma-adapter
npm install zustand @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install lucide-react
npm install helmet express-rate-limit

# 開発用パッケージ
npm install -D @types/node

# Prisma初期化
npx prisma init

# shadcn/ui初期化
npx shadcn-ui@latest init
```

## セキュリティ実装方針
- **認証**: NextAuth.js (JWT + セッション管理)
  - セッション有効期限: 24時間
  - リフレッシュトークン: 7日間
- **データ保護**: 
  - パスワード: bcrypt (saltRounds: 10)
  - 通信: HTTPS必須
  - データベース接続: SSL/TLS暗号化
- **アクセス制御**: ロールベースアクセス制御 (RBAC)
  - ユーザーロール: user, admin
  - APIエンドポイント保護: NextAuth.jsミドルウェア
- **セキュリティヘッダー**: helmet.jsによる実装
  - CSP (Content Security Policy)
  - X-Frame-Options
  - X-Content-Type-Options

## パフォーマンス目標
- 初回読み込み: 3秒以内 (LCP)
- API応答時間: 200ms以内 (平均)
- 同時接続数: 100ユーザー
- Core Web Vitals:
  - LCP: < 2.5s
  - FID: < 100ms
  - CLS: < 0.1

## 推奨されるプロジェクト構造
```
task-manager/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 認証関連ページ
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── reset-password/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/[...nextauth]/
│   │   │   └── tasks/
│   │   ├── dashboard/         # ダッシュボード
│   │   └── layout.tsx
│   ├── components/            # UIコンポーネント
│   │   ├── ui/               # shadcn/ui基本コンポーネント
│   │   ├── tasks/            # タスク関連コンポーネント
│   │   └── layout/           # レイアウトコンポーネント
│   ├── lib/                   # ユーティリティ
│   │   ├── auth.ts           # NextAuth設定
│   │   ├── prisma.ts         # Prismaクライアント
│   │   └── validations/      # Zodスキーマ
│   ├── hooks/                 # カスタムフック
│   ├── stores/                # Zustand状態管理
│   └── types/                 # TypeScript型定義
├── prisma/
│   ├── schema.prisma          # データベーススキーマ
│   └── migrations/            # マイグレーションファイル
├── public/                    # 静的ファイル
├── .env.local                 # 環境変数
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## データベーススキーマ（基本）
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String
  role          String    @default("user")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  tasks         Task[]
}

model Task {
  id            String    @id @default(cuid())
  title         String
  description   String?
  status        String    @default("pending")
  priority      String    @default("medium")
  dueDate       DateTime?
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([dueDate])
}
```

## 環境変数設定
```env
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Supabase
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 開発ワークフロー
1. **初期セットアップ**
   ```bash
   git clone [repository]
   cd task-manager
   npm install
   cp .env.example .env.local
   # 環境変数を設定
   npx prisma migrate dev
   npm run dev
   ```

2. **開発サーバー起動**
   ```bash
   npm run dev     # Next.js開発サーバー
   npm run studio  # Prisma Studio (DB管理UI)
   ```

3. **ビルド・デプロイ**
   ```bash
   npm run build
   npm run start   # プロダクションモード確認
   vercel         # Vercelへデプロイ
   ```

## 次のステップ
1. 要件定義で機能の詳細を確定
2. この技術スタックでプロトタイプを実装
3. Supabaseプロジェクトのセットアップ
4. NextAuth.js認証フローの実装