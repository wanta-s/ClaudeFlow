/**
 * JWT Token service
 */
import jwt from 'jsonwebtoken';
import { ITokenService, User } from '../loginService';
import { IJwtConfig } from '../config/interfaces';
import { AuthenticationError, AppError } from '../errors/AppError';
import { Logger } from '../utils/logger';

/**
 * Token payload interface
 */
export interface TokenPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Token service for JWT operations
 */
export class TokenService implements ITokenService {
  private readonly config: IJwtConfig;
  private readonly logger: Logger;

  /**
   * Create a token service instance
   * @param {IJwtConfig} config - JWT configuration
   * @param {Logger} logger - Logger instance
   */
  constructor(config: IJwtConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Generate access and refresh tokens
   * @param {User} user - User object
   * @returns {Promise<{accessToken: string; refreshToken: string}>} Token pair
   * @throws {AppError} Token generation error
   */
  async generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload: TokenPayload = {
        sub: user.id,
        email: user.email
      };

      const commonOptions: jwt.SignOptions = {
        issuer: this.config.issuer,
        audience: this.config.audience
      };

      const accessToken = jwt.sign(payload, this.config.secret, {
        ...commonOptions,
        expiresIn: this.config.expiresIn
      });

      const refreshToken = jwt.sign(payload, this.config.secret, {
        ...commonOptions,
        expiresIn: '7d' // Refresh tokens last longer
      });

      this.logger.debug('Generated token pair', { userId: user.id });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Failed to generate tokens', { userId: user.id, error });
      throw new AppError('Failed to generate authentication tokens', 500, 'TOKEN_GENERATION_ERROR');
    }
  }

  /**
   * Verify a token
   * @param {string} token - JWT token
   * @returns {Promise<TokenPayload>} Token payload
   * @throws {AuthenticationError} Invalid or expired token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const options: jwt.VerifyOptions = {
        issuer: this.config.issuer,
        audience: this.config.audience
      };

      const payload = jwt.verify(token, this.config.secret, options) as TokenPayload;
      return payload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        this.logger.debug('Token expired', { error });
        throw new AuthenticationError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        this.logger.warn('Invalid token', { error });
        throw new AuthenticationError('Invalid token');
      }
      this.logger.error('Token verification failed', { error });
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Decode a token without verification
   * @param {string} token - JWT token
   * @returns {TokenPayload | null} Token payload or null
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      this.logger.debug('Failed to decode token', { error });
      return null;
    }
  }

  /**
   * Generate a single token
   * @param {TokenPayload} payload - Token payload
   * @param {string} expiresIn - Token expiration time
   * @returns {string} JWT token
   */
  generateToken(payload: TokenPayload, expiresIn: string = this.config.expiresIn): string {
    const options: jwt.SignOptions = {
      expiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience
    };

    return jwt.sign(payload, this.config.secret, options);
  }
}