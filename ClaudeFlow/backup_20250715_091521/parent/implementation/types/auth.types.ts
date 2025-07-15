// 認証関連の型定義
export interface UserRegistrationRequest {
  email: string;
  password: string;
  name: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
  expiresIn: string;
  refreshToken?: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
  name: string;
  iat: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface PasswordStrength {
  score: number;
  level: 'weak' | 'medium' | 'strong';
  feedback: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
  timestamp?: string;
  requestId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string | object;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (req: any) => boolean;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
  algorithm?: string;
}

export interface PasswordConfig {
  saltRounds: number;
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

export interface ValidationConfig {
  email: {
    maxLength: number;
    domainWhitelist?: string[];
    domainBlacklist?: string[];
  };
  name: {
    minLength: number;
    maxLength: number;
    pattern?: RegExp;
  };
}

export interface AuthConfig {
  jwt: JWTConfig;
  rateLimit: RateLimitConfig;
  password: PasswordConfig;
  validation: ValidationConfig;
  session?: {
    duration: number;
    extendOnActivity: boolean;
  };
}

// Prismaモデル型（手動定義版）
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  name: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date | null;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: number;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
  user?: User;
}

export interface RefreshToken {
  id: string;
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  user?: User;
}

// ミドルウェア型
export interface AuthenticatedRequest extends Express.Request {
  user?: TokenPayload;
  session?: Session;
}

// エラー型
export class AuthError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

// ユーティリティ型
export type AsyncHandler<T = any> = (
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) => Promise<T>;

export type MiddlewareFunction = (
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) => void | Promise<void>;

// レスポンスビルダー型
export interface ResponseBuilder {
  success<T>(data: T, message?: string): ApiResponse<T>;
  error(error: string, details?: any, statusCode?: number): ApiResponse;
  validationError(errors: ValidationError[]): ApiResponse;
}