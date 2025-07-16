// types.ts - TypeScript Type Definitions for Login API

// Core domain types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isLocked: boolean;
  lastLoginAt?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

// Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  expiresAt: Date;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
}

// Auth token types
export interface AuthToken {
  value: string;
  expiresAt: Date;
  type: 'Bearer';
}

// Error types
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: ValidationDetail[];
}

export interface ValidationDetail {
  field: string;
  message: string;
  code: string;
}

// Result type for functional error handling
export class Result<T, E> {
  private constructor(
    private readonly value: T | null,
    private readonly error: E | null
  ) {}

  static success<T, E>(value: T): Result<T, E> {
    return new Result<T, E>(value, null);
  }

  static failure<T, E>(error: E): Result<T, E> {
    return new Result<T, E>(null, error);
  }

  get isSuccess(): boolean {
    return this.error === null;
  }

  get isFailure(): boolean {
    return this.error !== null;
  }

  getOrThrow(): T {
    if (this.error !== null) {
      throw new Error('Result is a failure');
    }
    return this.value!;
  }

  getOrDefault(defaultValue: T): T {
    return this.error === null ? this.value! : defaultValue;
  }

  getError(): E | null {
    return this.error;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.error !== null) {
      return Result.failure<U, E>(this.error);
    }
    return Result.success<U, E>(fn(this.value!));
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this.error === null) {
      return Result.success<T, F>(this.value!);
    }
    return Result.failure<T, F>(fn(this.error));
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.error !== null) {
      return Result.failure<U, E>(this.error);
    }
    return fn(this.value!);
  }

  match<U>(patterns: { success: (value: T) => U; failure: (error: E) => U }): U {
    if (this.error === null) {
      return patterns.success(this.value!);
    }
    return patterns.failure(this.error);
  }
}

// Rate limiter types
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  lockedUntil?: Date;
}

// Logger types
export interface Logger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// HTTP types for API integration
export interface ApiRequest<T = any> {
  body: T;
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
}

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers?: Record<string, string>;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: any;
}