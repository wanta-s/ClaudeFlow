# 認証API仕様書

## 概要

このドキュメントは、タスク管理アプリケーションの認証システムのAPI仕様を定義します。

## ベースURL

```
https://api.taskmanagement.com/v1
```

## 認証

### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/auth/register` | 新規ユーザー登録 |
| POST | `/auth/login` | ユーザーログイン |
| POST | `/auth/logout` | ユーザーログアウト |
| POST | `/auth/refresh` | トークンリフレッシュ |
| POST | `/auth/check-password-strength` | パスワード強度チェック |

---

## POST /auth/register

新規ユーザーを登録します。

### リクエスト

#### Headers
```
Content-Type: application/json
```

#### Body
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "name": "山田太郎"
}
```

#### パラメータ

| フィールド | 型 | 必須 | 説明 | 制約 |
|-----------|------|------|------|------|
| email | string | ✓ | メールアドレス | 最大255文字、有効なメール形式 |
| password | string | ✓ | パスワード | 8-128文字、大文字・小文字・数字・特殊文字を含む |
| name | string | ✓ | ユーザー名 | 1-50文字、制御文字を含まない |

### レスポンス

#### 成功時 (201 Created)
```json
{
  "success": true,
  "message": "ユーザー登録が完了しました",
  "data": {
    "user": {
      "id": 12345,
      "email": "user@example.com",
      "name": "山田太郎",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### エラー時

##### バリデーションエラー (400 Bad Request)
```json
{
  "success": false,
  "error": "バリデーションエラー",
  "details": [
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください"
    },
    {
      "field": "password",
      "message": "パスワードは8文字以上128文字以内で入力してください"
    }
  ]
}
```

##### メールアドレス重複 (409 Conflict)
```json
{
  "success": false,
  "error": "メールアドレスが既に使用されています"
}
```

##### レート制限 (429 Too Many Requests)
```json
{
  "success": false,
  "error": "リクエストが多すぎます。5分後に再試行してください。"
}
```

### レート制限

- 5分間に最大5回まで
- 制限を超えると429エラーを返す

---

## POST /auth/check-password-strength

パスワードの強度をチェックします。

### リクエスト

#### Headers
```
Content-Type: application/json
```

#### Body
```json
{
  "password": "MyPassword123"
}
```

### レスポンス

#### 成功時 (200 OK)
```json
{
  "success": true,
  "data": {
    "strength": {
      "score": 3,
      "level": "medium",
      "feedback": [
        "特殊文字を含めてください"
      ]
    }
  }
}
```

### パスワード強度レベル

| スコア | レベル | 説明 |
|--------|--------|------|
| 0-2 | weak | 弱い |
| 3-4 | medium | 普通 |
| 5 | strong | 強い |

### 評価基準

1. 8文字以上
2. 小文字を含む
3. 大文字を含む
4. 数字を含む
5. 特殊文字（@$!%*?&）を含む

---

## セキュリティヘッダー

すべてのレスポンスに以下のセキュリティヘッダーが含まれます：

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

---

## エラーコード一覧

| コード | 説明 |
|--------|------|
| INVALID_CREDENTIALS | 認証情報が無効 |
| EMAIL_EXISTS | メールアドレスが既に存在 |
| USER_NOT_FOUND | ユーザーが見つからない |
| INVALID_TOKEN | トークンが無効 |
| TOKEN_EXPIRED | トークンの有効期限切れ |
| ACCOUNT_LOCKED | アカウントがロックされている |
| EMAIL_NOT_VERIFIED | メールアドレスが未確認 |
| WEAK_PASSWORD | パスワードが弱い |
| RATE_LIMIT_EXCEEDED | レート制限を超過 |
| VALIDATION_ERROR | バリデーションエラー |
| SERVER_ERROR | サーバーエラー |

---

## JWT トークン仕様

### ペイロード構造

```json
{
  "userId": 12345,
  "email": "user@example.com",
  "name": "山田太郎",
  "iat": 1705316400,
  "exp": 1705402800,
  "iss": "task-management-app",
  "aud": "task-management-users"
}
```

### トークン設定

- アルゴリズム: HS256
- 有効期限: 24時間
- 発行者: task-management-app
- 対象者: task-management-users

---

## 使用例

### cURL

```bash
# ユーザー登録
curl -X POST https://api.taskmanagement.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecureP@ss123",
    "name": "山田太郎"
  }'

# パスワード強度チェック
curl -X POST https://api.taskmanagement.com/v1/auth/check-password-strength \
  -H "Content-Type: application/json" \
  -d '{
    "password": "MyPassword123"
  }'
```

### JavaScript (Fetch API)

```javascript
// ユーザー登録
const registerUser = async () => {
  const response = await fetch('https://api.taskmanagement.com/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'SecureP@ss123',
      name: '山田太郎'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('登録成功:', data.data);
    localStorage.setItem('token', data.data.token);
  } else {
    console.error('登録失敗:', data.error);
  }
};
```

### TypeScript (Axios)

```typescript
import axios from 'axios';
import { UserRegistrationRequest, ApiResponse, AuthResponse } from './types/auth.types';

const API_BASE_URL = 'https://api.taskmanagement.com/v1';

const authApi = {
  async register(data: UserRegistrationRequest): Promise<AuthResponse> {
    const response = await axios.post<ApiResponse<AuthResponse>>(
      `${API_BASE_URL}/auth/register`,
      data
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error);
    }
    
    return response.data.data!;
  },
  
  async checkPasswordStrength(password: string) {
    const response = await axios.post(
      `${API_BASE_URL}/auth/check-password-strength`,
      { password }
    );
    
    return response.data;
  }
};

// 使用例
try {
  const authData = await authApi.register({
    email: 'user@example.com',
    password: 'SecureP@ss123',
    name: '山田太郎'
  });
  
  console.log('Token:', authData.token);
} catch (error) {
  console.error('Registration failed:', error);
}
```