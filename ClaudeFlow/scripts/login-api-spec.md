# ログインAPI詳細仕様書

## 概要
ユーザー認証を行い、アクセストークンを発行するエンドポイント

## エンドポイント
```
POST /api/auth/login
```

## リクエスト

### ヘッダー
```
Content-Type: application/json
```

### ボディ
```typescript
interface LoginRequest {
  email: string;      // ユーザーのメールアドレス
  password: string;   // パスワード（平文）
}
```

### 検証ルール
- `email`: 
  - 必須
  - 有効なメールアドレス形式
  - 最大255文字
- `password`:
  - 必須
  - 最小8文字
  - 最大128文字

## レスポンス

### 成功時 (200 OK)
```typescript
interface LoginResponse {
  success: true;
  data: {
    token: string;        // JWTアクセストークン
    refreshToken: string; // リフレッシュトークン
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: string;  // ISO 8601形式
    }
  }
}
```

### 認証失敗時 (401 Unauthorized)
```typescript
interface AuthenticationError {
  success: false;
  error: {
    code: "AUTH_001";
    message: "メールアドレスまたはパスワードが正しくありません";
  }
}
```

### バリデーションエラー (400 Bad Request)
```typescript
interface ValidationError {
  success: false;
  error: {
    code: "VAL_001";
    message: "入力値が不正です";
    details: Array<{
      field: string;
      message: string;
    }>;
  }
}
```

### サーバーエラー (500 Internal Server Error)
```typescript
interface ServerError {
  success: false;
  error: {
    code: "SRV_001";
    message: "サーバーエラーが発生しました";
  }
}
```

## 処理フロー

1. **リクエスト検証**
   - 必須フィールドの存在確認
   - メールアドレス形式の検証
   - パスワード長の検証

2. **ユーザー検索**
   - メールアドレスでユーザーを検索
   - ユーザーが存在しない場合は認証失敗

3. **パスワード検証**
   - bcryptを使用してハッシュ化されたパスワードと照合
   - 照合失敗時は認証失敗

4. **トークン生成**
   - JWT形式のアクセストークン（有効期限: 1時間）
   - リフレッシュトークン（有効期限: 30日）

5. **レスポンス返却**
   - トークンとユーザー情報を返却

## セキュリティ考慮事項

1. **レート制限**
   - 同一IPから5分間に5回まで
   - 制限超過時は429 Too Many Requestsを返却

2. **ブルートフォース対策**
   - 連続した認証失敗でアカウント一時ロック（5回失敗で15分）

3. **タイミング攻撃対策**
   - ユーザー存在確認とパスワード検証で同一の処理時間を確保

4. **トークン管理**
   - トークンはHTTPOnlyクッキーで管理を推奨
   - リフレッシュトークンは別途セキュアに保管

## 実装例（TypeScript）

```typescript
// インターフェース定義
export interface IAuthService {
  login(email: string, password: string): Promise<LoginResponse>;
  validateLoginRequest(request: LoginRequest): ValidationResult;
}

// 依存関係
export interface AuthServiceDependencies {
  userRepository: IUserRepository;
  passwordService: IPasswordService;
  tokenService: ITokenService;
  rateLimiter: IRateLimiter;
}

// エラーケース
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH_001',
  ACCOUNT_LOCKED = 'AUTH_002',
  RATE_LIMIT_EXCEEDED = 'AUTH_003',
}

// 再利用パターン適用
export class AuthService implements IAuthService {
  constructor(private deps: AuthServiceDependencies) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    // 早期エラー検出パターン
    const validation = this.validateLoginRequest({ email, password });
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // レート制限チェック
    if (!await this.deps.rateLimiter.checkLimit(email)) {
      throw new AuthError(AuthErrorCode.RATE_LIMIT_EXCEEDED);
    }

    // ユーザー取得とパスワード検証
    const user = await this.deps.userRepository.findByEmail(email);
    if (!user || !await this.deps.passwordService.verify(password, user.passwordHash)) {
      // タイミング攻撃対策
      await this.simulatePasswordVerification();
      throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS);
    }

    // トークン生成
    const tokens = await this.deps.tokenService.generateTokenPair(user);
    
    return {
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.sanitizeUser(user),
      }
    };
  }

  // 累積エラー収集パターン
  validateLoginRequest(request: LoginRequest): ValidationResult {
    const errors: string[] = [];
    
    if (!request.email || !this.isValidEmail(request.email)) {
      errors.push('有効なメールアドレスを入力してください');
    }
    
    if (!request.password || request.password.length < 8) {
      errors.push('パスワードは8文字以上必要です');
    }
    
    return { 
      isValid: errors.length === 0, 
      errors 
    };
  }
}
```

## 関連仕様
- [パスワードハッシュ処理仕様](./passwordService.ts)
- [ユーザー登録API仕様](./user-registration-api-spec.md)
- [トークン管理仕様]（未実装）
- [レート制限仕様]（未実装）