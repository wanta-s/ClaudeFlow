# ユーザー登録API 詳細仕様書

## 概要
ユーザー登録エンドポイントとバリデーションの実装仕様

## 1. インターフェース定義

### 1.1 リクエスト/レスポンス型定義
```typescript
// リクエスト型
interface RegisterRequest {
  email: string;      // RFC 5322準拠、必須、最大255文字
  password: string;   // 8文字以上、半角英数字記号、必須
  name: string;       // 1-50文字、必須
}

// レスポンス型
interface RegisterResponse {
  user: {
    id: string;           // cuid形式
    email: string;
    name: string;
    role: "user";
    emailVerified: false;
    createdAt: string;    // ISO 8601形式
    updatedAt: string;    // ISO 8601形式
  };
  session: {
    sessionToken: string;
    expires: string;      // ISO 8601形式
  };
}

// エラーレスポンス型
interface ErrorResponse {
  error: {
    code: string;         // E001, E005, E006
    message: string;      // ユーザー向けメッセージ
    field?: string;       // エラーが発生したフィールド名
    timestamp: string;    // ISO 8601形式
    requestId: string;    // トレース用ID
  };
}
```

### 1.2 バリデーション結果型
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}
```

## 2. サービスインターフェース

### 2.1 AuthService
```typescript
interface IAuthService {
  register(data: RegisterRequest): Promise<RegisterResponse>;
  validateRegistrationData(data: RegisterRequest): ValidationResult;
}
```

### 2.2 UserRepository
```typescript
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(userData: CreateUserData): Promise<User>;
  exists(email: string): Promise<boolean>;
}

interface CreateUserData {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "user";
  emailVerified: false;
}
```

### 2.3 PasswordService
```typescript
interface IPasswordService {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, hash: string): Promise<boolean>;
  validateStrength(password: string): ValidationResult;
}
```

## 3. 主要メソッドのシグネチャ

### 3.1 コントローラー層
```typescript
class AuthController {
  constructor(
    private readonly authService: IAuthService,
    private readonly logger: ILogger
  ) {}

  async register(
    req: Request<{}, {}, RegisterRequest>,
    res: Response<RegisterResponse | ErrorResponse>
  ): Promise<void> {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    // エラーハンドリングロジック
  }
}
```

### 3.2 サービス層
```typescript
class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly sessionService: ISessionService,
    private readonly idGenerator: IIdGenerator
  ) {}

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    // 1. バリデーション
    const validation = this.validateRegistrationData(data);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // 2. メールアドレス重複チェック
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new EmailAlreadyExistsError(data.email);
    }

    // 3. パスワードハッシュ化
    const passwordHash = await this.passwordService.hash(data.password);

    // 4. ユーザー作成
    const userId = this.idGenerator.generateUserId();
    const user = await this.userRepository.create({
      id: userId,
      email: data.email,
      passwordHash,
      name: data.name,
      role: "user",
      emailVerified: false
    });

    // 5. セッション作成
    const session = await this.sessionService.create(userId);

    return {
      user: this.formatUserResponse(user),
      session: {
        sessionToken: session.token,
        expires: session.expires.toISOString()
      }
    };
  }

  validateRegistrationData(data: RegisterRequest): ValidationResult {
    const errors: ValidationError[] = [];

    // メールアドレス検証
    if (!this.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: '有効なメールアドレスを入力してください',
        code: 'INVALID_EMAIL'
      });
    }

    // パスワード検証
    const passwordValidation = this.passwordService.validateStrength(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    // 名前検証
    if (!data.name || data.name.length === 0) {
      errors.push({
        field: 'name',
        message: '名前を入力してください',
        code: 'REQUIRED_FIELD'
      });
    } else if (data.name.length > 50) {
      errors.push({
        field: 'name',
        message: '名前は50文字以内で入力してください',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    // RFC 5322準拠のメールアドレス検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  private formatUserResponse(user: User): RegisterResponse['user'] {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "user",
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }
}
```

## 4. エラーケース

### 4.1 エラーコード定義
```typescript
enum ErrorCode {
  VALIDATION_ERROR = 'E001',
  EMAIL_ALREADY_EXISTS = 'E005',
  SERVER_ERROR = 'E006'
}

const ERROR_MESSAGES = {
  [ErrorCode.VALIDATION_ERROR]: 'バリデーションエラー',
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 'このメールアドレスは既に登録されています',
  [ErrorCode.SERVER_ERROR]: 'サーバーエラーが発生しました'
} as const;
```

### 4.2 カスタムエラークラス
```typescript
class ValidationError extends Error {
  readonly code = ErrorCode.VALIDATION_ERROR;
  readonly statusCode = 400;

  constructor(public readonly errors: ValidationError[]) {
    super(ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR]);
  }
}

class EmailAlreadyExistsError extends Error {
  readonly code = ErrorCode.EMAIL_ALREADY_EXISTS;
  readonly statusCode = 409;
  readonly field = 'email';

  constructor(email: string) {
    super(ERROR_MESSAGES[ErrorCode.EMAIL_ALREADY_EXISTS]);
  }
}

class ServerError extends Error {
  readonly code = ErrorCode.SERVER_ERROR;
  readonly statusCode = 500;

  constructor(originalError?: Error) {
    super(ERROR_MESSAGES[ErrorCode.SERVER_ERROR]);
  }
}
```

## 5. 依存関係

### 5.1 外部ライブラリ
- **bcrypt**: パスワードハッシュ化（v5.1.0+）
- **cuid**: ユニークID生成（v2.1.0+）
- **zod**: スキーマバリデーション（v3.22.0+）

### 5.2 内部モジュール依存関係
```typescript
// 依存関係グラフ
AuthController
  └── IAuthService
      ├── IUserRepository
      ├── IPasswordService
      ├── ISessionService
      └── IIdGenerator

// 環境変数依存
interface ProcessEnv {
  BCRYPT_ROUNDS?: string;      // デフォルト: "10"
  SESSION_EXPIRES_IN?: string; // デフォルト: "86400" (24時間)
}
```

### 5.3 データベーススキーマ
```typescript
// Prismaスキーマ（抜粋）
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  name          String
  role          String   @default("user")
  emailVerified Boolean  @default(false) @map("email_verified")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  sessions      Session[]

  @@index([email])
  @@map("users")
}
```

## 6. セキュリティ考慮事項

### 6.1 パスワード処理
- bcryptのsaltRounds: 10（環境変数で設定可能）
- パスワードの最小長: 8文字
- 許可文字: 半角英数字記号（ASCII印字可能文字）

### 6.2 レート制限
- 5リクエスト/分/IPアドレス
- 実装: Express Rate Limitミドルウェア

### 6.3 入力サニタイズ
- Prismaによる自動エスケープ
- XSS対策はフロントエンド側で実施

## 7. パフォーマンス考慮事項

### 7.1 最適化ポイント
- メールアドレスの重複チェックはインデックスを使用
- パスワードハッシュ化は非同期処理
- データベース接続はプーリングを使用

### 7.2 キャッシュ戦略
- 新規登録のためキャッシュは使用しない
- セッショントークンのみRedisに保存（オプション）

## 8. テスト観点

### 8.1 単体テスト
- 各バリデーションルールの境界値テスト
- エラーケースの網羅的テスト
- モックを使用した依存関係のテスト

### 8.2 統合テスト
- エンドツーエンドの登録フロー
- データベースとの連携テスト
- 同時登録時の重複チェック

### 8.3 セキュリティテスト
- SQLインジェクション対策の確認
- パスワードハッシュの安全性確認
- レート制限の動作確認