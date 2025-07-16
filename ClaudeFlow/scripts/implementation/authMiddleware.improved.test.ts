import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { 
  createAuthMiddleware, 
  AuthMiddlewareOptions, 
  UserPayload,
  AuthErrorType,
  Logger,
  TokenCache,
  TokenRevocationChecker,
  MetricsCollector
} from './authMiddleware.improved';

// Mock implementations
const mockRequest = (headers: any = {}): Partial<Request> => ({
  headers,
  path: '/test',
  method: 'GET',
  ip: '127.0.0.1'
});

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// Test logger
class TestLogger implements Logger {
  logs: { level: string; message: string; meta?: any }[] = [];
  
  debug(message: string, meta?: any) {
    this.logs.push({ level: 'debug', message, meta });
  }
  
  info(message: string, meta?: any) {
    this.logs.push({ level: 'info', message, meta });
  }
  
  warn(message: string, meta?: any) {
    this.logs.push({ level: 'warn', message, meta });
  }
  
  error(message: string, meta?: any) {
    this.logs.push({ level: 'error', message, meta });
  }
  
  clear() {
    this.logs = [];
  }
}

// Test cache
class TestTokenCache implements TokenCache {
  private cache = new Map<string, { payload: UserPayload; expiry: number }>();
  
  async get(token: string): Promise<UserPayload | null> {
    const entry = this.cache.get(token);
    if (!entry) return null;
    if (entry.expiry < Date.now()) {
      this.cache.delete(token);
      return null;
    }
    return entry.payload;
  }
  
  async set(token: string, payload: UserPayload, ttl: number = 3600): Promise<void> {
    this.cache.set(token, {
      payload,
      expiry: Date.now() + (ttl * 1000)
    });
  }
  
  async invalidate(token: string): Promise<void> {
    this.cache.delete(token);
  }
  
  clear() {
    this.cache.clear();
  }
}

// Test revocation checker
class TestRevocationChecker implements TokenRevocationChecker {
  private revokedTokens = new Set<string>();
  
  async isRevoked(tokenId: string): Promise<boolean> {
    return this.revokedTokens.has(tokenId);
  }
  
  revoke(tokenId: string) {
    this.revokedTokens.add(tokenId);
  }
  
  clear() {
    this.revokedTokens.clear();
  }
}

// Test metrics collector
class TestMetricsCollector implements MetricsCollector {
  authAttempts: { success: boolean; errorType?: AuthErrorType }[] = [];
  latencies: number[] = [];
  
  recordAuthAttempt(success: boolean, errorType?: AuthErrorType) {
    this.authAttempts.push({ success, errorType });
  }
  
  recordLatency(duration: number) {
    this.latencies.push(duration);
  }
  
  clear() {
    this.authAttempts = [];
    this.latencies = [];
  }
}

