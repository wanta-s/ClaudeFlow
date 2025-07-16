import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * Authentication error types
 */
export enum AuthErrorType {
  NO_TOKEN = 'NO_TOKEN',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Authentication error interface
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  statusCode: number;
}

/**
 * User payload interface extracted from JWT
 */
export interface UserPayload {
  id: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

/**
 * Logger interface for middleware
 */
export interface Logger {
  debug: (message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
}

/**
 * Token cache interface
 */
export interface TokenCache {
  get: (token: string) => Promise<UserPayload | null>;
  set: (token: string, payload: UserPayload, ttl?: number) => Promise<void>;
  invalidate: (token: string) => Promise<void>;
}

/**
 * Token revocation checker interface
 */
export interface TokenRevocationChecker {
  isRevoked: (tokenId: string) => Promise<boolean>;
}

/**
 * Metrics collector interface
 */
export interface MetricsCollector {
  recordAuthAttempt: (success: boolean, errorType?: AuthErrorType) => void;
  recordLatency: (duration: number) => void;
}

/**
 * Authentication middleware configuration options
 */
export interface AuthMiddlewareOptions {
  /**
   * JWT secret key. If not provided, will use JWT_SECRET env variable
   */
  secret?: string;
  
  /**
   * JWT verification algorithms. Default: ['HS256']
   */
  algorithms?: jwt.Algorithm[];
  
  /**
   * Custom token extractor function
   */
  tokenExtractor?: (req: Request) => string | null;
  
  /**
   * Custom error response formatter
   */
  errorFormatter?: (error: AuthError) => any;
  
  /**
   * Callback executed after successful authentication
   */
  onAuthenticated?: (user: UserPayload, req: Request) => void | Promise<void>;
  
  /**
   * Custom user validator for additional checks
   */
  userValidator?: (user: UserPayload) => boolean | Promise<boolean>;
  
  /**
   * Required roles for access (any of these)
   */
  requiredRoles?: string[];
  
  /**
   * Required permissions for access (all of these)
   */
  requiredPermissions?: string[];
  
  /**
   * Logger instance
   */
  logger?: Logger;
  
  /**
   * Token cache for performance optimization
   */
  tokenCache?: TokenCache;
  
  /**
   * Token revocation checker
   */
  revocationChecker?: TokenRevocationChecker;
  
  /**
   * Metrics collector
   */
  metricsCollector?: MetricsCollector;
  
  /**
   * Maximum token length allowed (default: 1000)
   */
  maxTokenLength?: number;
  
