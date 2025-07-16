import jwt from 'jsonwebtoken';
import {
  ValidationResult,
  createResult,
  isError,
  ERROR_CODES,
  createError,
  createRegexValidator,
  withCache
} from './utils';
import { UserService, User } from './userService';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface SessionInfo {
  userId: string;
  deviceId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthConfig {
  jwtSecret: string;
  accessTokenExpiry?: string;
  refreshTokenExpiry?: string;
  maxSessions?: number;
  sessionTimeout?: number;
}

// Token validators
const jwtValidator = withCache(
  createRegexValidator(
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    'Invalid token format'
  )
);

export class AuthService {
  private userService: UserService;
  private config: Required<AuthConfig>;
  private sessions: Map<string, SessionInfo> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private tokenBlacklist: Set<string> = new Set();

  constructor(userService: UserService, config: AuthConfig) {
    this.userService = userService;
    this.config = {
      jwtSecret: config.jwtSecret,
      accessTokenExpiry: config.accessTokenExpiry ?? '15m',
      refreshTokenExpiry: config.refreshTokenExpiry ?? '7d',
      maxSessions: config.maxSessions ?? 5,
      sessionTimeout: config.sessionTimeout ?? 30 * 60 * 1000 // 30 minutes
    };

    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 60 * 1000); // Every minute
  }

  async login(
    emailOrUsername: string, 
    password: string,
    deviceId: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<ValidationResult<AuthTokens>> {
    // Authenticate user
    const authResult = await this.userService.authenticate(emailOrUsername, password);
    if (isError(authResult)) return authResult;

    const user = authResult.data;

    // Check session limit
    const existingSessions = this.userSessions.get(user.id) || new Set();
    if (existingSessions.size >= this.config.maxSessions) {
      // Remove oldest session
      const oldestSession = this.getOldestSession(existingSessions);
      if (oldestSession) {
        this.removeSession(oldestSession);
      }
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Create session
    const sessionId = `${user.id}:${deviceId}:${Date.now()}`;
    const now = new Date();
    const session: SessionInfo = {
      userId: user.id,
      deviceId,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress
    };

    // Store session
    this.sessions.set(sessionId, session);
    if (!this.userSessions.has(user.id)) {
      this.userSessions.set(user.id, new Set());
    }
    this.userSessions.get(user.id)!.add(sessionId);

    return createResult(tokens);
  }

  async refresh(refreshToken: string): Promise<ValidationResult<AuthTokens>> {
    // Validate token format
    const formatValidation = jwtValidator(refreshToken);
    if (isError(formatValidation)) return formatValidation;

    // Check blacklist
    if (this.tokenBlacklist.has(refreshToken)) {
      return createError('AUTH_FAILED', 'Token is invalid');
    }

    // Verify token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, this.config.jwtSecret) as TokenPayload;
    } catch (error) {
      return createError('AUTH_FAILED', 'Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      return createError('AUTH_FAILED', 'Invalid token type');
    }

    // Get user
    const userResult = this.userService.getUser(payload.userId);
    if (isError(userResult)) {
      return createError('AUTH_FAILED', 'User not found');
    }

    // Blacklist old refresh token
    this.tokenBlacklist.add(refreshToken);

    // Generate new tokens
    const tokens = this.generateTokens(userResult.data);
    return createResult(tokens);
  }

  async logout(accessToken: string): Promise<ValidationResult<boolean>> {
    // Validate and decode token
    const tokenResult = this.verifyAccessToken(accessToken);
    if (isError(tokenResult)) return tokenResult;

    const payload = tokenResult.data;

    // Blacklist token
    this.tokenBlacklist.add(accessToken);

    // Remove user sessions
    const userSessions = this.userSessions.get(payload.userId);
    if (userSessions) {
      userSessions.forEach(sessionId => {
        this.sessions.delete(sessionId);
      });
      this.userSessions.delete(payload.userId);
    }

    return createResult(true);
  }

  verifyAccessToken(token: string): ValidationResult<TokenPayload> {
    // Validate format
    const formatValidation = jwtValidator(token);
    if (isError(formatValidation)) return formatValidation;

    // Check blacklist
    if (this.tokenBlacklist.has(token)) {
      return createError('AUTH_FAILED', 'Token is invalid');
    }

    // Verify token
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as TokenPayload;
      
      if (payload.type !== 'access') {
        return createError('AUTH_FAILED', 'Invalid token type');
      }

      // Update session activity
      this.updateSessionActivity(payload.userId);

      return createResult(payload);
    } catch (error) {
      return createError('AUTH_FAILED', 'Invalid access token');
    }
  }

  getSessions(userId: string): SessionInfo[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((session): session is SessionInfo => session !== undefined);
  }

  revokeSession(userId: string, deviceId: string): ValidationResult<boolean> {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return createError('NOT_FOUND', 'No sessions found');
    }

    let found = false;
    sessionIds.forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      if (session && session.deviceId === deviceId) {
        this.removeSession(sessionId);
        found = true;
      }
    });

    return found 
      ? createResult(true)
      : createError('NOT_FOUND', 'Session not found');
  }

  // Helper methods
  private generateTokens(user: User): AuthTokens {
    const basePayload = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    const accessToken = jwt.sign(
      { ...basePayload, type: 'access' as const },
      this.config.jwtSecret,
      { expiresIn: this.config.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { ...basePayload, type: 'refresh' as const },
      this.config.jwtSecret,
      { expiresIn: this.config.refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  private removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.delete(sessionId);
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }
  }

  private getOldestSession(sessionIds: Set<string>): string | null {
    let oldest: { id: string; createdAt: Date } | null = null;

    sessionIds.forEach(id => {
      const session = this.sessions.get(id);
      if (session && (!oldest || session.createdAt < oldest.createdAt)) {
        oldest = { id, createdAt: session.createdAt };
      }
    });

    return oldest?.id || null;
  }

  private updateSessionActivity(userId: string): void {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return;

    const now = new Date();
    sessionIds.forEach(id => {
      const session = this.sessions.get(id);
      if (session) {
        session.lastAccessedAt = now;
      }
    });
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();

    // Clean expired sessions
    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.removeSession(sessionId);
      } else if (now.getTime() - session.lastAccessedAt.getTime() > this.config.sessionTimeout) {
        // Remove inactive sessions
        this.removeSession(sessionId);
      }
    }

    // Clean old blacklisted tokens (older than 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const token of this.tokenBlacklist) {
      try {
        const decoded = jwt.decode(token) as TokenPayload;
        if (decoded.iat && decoded.iat * 1000 < weekAgo) {
          this.tokenBlacklist.delete(token);
        }
      } catch {
        // Remove invalid tokens
        this.tokenBlacklist.delete(token);
      }
    }
  }

  // Stats methods
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  getBlacklistedTokenCount(): number {
    return this.tokenBlacklist.size;
  }
}

// Export factory function
export function createAuthService(userService: UserService, config: AuthConfig): AuthService {
  return new AuthService(userService, config);
}