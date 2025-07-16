# 最小限の認証実装 - 使用例

## セットアップ

```bash
cd scripts/implementation
npm install
npm start
```

## APIエンドポイント

### 1. ユーザー登録
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 2. ログイン
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. 認証が必要なエンドポイント
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## ファイル構成

```
implementation/
├── models/
│   └── User.ts              # Sequelizeユーザーモデル
├── repositories/
│   └── UserRepository.ts    # ユーザーリポジトリ
├── services/
│   ├── TokenService.ts      # JWT トークン生成
│   └── RegisterService.ts   # ユーザー登録サービス
├── routes/
│   └── authRoutes.ts        # Express ルート定義
├── passwordService.ts       # パスワードハッシュ処理
├── loginService.ts          # ログインサービス
├── authMiddleware.ts        # JWT認証ミドルウェア
├── index.ts                 # アプリケーションエントリーポイント
├── package.json
└── tsconfig.json
```