describe('Enhanced Auth Middleware', () => {
  const secret = 'test-secret-key';
  const validPayload: UserPayload = {
    id: '123',
    email: 'test@example.com',
    roles: ['user', 'admin'],
    permissions: ['read', 'write'],
    jti: 'token-123'
  };
  
  let logger: TestLogger;
  let tokenCache: TestTokenCache;
  let revocationChecker: TestRevocationChecker;
  let metricsCollector: TestMetricsCollector;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = secret;
    logger = new TestLogger();
    tokenCache = new TestTokenCache();
    revocationChecker = new TestRevocationChecker();
    metricsCollector = new TestMetricsCollector();
  });
  
  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('Basic Authentication', () => {
    test('should authenticate valid token', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ logger, metricsCollector });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect((req as any).user).toEqual(expect.objectContaining(validPayload));
      expect(metricsCollector.authAttempts).toContainEqual({ success: true });
    });

    test('should reject missing token', async () => {
      const middleware = createAuthMiddleware({ logger, metricsCollector });
      
      const req = mockRequest();
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          type: AuthErrorType.NO_TOKEN,
          message: 'Authentication token is required'
        }
      });
      expect(metricsCollector.authAttempts).toContainEqual({ 
        success: false, 
        errorType: AuthErrorType.NO_TOKEN 
      });
    });

    test('should reject expired token', async () => {
      const expiredPayload = { ...validPayload, exp: Math.floor(Date.now() / 1000) - 3600 };
      const token = jwt.sign(expiredPayload, secret);
      const middleware = createAuthMiddleware({ logger, metricsCollector });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          type: AuthErrorType.TOKEN_EXPIRED,
          message: 'Authentication token has expired'
        }
      });
    });

    test('should reject invalid token', async () => {
      const middleware = createAuthMiddleware({ logger, metricsCollector });
      
      const req = mockRequest({ authorization: 'Bearer invalid.token.here' });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          type: AuthErrorType.INVALID_TOKEN,
          message: 'Invalid authentication token'
        }
      });
    });
  });

  describe('Configuration Options', () => {
    test('should use custom secret', async () => {
      const customSecret = 'custom-secret';
      const token = jwt.sign(validPayload, customSecret);
      const middleware = createAuthMiddleware({ secret: customSecret, logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('should throw error if no secret provided', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => createAuthMiddleware()).toThrow(
        'JWT_SECRET environment variable is required when secret option is not provided'
      );
    });

    test('should use custom token extractor', async () => {
      const token = jwt.sign(validPayload, secret);
      const customExtractor = (req: Request) => req.headers['x-auth-token'] as string || null;
      const middleware = createAuthMiddleware({ tokenExtractor: customExtractor, logger });
      
      const req = mockRequest({ 'x-auth-token': token });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('should use custom error formatter', async () => {
      const customFormatter = (error: any) => ({ customError: error.message });
      const middleware = createAuthMiddleware({ errorFormatter: customFormatter, logger });
      
      const req = mockRequest();
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(res.json).toHaveBeenCalledWith({ 
        customError: 'Authentication token is required' 
      });
    });

    test('should validate token length', async () => {
      const longToken = 'Bearer ' + 'a'.repeat(1001);
      const middleware = createAuthMiddleware({ 
        maxTokenLength: 1000, 
        logger, 
        metricsCollector 
      });
      
      const req = mockRequest({ authorization: longToken });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          type: AuthErrorType.INVALID_FORMAT,
          message: 'Invalid token format'
        }
      });
    });
  });

  describe('Role and Permission Checks', () => {
    test('should enforce required roles', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        requiredRoles: ['superadmin'], 
        logger, 
        metricsCollector 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          type: AuthErrorType.INSUFFICIENT_PERMISSIONS,
          message: 'Insufficient permissions'
        }
      });
    });

    test('should allow access with matching role', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        requiredRoles: ['admin'], 
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('should enforce required permissions', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        requiredPermissions: ['delete'], 
        logger, 
        metricsCollector 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should allow access with all required permissions', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        requiredPermissions: ['read', 'write'], 
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    test('should cache valid tokens', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ tokenCache, logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      // First request
      await middleware(req as Request, res as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Second request should use cache
      mockNext.mockClear();
      await middleware(req as Request, res as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Check logger shows cache hit
      expect(logger.logs).toContainEqual(
        expect.objectContaining({ 
          level: 'debug', 
          message: 'Token found in cache' 
        })
      );
    });

    test('should invalidate cache for revoked tokens', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        tokenCache, 
        revocationChecker, 
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      // First request - cache the token
      await middleware(req as Request, res as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Revoke the token
      revocationChecker.revoke('token-123');
      
      // Second request should check revocation
      mockNext.mockClear();
      (res.status as jest.Mock).mockClear();
      (res.json as jest.Mock).mockClear();
      
      await middleware(req as Request, res as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Custom Validation', () => {
    test('should use custom user validator', async () => {
      const token = jwt.sign(validPayload, secret);
      const userValidator = jest.fn().mockResolvedValue(false);
      const middleware = createAuthMiddleware({ 
        userValidator, 
        logger, 
        metricsCollector 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(userValidator).toHaveBeenCalledWith(expect.objectContaining(validPayload));
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should call onAuthenticated callback', async () => {
      const token = jwt.sign(validPayload, secret);
      const onAuthenticated = jest.fn();
      const middleware = createAuthMiddleware({ onAuthenticated, logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(onAuthenticated).toHaveBeenCalledWith(
        expect.objectContaining(validPayload),
        req
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Logging and Metrics', () => {
    test('should log authentication attempts', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(logger.logs).toContainEqual(
        expect.objectContaining({ 
          level: 'debug', 
          message: 'Authentication attempt' 
        })
      );
      expect(logger.logs).toContainEqual(
        expect.objectContaining({ 
          level: 'info', 
          message: 'Authentication successful' 
        })
      );
    });

    test('should record metrics', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ metricsCollector, logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(metricsCollector.authAttempts).toHaveLength(1);
      expect(metricsCollector.authAttempts[0]).toEqual({ success: true });
      expect(metricsCollector.latencies).toHaveLength(1);
      expect(metricsCollector.latencies[0]).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle unexpected errors gracefully', async () => {
      const middleware = createAuthMiddleware({ 
        tokenExtractor: () => { throw new Error('Unexpected error'); },
        logger,
        metricsCollector
      });
      
      const req = mockRequest({ authorization: 'Bearer token' });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          type: AuthErrorType.UNKNOWN_ERROR,
          message: 'Authentication error'
        }
      });
      expect(logger.logs).toContainEqual(
        expect.objectContaining({ 
          level: 'error', 
          message: 'Unexpected authentication error' 
        })
      );
    });
  });
});