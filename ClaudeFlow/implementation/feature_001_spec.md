# 機能仕様書: ユーザー登録

## 機能概要
新規ユーザーがアプリケーションに登録できる機能を提供します。

## 技術仕様

### API エンドポイント
- **POST** `/api/auth/register`

### リクエスト形式
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "太郎 田中"
}
```

### レスポンス形式
**成功時 (201 Created):**
```json
{
  "success": true,
  "message": "ユーザー登録が完了しました",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "太郎 田中",
    "createdAt": "2025-01-15T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**エラー時 (400 Bad Request):**
```json
{
  "success": false,
  "error": "バリデーションエラー",
  "details": [
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください"
    }
  ]
}
```

### バリデーション規則
- **email**: 必須、メール形式、255文字以内、重複不可
- **password**: 必須、8文字以上、英数字含む
- **name**: 必須、50文字以内

### セキュリティ要件
- パスワードはbcryptでハッシュ化（saltRounds: 10）
- JWTトークンの有効期限: 24時間
- レート制限: 同一IPから5分間に5回まで

### データベーススキーマ
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### エラーハンドリング
- メールアドレス重複: 409 Conflict
- バリデーションエラー: 400 Bad Request
- サーバーエラー: 500 Internal Server Error

### フロントエンド要件
- レスポンシブフォームデザイン
- リアルタイムバリデーション
- パスワード強度インジケーター
- 送信中のローディング状態