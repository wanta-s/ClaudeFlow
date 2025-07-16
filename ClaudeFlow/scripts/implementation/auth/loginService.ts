// loginService.ts - Optimized Login API Implementation
import { User, LoginRequest, LoginResponse, AuthToken, Result } from './types';
import { validateLoginRequest } from './validators';
import { hashPassword, generateToken } from './utils';
import { RateLimiter } from './rateLimiter';
import { Logger } from './logger';

// Configuration constants
const CONFIG = {
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
} as const;

// Error codes
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'AUTH001',
  ACCOUNT_LOCKED: 'AUTH002',
  RATE_LIMIT_EXCEEDED: 'AUTH003',
  VALIDATION_FAILED: 'AUTH004',
  INTERNAL_ERROR: 'AUTH500',
} as const;

export class LoginService {
  private readonly userRepository: UserRepository;
  private readonly tokenService: TokenService;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: Logger;

  constructor(
    userRepository: UserRepository,
    tokenService: TokenService,
    rateLimiter: RateLimiter,
    logger: Logger
  ) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.rateLimiter = rateLimiter;
    this.logger = logger;
  }

  async login(request: LoginRequest): Promise<Result<LoginResponse, AuthError>> {
    try {
      // 1. Validate request
      const validation = validateLoginRequest(request);
      if (!validation.isValid) {
        return Result.failure({
          code: AUTH_ERRORS.VALIDATION_FAILED,
          message: validation.error!,
          details: validation.details,
        });
      }

      // 2. Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(request.username);
      if (rateLimitCheck.isFailure) {
        return rateLimitCheck;
      }

      // 3. Find user
      const user = await this.userRepository.findByUsername(request.username);
      if (!user) {
        await this.handleFailedAttempt(request.username);
        return Result.failure({
          code: AUTH_ERRORS.INVALID_CREDENTIALS,
          message: 'Invalid username or password',
        });
      }

      // 4. Check account status
      if (user.isLocked) {
        return Result.failure({
          code: AUTH_ERRORS.ACCOUNT_LOCKED,
          message: 'Account is locked. Please contact support.',
        });
      }

      // 5. Verify password
      const isPasswordValid = await this.verifyPassword(
        request.password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        await this.handleFailedAttempt(request.username);
        return Result.failure({
          code: AUTH_ERRORS.INVALID_CREDENTIALS,
          message: 'Invalid username or password',
        });
      }

      // 6. Generate token
      const token = await this.generateAuthToken(user);

      // 7. Update user login info
      await this.updateLoginInfo(user.id);

      // 8. Clear rate limit on successful login
      await this.rateLimiter.reset(request.username);

      return Result.success({
        token: token.value,
        expiresAt: token.expiresAt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      this.logger.error('Login error', { error, username: request.username });
      return Result.failure({
        code: AUTH_ERRORS.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
      });
    }
  }

  private async checkRateLimit(
    username: string
  ): Promise<Result<void, AuthError>> {
    const isAllowed = await this.rateLimiter.checkLimit(username, {
      maxAttempts: CONFIG.MAX_LOGIN_ATTEMPTS,
      windowMs: CONFIG.RATE_LIMIT_WINDOW,
    });

    if (!isAllowed) {
      const remainingTime = await this.rateLimiter.getRemainingTime(username);
      return Result.failure({
        code: AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
        message: 'Too many login attempts. Please try again later.',
        details: { retryAfter: remainingTime },
      });
    }

    return Result.success(undefined);
  }

  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return hashPassword.verify(plainPassword, hashedPassword);
  }

  private async generateAuthToken(user: User): Promise<AuthToken> {
    return this.tokenService.generate({
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresIn: CONFIG.TOKEN_EXPIRY,
    });
  }

  private async handleFailedAttempt(username: string): Promise<void> {
    await this.rateLimiter.increment(username);
    this.logger.warn('Failed login attempt', { username });
  }

  private async updateLoginInfo(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    });
  }
}

// Repository interfaces
interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<void>;
}

interface TokenService {
  generate(payload: TokenPayload): Promise<AuthToken>;
  verify(token: string): Promise<TokenPayload | null>;
}

interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  expiresIn: number;
}