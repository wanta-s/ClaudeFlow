import { PasswordService } from './passwordService';

// Constants
const ERROR_CODES = {
  AUTH: 'AUTH_001',
  SERVER: 'SRV_001',
  VALIDATION: 'VAL_001',
  RATE_LIMIT: 'RATE_001'
} as const;

const LIMITS = {
  EMAIL_MAX: 255,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  MAX_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15
} as const;

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
}

export interface ITokenService {
  generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string; }>;
}

export interface IRateLimiter {
  checkLimit(identifier: string): Promise<{ allowed: boolean; remainingAttempts?: number }>;
  recordAttempt(identifier: string, success: boolean): Promise<void>;
}

// Result type pattern
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

type LoginResult = Result<{
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  }
}, {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
  remainingAttempts?: number;
}>;

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validators = {
  email: (email: string) => ({
    required: !!email,
    format: EMAIL_REGEX.test(email),
    maxLength: email.length <= LIMITS.EMAIL_MAX
  }),
  password: (password: string) => ({
    required: !!password,
    minLength: password.length >= LIMITS.PASSWORD_MIN,
    maxLength: password.length <= LIMITS.PASSWORD_MAX
  })
};

// Login Service
export class LoginService {
  constructor(
    private userRepository: IUserRepository,
    private passwordService: PasswordService,
    private tokenService: ITokenService,
    private rateLimiter?: IRateLimiter
  ) {}

  async login(request: LoginRequest): Promise<LoginResult> {
    // Rate limiting check
    if (this.rateLimiter) {
      const rateCheck = await this.rateLimiter.checkLimit(request.email);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.RATE_LIMIT,
            message: `ログイン試行回数の上限に達しました。${LIMITS.LOCKOUT_MINUTES}分後に再度お試しください`,
            remainingAttempts: 0
          }
        };
      }
    }

    // Validation
    const validation = this.validateRequest(request);
    if (!validation.success) return validation;

    try {
      // User lookup
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        await this.recordFailedAttempt(request.email);
        return this.authError();
      }

      // Password verification
      const isValid = await this.passwordService.verify(request.password, user.passwordHash);
      if (!isValid) {
        await this.recordFailedAttempt(request.email);
        return this.authError();
      }

      // Generate tokens
      const tokens = await this.tokenService.generateTokenPair(user);
      await this.recordSuccessfulAttempt(request.email);

      return {
        success: true,
        data: {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString()
          }
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: {
          code: ERROR_CODES.SERVER,
          message: 'サーバーエラーが発生しました'
        }
      };
    }
  }

  private validateRequest(request: LoginRequest): LoginResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Email validation
    const emailChecks = validators.email(request.email);
    if (!emailChecks.required) {
      errors.push({ field: 'email', message: 'メールアドレスは必須です' });
    } else if (!emailChecks.format) {
      errors.push({ field: 'email', message: '有効なメールアドレスを入力してください' });
    } else if (!emailChecks.maxLength) {
      errors.push({ field: 'email', message: `メールアドレスは${LIMITS.EMAIL_MAX}文字以内で入力してください` });
    }

    // Password validation
    const passwordChecks = validators.password(request.password);
    if (!passwordChecks.required) {
      errors.push({ field: 'password', message: 'パスワードは必須です' });
    } else if (!passwordChecks.minLength) {
      errors.push({ field: 'password', message: `パスワードは${LIMITS.PASSWORD_MIN}文字以上必要です` });
    } else if (!passwordChecks.maxLength) {
      errors.push({ field: 'password', message: `パスワードは${LIMITS.PASSWORD_MAX}文字以内で入力してください` });
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION,
          message: '入力値が不正です',
          details: errors
        }
      };
    }

    return { success: true, data: {} as any };
  }

  private authError(): LoginResult {
    return {
      success: false,
      error: {
        code: ERROR_CODES.AUTH,
        message: 'メールアドレスまたはパスワードが正しくありません'
      }
    };
  }

  private async recordFailedAttempt(email: string): Promise<void> {
    if (this.rateLimiter) {
      await this.rateLimiter.recordAttempt(email, false);
    }
  }

  private async recordSuccessfulAttempt(email: string): Promise<void> {
    if (this.rateLimiter) {
      await this.rateLimiter.recordAttempt(email, true);
    }
  }
}