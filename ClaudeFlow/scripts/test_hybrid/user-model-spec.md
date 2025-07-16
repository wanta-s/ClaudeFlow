# ユーザーモデル定義仕様

## 概要
TypeScriptの型定義を使用したユーザーモデルのインターフェースとスキーマ定義。

## インターフェース定義

### 1. 基本ユーザーインターフェース
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  refreshToken?: string;
}
```

### 2. ユーザー作成DTOインターフェース
```typescript
interface CreateUserDto {
  email: string;
  username: string;
  password: string;
}
```

### 3. ユーザー認証DTOインターフェース
```typescript
interface AuthUserDto {
  email: string;
  password: string;
}
```

### 4. ユーザーレスポンスインターフェース
```typescript
interface UserResponse {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  isActive: boolean;
}
```

### 5. 認証トークンインターフェース
```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

## バリデーションスキーマ

### 1. ユーザー作成バリデーション
```typescript
interface UserValidationRules {
  email: {
    required: boolean;
    pattern: RegExp;
    maxLength: number;
  };
  username: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  password: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
}

const userValidationRules: UserValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  }
};
```

## 主要メソッドのシグネチャ

### 1. ユーザーサービスインターフェース
```typescript
interface IUserService {
  createUser(dto: CreateUserDto): Promise<UserResponse>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  validatePassword(user: User, password: string): Promise<boolean>;
  updateRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
  deactivateUser(userId: string): Promise<void>;
}
```

### 2. 認証サービスインターフェース
```typescript
interface IAuthService {
  register(dto: CreateUserDto): Promise<{ user: UserResponse; tokens: AuthTokens }>;
  login(dto: AuthUserDto): Promise<{ user: UserResponse; tokens: AuthTokens }>;
  logout(userId: string): Promise<void>;
  refreshTokens(refreshToken: string): Promise<AuthTokens>;
  validateAccessToken(token: string): Promise<JwtPayload>;
}
```

### 3. JWTペイロードインターフェース
```typescript
interface JwtPayload {
  sub: string;  // user id
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}
```

## エラーケース

### 1. カスタムエラークラス
```typescript
class UserError extends Error {
  constructor(
    public code: UserErrorCode,
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'UserError';
  }
}

enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_USERNAME_FORMAT = 'INVALID_USERNAME_FORMAT',
  INVALID_PASSWORD_FORMAT = 'INVALID_PASSWORD_FORMAT',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN'
}
```

### 2. エラーレスポンスインターフェース
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  timestamp: string;
  path: string;
}
```

## 依存関係

### 1. 外部ライブラリ
```typescript
// package.json dependencies
{
  "dependencies": {
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/uuid": "^9.0.0"
  }
}
```

### 2. 内部モジュール依存関係
```typescript
// ユーザーモデルの依存関係
import { IPasswordService } from './services/password.service';
import { ITokenService } from './services/token.service';
import { IValidationService } from './services/validation.service';
import { IUserRepository } from './repositories/user.repository';
```

### 3. 設定インターフェース
```typescript
interface UserModuleConfig {
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  bcrypt: {
    saltRounds: number;
  };
  validation: {
    passwordMinLength: number;
    passwordMaxLength: number;
    usernameMinLength: number;
    usernameMaxLength: number;
  };
}
```

## ユーティリティ型定義

### 1. 部分更新型
```typescript
type UpdateUserDto = Partial<Pick<User, 'username' | 'email'>>;
```

### 2. ユーザー検索フィルター
```typescript
interface UserSearchFilter {
  email?: string;
  username?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}
```

### 3. ページネーション型
```typescript
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
```

## データ変換関数シグネチャ

```typescript
// ユーザーエンティティからレスポンスへの変換
function toUserResponse(user: User): UserResponse;

// DTOからエンティティへの変換
function toUserEntity(dto: CreateUserDto, passwordHash: string): Omit<User, 'id'>;

// JWTペイロードの生成
function toJwtPayload(user: User): JwtPayload;
```

## 型ガード

```typescript
// User型ガード
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'username' in value &&
    'passwordHash' in value
  );
}

// CreateUserDto型ガード
function isCreateUserDto(value: unknown): value is CreateUserDto {
  return (
    typeof value === 'object' &&
    value !== null &&
    'email' in value &&
    'username' in value &&
    'password' in value
  );
}
```