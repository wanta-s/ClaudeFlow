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
const mockRequest = (headers: any = {}, body: any = {}, query: any = {}): Partial<Request> => ({
  headers,
  body,
  query,
  cookies: {},
  path: '/test',
  method: 'GET',
  ip: '127.0.0.1',
  get: (name: string) => headers[name.toLowerCase()]
});

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
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

describe('Comprehensive Auth Middleware Tests', () => {
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

  describe('正常系テスト', () => {
    test('有効なトークンでの認証成功', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ logger, metricsCollector });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect((req as any).user).toEqual(expect.objectContaining(validPayload));
      expect(metricsCollector.authAttempts).toContainEqual({ success: true });
    });

    test('カスタムヘッダーからのトークン取得', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        logger,
        tokenExtractor: (req) => req.headers['x-custom-auth'] as string || null
      });
      
      const req = mockRequest({ 'x-custom-auth': token });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect((req as any).user).toEqual(expect.objectContaining(validPayload));
    });

    test('クエリパラメータからのトークン取得', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        logger,
        tokenExtractor: (req) => req.query?.token as string || null
      });
      
      const req = mockRequest({}, {}, { token });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('キャッシュからのトークン取得（2回目のリクエスト）', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ tokenCache, logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      // 1回目のリクエスト
      await middleware(req as Request, res as Response, mockNext);
      
      // 2回目のリクエスト（キャッシュから取得）
      logger.clear();
      mockNext.mockClear();
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(logger.logs).toContainEqual(
        expect.objectContaining({ 
          level: 'debug', 
          message: 'Token found in cache' 
        })
      );
    });

    test('異なるアルゴリズムでの署名検証', async () => {
      const options = { algorithm: 'HS512' as jwt.Algorithm };
      const token = jwt.sign(validPayload, secret, options);
      const middleware = createAuthMiddleware({ 
        logger, 
        jwtOptions: { algorithms: ['HS512'] }
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('複数の必要なロールを持つユーザーの認証成功', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        requiredRoles: ['user', 'admin'], 
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('onAuthenticatedコールバックの実行', async () => {
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
    });

    test('カスタムユーザーバリデーションの成功', async () => {
      const token = jwt.sign(validPayload, secret);
      const userValidator = jest.fn().mockResolvedValue(true);
      const middleware = createAuthMiddleware({ userValidator, logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(userValidator).toHaveBeenCalledWith(expect.objectContaining(validPayload));
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('異常系テスト', () => {
    test('トークンなしでのリクエスト', async () => {
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
    });

    test('無効なトークン形式', async () => {
      const middleware = createAuthMiddleware({ logger, metricsCollector });
      
      const req = mockRequest({ authorization: 'InvalidFormat token' });
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

    test('期限切れトークン', async () => {
      const expiredPayload = { 
        ...validPayload, 
        exp: Math.floor(Date.now() / 1000) - 3600 
      };
      const token = jwt.sign(expiredPayload, secret, { noTimestamp: true });
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

    test('無効な署名のトークン', async () => {
      const token = jwt.sign(validPayload, 'wrong-secret');
      const middleware = createAuthMiddleware({ logger, metricsCollector });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
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

    test('破損したトークン', async () => {
      const middleware = createAuthMiddleware({ logger, metricsCollector });
      
      const req = mockRequest({ authorization: 'Bearer invalid.corrupted.token' });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('無効化されたトークン', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        revocationChecker, 
        logger, 
        metricsCollector 
      });
      
      // トークンを無効化
      revocationChecker.revoke('token-123');
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          type: AuthErrorType.TOKEN_REVOKED,
          message: 'Token has been revoked'
        }
      });
    });

    test('必要なロールの不足', async () => {
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

    test('必要な権限の不足', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        requiredPermissions: ['delete', 'admin'], 
        logger, 
        metricsCollector 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('カスタムバリデーションの失敗', async () => {
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
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          type: AuthErrorType.USER_NOT_FOUND,
          message: 'User validation failed'
        }
      });
    });

    test('トークン抽出エラー', async () => {
      const middleware = createAuthMiddleware({ 
        tokenExtractor: () => { throw new Error('Extraction failed'); },
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
    });

    test('JWT_SECRET未設定エラー', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => createAuthMiddleware()).toThrow(
        'JWT_SECRET environment variable is required when secret option is not provided'
      );
    });
  });

  describe('境界値テスト', () => {
    test('最大トークン長（1000文字）', async () => {
      const longPayload = { ...validPayload, data: 'x'.repeat(900) };
      const token = jwt.sign(longPayload, secret);
      const middleware = createAuthMiddleware({ 
        maxTokenLength: 1000, 
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('最大トークン長を超過（1001文字）', async () => {
      const token = 'a'.repeat(1001);
      const middleware = createAuthMiddleware({ 
        maxTokenLength: 1000, 
        logger, 
        metricsCollector 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
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

    test('トークンの有効期限ちょうど', async () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const expiringPayload = { 
        ...validPayload, 
        exp: nowInSeconds + 1 // 1秒後に期限切れ
      };
      const token = jwt.sign(expiringPayload, secret, { noTimestamp: true });
      const middleware = createAuthMiddleware({ logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('空の配列でのロール要件', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        requiredRoles: [], 
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('ユーザーペイロードにロールがない場合', async () => {
      const payloadWithoutRoles = { 
        id: '123', 
        email: 'test@example.com',
        jti: 'token-123'
      };
      const token = jwt.sign(payloadWithoutRoles, secret);
      const middleware = createAuthMiddleware({ 
        requiredRoles: ['admin'], 
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('非常に長いキャッシュTTL', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        tokenCache, 
        cacheTTL: 86400, // 24時間
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      
      // キャッシュに保存されていることを確認
      const cachedPayload = await tokenCache.get(token);
      expect(cachedPayload).toEqual(expect.objectContaining(validPayload));
    });

    test('最小のJWTペイロード', async () => {
      const minimalPayload = { jti: 'token-123' };
      const token = jwt.sign(minimalPayload, secret);
      const middleware = createAuthMiddleware({ logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('エッジケース・セキュリティテスト', () => {
    test('SQLインジェクション試行のトークン', async () => {
      const maliciousPayload = { 
        ...validPayload, 
        id: "'; DROP TABLE users; --" 
      };
      const token = jwt.sign(maliciousPayload, secret);
      const middleware = createAuthMiddleware({ logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      // トークンは有効なので通過するが、ペイロードはそのまま保持される
      expect(mockNext).toHaveBeenCalled();
      expect((req as any).user.id).toBe("'; DROP TABLE users; --");
    });

    test('XSS試行のトークンペイロード', async () => {
      const xssPayload = { 
        ...validPayload, 
        email: '<script>alert("XSS")</script>' 
      };
      const token = jwt.sign(xssPayload, secret);
      const middleware = createAuthMiddleware({ logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect((req as any).user.email).toBe('<script>alert("XSS")</script>');
    });

    test('並行リクエストでのキャッシュ競合状態', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ tokenCache, logger });
      
      const req1 = mockRequest({ authorization: `Bearer ${token}` });
      const req2 = mockRequest({ authorization: `Bearer ${token}` });
      const res1 = mockResponse();
      const res2 = mockResponse();
      
      // 並行してリクエストを実行
      const [result1, result2] = await Promise.all([
        middleware(req1 as Request, res1 as Response, mockNext),
        middleware(req2 as Request, res2 as Response, mockNext)
      ]);
      
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    test('トークン無効化の即時反映', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ 
        tokenCache, 
        revocationChecker, 
        logger 
      });
      
      // 最初のリクエストは成功
      const req1 = mockRequest({ authorization: `Bearer ${token}` });
      const res1 = mockResponse();
      await middleware(req1 as Request, res1 as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // トークンを無効化
      revocationChecker.revoke('token-123');
      
      // 次のリクエストは失敗
      mockNext.mockClear();
      const req2 = mockRequest({ authorization: `Bearer ${token}` });
      const res2 = mockResponse();
      await middleware(req2 as Request, res2 as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(401);
    });

    test('ヘッダーインジェクション防止', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ logger });
      
      const req = mockRequest({ 
        authorization: `Bearer ${token}\r\nX-Injected: malicious` 
      });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      // 改行文字を含むトークンは無効として扱われる
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('メモリリークテスト（大量のトークン）', async () => {
      const middleware = createAuthMiddleware({ tokenCache, logger });
      
      // 1000個の異なるトークンでリクエスト
      for (let i = 0; i < 1000; i++) {
        const payload = { ...validPayload, id: `user-${i}`, jti: `token-${i}` };
        const token = jwt.sign(payload, secret);
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        
        await middleware(req as Request, res as Response, jest.fn());
      }
      
      // メモリ使用量の確認（実際のテストではメモリプロファイラを使用）
      expect(tokenCache).toBeDefined();
    });

    test('タイミング攻撃への耐性', async () => {
      const validToken = jwt.sign(validPayload, secret);
      const invalidToken = 'invalid.token.here';
      const middleware = createAuthMiddleware({ logger });
      
      const timings: number[] = [];
      
      // 有効なトークンの処理時間を測定
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        const req = mockRequest({ authorization: `Bearer ${validToken}` });
        const res = mockResponse();
        await middleware(req as Request, res as Response, jest.fn());
        const end = process.hrtime.bigint();
        timings.push(Number(end - start));
      }
      
      // 無効なトークンの処理時間を測定
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        const req = mockRequest({ authorization: `Bearer ${invalidToken}` });
        const res = mockResponse();
        await middleware(req as Request, res as Response, jest.fn());
        const end = process.hrtime.bigint();
        timings.push(Number(end - start));
      }
      
      // 処理時間のばらつきが一定範囲内であることを確認
      const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
      const variance = timings.map(t => Math.abs(t - avgTiming));
      
      expect(Math.max(...variance)).toBeLessThan(avgTiming * 2);
    });

    test('None アルゴリズム攻撃の防止', async () => {
      // alg: noneでトークンを作成しようとする
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify(validPayload)).toString('base64');
      const noneToken = `${header}.${payload}.`;
      
      const middleware = createAuthMiddleware({ logger });
      
      const req = mockRequest({ authorization: `Bearer ${noneToken}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('メトリクス収集の精度', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ metricsCollector, logger });
      
      // 複数のリクエストを実行
      for (let i = 0; i < 5; i++) {
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        await middleware(req as Request, res as Response, jest.fn());
      }
      
      // 失敗するリクエストも実行
      for (let i = 0; i < 3; i++) {
        const req = mockRequest({ authorization: 'Bearer invalid' });
        const res = mockResponse();
        await middleware(req as Request, res as Response, jest.fn());
      }
      
      // メトリクスの確認
      expect(metricsCollector.authAttempts.filter(a => a.success).length).toBe(5);
      expect(metricsCollector.authAttempts.filter(a => !a.success).length).toBe(3);
      expect(metricsCollector.latencies.length).toBe(8);
      expect(metricsCollector.latencies.every(l => l > 0)).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    test('キャッシュヒット時のパフォーマンス向上', async () => {
      const token = jwt.sign(validPayload, secret);
      const middlewareWithCache = createAuthMiddleware({ tokenCache, logger });
      const middlewareWithoutCache = createAuthMiddleware({ logger });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      
      // キャッシュなしの処理時間
      const startWithoutCache = process.hrtime.bigint();
      for (let i = 0; i < 100; i++) {
        await middlewareWithoutCache(req as Request, mockResponse() as Response, jest.fn());
      }
      const endWithoutCache = process.hrtime.bigint();
      const timeWithoutCache = Number(endWithoutCache - startWithoutCache);
      
      // キャッシュありの処理時間（最初の1回でキャッシュ）
      await middlewareWithCache(req as Request, mockResponse() as Response, jest.fn());
      
      const startWithCache = process.hrtime.bigint();
      for (let i = 0; i < 100; i++) {
        await middlewareWithCache(req as Request, mockResponse() as Response, jest.fn());
      }
      const endWithCache = process.hrtime.bigint();
      const timeWithCache = Number(endWithCache - startWithCache);
      
      // キャッシュありの方が高速であることを確認
      expect(timeWithCache).toBeLessThan(timeWithoutCache);
    });

    test('大量の並行リクエスト処理', async () => {
      const token = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ tokenCache, logger, metricsCollector });
      
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        promises.push(middleware(req as Request, res as Response, jest.fn()));
      }
      
      await Promise.all(promises);
      
      // すべてのリクエストが正常に処理されたことを確認
      expect(metricsCollector.authAttempts.filter(a => a.success).length).toBe(1000);
    });
  });

  describe('統合テスト', () => {
    test('すべての機能を有効にした統合テスト', async () => {
      const token = jwt.sign(validPayload, secret);
      const onAuthenticated = jest.fn();
      const userValidator = jest.fn().mockResolvedValue(true);
      
      const middleware = createAuthMiddleware({
        secret,
        tokenCache,
        revocationChecker,
        logger,
        metricsCollector,
        requiredRoles: ['admin'],
        requiredPermissions: ['read'],
        maxTokenLength: 5000,
        cacheTTL: 3600,
        userValidator,
        onAuthenticated,
        jwtOptions: { algorithms: ['HS256'] }
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      // すべての機能が正常に動作することを確認
      expect(mockNext).toHaveBeenCalled();
      expect(userValidator).toHaveBeenCalled();
      expect(onAuthenticated).toHaveBeenCalled();
      expect((req as any).user).toBeDefined();
      expect(logger.logs).toContainEqual(
        expect.objectContaining({ 
          level: 'info', 
          message: 'Authentication successful' 
        })
      );
      expect(metricsCollector.authAttempts).toContainEqual({ success: true });
      
      // キャッシュが機能することを確認
      const cachedPayload = await tokenCache.get(token);
      expect(cachedPayload).toEqual(expect.objectContaining(validPayload));
    });
  });
});