  /**
   * Clock tolerance for token expiration in seconds (default: 0)
   */
  clockTolerance?: number;
}

/**
 * Default error messages
 */
const DEFAULT_ERROR_MESSAGES: Record<AuthErrorType, { message: string; statusCode: number }> = {
  [AuthErrorType.NO_TOKEN]: { message: 'Authentication token is required', statusCode: 401 },
  [AuthErrorType.INVALID_FORMAT]: { message: 'Invalid token format', statusCode: 401 },
  [AuthErrorType.INVALID_TOKEN]: { message: 'Invalid authentication token', statusCode: 401 },
  [AuthErrorType.TOKEN_EXPIRED]: { message: 'Authentication token has expired', statusCode: 401 },
  [AuthErrorType.INSUFFICIENT_PERMISSIONS]: { message: 'Insufficient permissions', statusCode: 403 },
  [AuthErrorType.TOKEN_REVOKED]: { message: 'Token has been revoked', statusCode: 401 },
  [AuthErrorType.UNKNOWN_ERROR]: { message: 'Authentication error', statusCode: 500 }
};

/**
 * Default console logger
 */
const defaultLogger: Logger = {
  debug: (message: string, meta?: any) => console.debug(message, meta),
  info: (message: string, meta?: any) => console.info(message, meta),
  warn: (message: string, meta?: any) => console.warn(message, meta),
  error: (message: string, meta?: any) => console.error(message, meta)
};

/**
 * Default token extractor - extracts Bearer token from Authorization header
 */
function defaultTokenExtractor(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Default error formatter
 */
function defaultErrorFormatter(error: AuthError): any {
  return {
    error: {
      type: error.type,
      message: error.message
    }
  };
}

/**
 * Validate JWT secret
 */
function validateSecret(secret?: string): string {
  const jwtSecret = secret || process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required when secret option is not provided');
  }
  return jwtSecret;
}

/**
 * Check if user has required roles
 */
function hasRequiredRoles(userRoles: string[] | undefined, requiredRoles: string[]): boolean {
  if (!requiredRoles.length) return true;
  if (!userRoles || !userRoles.length) return false;
  return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * Check if user has required permissions
 */
function hasRequiredPermissions(userPermissions: string[] | undefined, requiredPermissions: string[]): boolean {
  if (!requiredPermissions.length) return true;
  if (!userPermissions || !userPermissions.length) return false;
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

/**
 * Create authentication middleware with custom options
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  // Validate JWT secret on middleware creation
  const jwtSecret = validateSecret(options.secret);
  
  // Set default options
  const config = {
    algorithms: options.algorithms || ['HS256'] as jwt.Algorithm[],
    tokenExtractor: options.tokenExtractor || defaultTokenExtractor,
    errorFormatter: options.errorFormatter || defaultErrorFormatter,
    logger: options.logger || defaultLogger,
    maxTokenLength: options.maxTokenLength || 1000,
    clockTolerance: options.clockTolerance || 0,
    requiredRoles: options.requiredRoles || [],
    requiredPermissions: options.requiredPermissions || [],
    ...options
  };

  return async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Log authentication attempt
      config.logger.debug('Authentication attempt', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      // Extract token
      const token = config.tokenExtractor(req);
      if (!token) {
        const error: AuthError = {
          type: AuthErrorType.NO_TOKEN,
          ...DEFAULT_ERROR_MESSAGES[AuthErrorType.NO_TOKEN]
        };
        
        config.logger.warn('No authentication token provided', { path: req.path });
        config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.NO_TOKEN);
        
        res.status(error.statusCode).json(config.errorFormatter(error));
        return;
      }

      // Validate token length
      if (token.length > config.maxTokenLength) {
        const error: AuthError = {
          type: AuthErrorType.INVALID_FORMAT,
          ...DEFAULT_ERROR_MESSAGES[AuthErrorType.INVALID_FORMAT]
        };
        
        config.logger.warn('Token exceeds maximum length', { tokenLength: token.length });
        config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.INVALID_FORMAT);
        
        res.status(error.statusCode).json(config.errorFormatter(error));
        return;
      }

      let payload: UserPayload;

      // Check cache if available
      if (config.tokenCache) {
        const cachedPayload = await config.tokenCache.get(token);
        if (cachedPayload) {
          payload = cachedPayload;
          config.logger.debug('Token found in cache');
        } else {
          // Verify token
          try {
            const decoded = jwt.verify(token, jwtSecret, {
              algorithms: config.algorithms,
              clockTolerance: config.clockTolerance
            }) as UserPayload;
            payload = decoded;
            
            // Cache the verified token
            const expiresIn = (decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600);
            await config.tokenCache.set(token, payload, expiresIn);
          } catch (jwtError) {
            throw jwtError;
          }
        }
      } else {
        // Verify token without cache
        payload = jwt.verify(token, jwtSecret, {
          algorithms: config.algorithms,
          clockTolerance: config.clockTolerance
        }) as UserPayload;
      }

      // Check if token is revoked
      if (config.revocationChecker && payload.jti) {
        const isRevoked = await config.revocationChecker.isRevoked(payload.jti);
        if (isRevoked) {
          const error: AuthError = {
            type: AuthErrorType.TOKEN_REVOKED,
            ...DEFAULT_ERROR_MESSAGES[AuthErrorType.TOKEN_REVOKED]
          };
          
          config.logger.warn('Revoked token used', { tokenId: payload.jti });
          config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.TOKEN_REVOKED);
          
          // Invalidate cache
          if (config.tokenCache) {
            await config.tokenCache.invalidate(token);
          }
          
          res.status(error.statusCode).json(config.errorFormatter(error));
          return;
        }
      }

      // Custom user validation
      if (config.userValidator) {
        const isValid = await config.userValidator(payload);
        if (!isValid) {
          const error: AuthError = {
            type: AuthErrorType.INVALID_TOKEN,
            ...DEFAULT_ERROR_MESSAGES[AuthErrorType.INVALID_TOKEN]
          };
          
          config.logger.warn('User validation failed', { userId: payload.id });
          config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.INVALID_TOKEN);
          
          res.status(error.statusCode).json(config.errorFormatter(error));
          return;
        }
      }

      // Check required roles
      if (!hasRequiredRoles(payload.roles, config.requiredRoles)) {
        const error: AuthError = {
          type: AuthErrorType.INSUFFICIENT_PERMISSIONS,
          ...DEFAULT_ERROR_MESSAGES[AuthErrorType.INSUFFICIENT_PERMISSIONS]
        };
        
        config.logger.warn('Insufficient roles', {
          userId: payload.id,
          userRoles: payload.roles,
          requiredRoles: config.requiredRoles
        });
        config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.INSUFFICIENT_PERMISSIONS);
        
        res.status(error.statusCode).json(config.errorFormatter(error));
        return;
      }

      // Check required permissions
      if (!hasRequiredPermissions(payload.permissions, config.requiredPermissions)) {
        const error: AuthError = {
          type: AuthErrorType.INSUFFICIENT_PERMISSIONS,
          ...DEFAULT_ERROR_MESSAGES[AuthErrorType.INSUFFICIENT_PERMISSIONS]
        };
        
        config.logger.warn('Insufficient permissions', {
          userId: payload.id,
          userPermissions: payload.permissions,
          requiredPermissions: config.requiredPermissions
        });
        config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.INSUFFICIENT_PERMISSIONS);
        
        res.status(error.statusCode).json(config.errorFormatter(error));
        return;
      }

      // Attach user to request
      (req as any).user = payload;

      // Execute callback if provided
      if (config.onAuthenticated) {
        await config.onAuthenticated(payload, req);
      }

      // Record successful authentication
      config.logger.info('Authentication successful', { userId: payload.id });
      config.metricsCollector?.recordAuthAttempt(true);
      
      // Record latency
      const duration = Date.now() - startTime;
      config.metricsCollector?.recordLatency(duration);

      next();
    } catch (error: unknown) {
      let authError: AuthError;

      if (error instanceof jwt.TokenExpiredError) {
        authError = {
          type: AuthErrorType.TOKEN_EXPIRED,
          ...DEFAULT_ERROR_MESSAGES[AuthErrorType.TOKEN_EXPIRED]
        };
        config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.TOKEN_EXPIRED);
      } else if (error instanceof jwt.JsonWebTokenError) {
        authError = {
          type: AuthErrorType.INVALID_TOKEN,
          ...DEFAULT_ERROR_MESSAGES[AuthErrorType.INVALID_TOKEN]
        };
        config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.INVALID_TOKEN);
      } else {
        authError = {
          type: AuthErrorType.UNKNOWN_ERROR,
          ...DEFAULT_ERROR_MESSAGES[AuthErrorType.UNKNOWN_ERROR]
        };
        config.metricsCollector?.recordAuthAttempt(false, AuthErrorType.UNKNOWN_ERROR);
        
        // Log unexpected errors
        config.logger.error('Unexpected authentication error', { error });
      }

      // Record latency even for failures
      const duration = Date.now() - startTime;
      config.metricsCollector?.recordLatency(duration);

      res.status(authError.statusCode).json(config.errorFormatter(authError));
    }
  };
}

/**
 * Default authentication middleware (backward compatibility)
 */
export const authMiddleware = createAuthMiddleware();

/**
 * Extend Express Request type
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}