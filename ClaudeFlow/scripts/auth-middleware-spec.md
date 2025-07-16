# 認証ミドルウェア詳細仕様

## 概要
APIリクエストのJWT検証処理を行うミドルウェア。すべての保護されたエンドポイントで使用される。

## インターフェース定義

```typescript
// 認証済みリクエストの型定義
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// JWTペイロードの型定義
interface JWTPayload {
  sub: string;    // ユーザーID
  email: string;  // メールアドレス
  iat: number;    // 発行日時
  exp: number;    // 有効期限
}

// 認証エラーの型定義
interface AuthError {
  code: string;
  message: string;
  statusCode: number;
}

// 認証結果の型定義
type AuthResult = Result<JWTPayload, AuthError>;
```

## 主要メソッドのシグネチャ

```typescript
// 認証ミドルウェア本体
function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void>;

// JWT検証メソッド
async function verifyToken(token: string): Promise<AuthResult>;

// トークン抽出メソッド
function extractToken(req: Request): string | null;

// ユーザー情報セットメソッド
function setAuthenticatedUser(
  req: AuthenticatedRequest,
  payload: JWTPayload
): void;
```

## エラーケース

```typescript
const AUTH_ERRORS = {
  // トークンが提供されていない
  MISSING_TOKEN: {
    code: 'AUTH_001',
    message: 'Authorization token is missing',
    statusCode: 401
  },
  
  // 無効なトークン形式
  INVALID_FORMAT: {
    code: 'AUTH_002',
    message: 'Invalid token format',
    statusCode: 401
  },
  
  // トークンの有効期限切れ
  TOKEN_EXPIRED: {
    code: 'AUTH_003',
    message: 'Token has expired',
    statusCode: 401
  },
  
  // 無効な署名
  INVALID_SIGNATURE: {
    code: 'AUTH_004',
    message: 'Invalid token signature',
    statusCode: 401
  },
  
  // トークンのデコードエラー
  DECODE_ERROR: {
    code: 'AUTH_005',
    message: 'Failed to decode token',
    statusCode: 401
  },
  
  // ユーザーが存在しない
  USER_NOT_FOUND: {
    code: 'AUTH_006',
    message: 'User not found',
    statusCode: 401
  }
} as const;
```

## 依存関係

```typescript
// 外部ライブラリ
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 内部モジュール
import { IUserRepository } from '../repositories/UserRepository';
import { ITokenService } from '../services/TokenService';
import { Result } from '../types/common';
import { logger } from '../utils/logger';

// 設定
import { JWT_SECRET, JWT_ALGORITHM } from '../config/auth';
```

## 実装詳細

### 1. トークン抽出ロジック
```typescript
// Authorizationヘッダーからトークンを抽出
// 形式: "Bearer <token>"
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}
```

### 2. 検証フロー
```typescript
async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. トークン抽出
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json(AUTH_ERRORS.MISSING_TOKEN);
    }
    
    // 2. トークン検証
    const result = await verifyToken(token);
    if (!result.success) {
      return res.status(result.error.statusCode).json(result.error);
    }
    
    // 3. ユーザー情報セット
    setAuthenticatedUser(req as AuthenticatedRequest, result.data);
    
    // 4. 次のミドルウェアへ
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      code: 'AUTH_500',
      message: 'Internal authentication error'
    });
  }
}
```

### 3. セキュリティ考慮事項
- トークンの有効期限は15分（アクセストークン）
- リフレッシュトークンは別途管理
- トークンはHTTPSでのみ送信
- ログにトークンを含めない
- 無効なトークンに対する詳細なエラー情報は提供しない

### 4. パフォーマンス最適化
- トークン検証結果の短期キャッシュ（オプション）
- ユーザー情報の事前読み込み（必要に応じて）
- 非同期処理による並行実行

## 使用例

```typescript
// Express アプリケーションでの使用
import express from 'express';
import { authMiddleware } from './middleware/auth';

const app = express();

// 保護されたルート
app.get('/api/tasks', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  // タスク取得処理
});

// 公開ルート（認証不要）
app.post('/api/auth/login', async (req, res) => {
  // ログイン処理
});
```

## テスト方針
- 正常系：有効なトークンでの認証成功
- 異常系：各エラーケースのテスト
- 境界値：トークン有効期限ギリギリのケース
- セキュリティ：改ざんされたトークンの検出