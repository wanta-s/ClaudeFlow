import { PasswordService } from './passwordService';

// Types from reusable patterns
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ success: true, value });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });

// Constants
const ERRORS = {
  AUTH: { code: 'AUTH_001', message: 'Invalid credentials' },
  SERVER: { code: 'SRV_001', message: 'Server error' },
  VALIDATION: { code: 'VAL_001', message: 'Validation failed' },
  RATE_LIMIT: { code: 'RATE_001', message: (minutes: number) => `Rate limit exceeded. Try again in ${minutes} minutes` }
} as const;

const LIMITS = {
  EMAIL_MAX: 255,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  MAX_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15
} as const;

// Simplified types
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

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
}

// Dependencies interfaces
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
}

export interface ITokenService {
  generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }>;
}

export interface IRateLimiter {
  checkLimit(identifier: string): Promise<{ allowed: boolean; remainingAttempts?: number }>;
  recordAttempt(identifier: string, success: boolean): Promise<void>;
}

// Validation from patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validate = {
  email: (email: string): string[] => {
    const errors: string[] = [];
    if (!email) errors.push('Email is required');
    else if (!EMAIL_REGEX.test(email)) errors.push('Invalid email format');
    else if (email.length > LIMITS.EMAIL_MAX) errors.push(`Email must be <= ${LIMITS.EMAIL_MAX} characters`);
    return errors;
  },
  password: (password: string): string[] => {
    const errors: string[] = [];
    if (!password) errors.push('Password is required');
    else if (password.length < LIMITS.PASSWORD_MIN) errors.push(`Password must be >= ${LIMITS.PASSWORD_MIN} characters`);
    else if (password.length > LIMITS.PASSWORD_MAX) errors.push(`Password must be <= ${LIMITS.PASSWORD_MAX} characters`);
    return errors;
  }
};

// Simplified service
export class LoginService {
  constructor(
    private userRepository: IUserRepository,
    private passwordService: PasswordService,
    private tokenService: ITokenService,
    private rateLimiter?: IRateLimiter
  ) {}

  async login(request: LoginRequest): Promise<Result<LoginResponse>> {
    // Rate limiting
    if (this.rateLimiter) {
      const rateCheck = await this.rateLimiter.checkLimit(request.email);
      if (!rateCheck.allowed) {
        return err(new Error(ERRORS.RATE_LIMIT.message(LIMITS.LOCKOUT_MINUTES)));
      }
    }

    // Validation
    const errors = [...validate.email(request.email), ...validate.password(request.password)];
    if (errors.length > 0) {
      return err(new Error(errors.join(', ')));
    }

    try {
      // User lookup
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        await this.recordFailure(request.email);
        return err(new Error(ERRORS.AUTH.message));
      }

      // Password verification
      const verifyResult = await this.passwordService.verify(request.password, user.passwordHash);
      if (!verifyResult.success || !verifyResult.value) {
        await this.recordFailure(request.email);
        return err(new Error(ERRORS.AUTH.message));
      }

      // Generate tokens
      const tokens = await this.tokenService.generateTokenPair(user);
      await this.recordSuccess(request.email);

      return ok({
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString()
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return err(new Error(ERRORS.SERVER.message));
    }
  }

  private async recordFailure(email: string): Promise<void> {
    await this.rateLimiter?.recordAttempt(email, false);
  }

  private async recordSuccess(email: string): Promise<void> {
    await this.rateLimiter?.recordAttempt(email, true);
  }
}