import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { promisify } from 'util';
import * as crypto from 'crypto';
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

// Import mock implementations from comprehensive test
import {
  mockRequest,
  mockResponse,
  TestLogger,
  TestTokenCache,
  TestRevocationChecker,
  TestMetricsCollector
} from './authMiddleware.comprehensive.test';

const sleep = promisify(setTimeout);

describe('Extended Auth Middleware Tests', () => {
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

  describe('高度な統合テスト', () => {
    test('複数のミドルウェアチェーンでの統合', async () => {
      const token = jwt.sign(validPayload, secret);
      
      // 複数の認証レイヤー
      const authMiddleware1 = createAuthMiddleware({ 
        logger, 
        requiredRoles: ['user'] 
      });
      const authMiddleware2 = createAuthMiddleware({ 
        logger, 
        requiredPermissions: ['read'] 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next1 = jest.fn();
      const next2 = jest.fn();
      
      // 最初のミドルウェア
      await authMiddleware1(req as Request, res as Response, next1);
      expect(next1).toHaveBeenCalled();
      
      // 2番目のミドルウェア（同じリクエストオブジェクト）
      await authMiddleware2(req as Request, res as Response, next2);
      expect(next2).toHaveBeenCalled();
      
      // ユーザー情報が保持されている
      expect((req as any).user).toEqual(expect.objectContaining(validPayload));
    });

    test('リトライメカニズムとの統合', async () => {
      const token = jwt.sign(validPayload, secret);
      let attempts = 0;
      
      // 最初の2回は失敗、3回目で成功するキャッシュ
      const flakyCacheClass = class implements TokenCache {
        async get(token: string): Promise<UserPayload | null> {
          attempts++;
          if (attempts < 3) {
            throw new Error('Cache temporarily unavailable');
          }
          return null;
        }
        
        async set(token: string, payload: UserPayload, ttl?: number): Promise<void> {
          // No-op
        }
        
        async invalidate(token: string): Promise<void> {
          // No-op
        }
      };
      
      const flakyCache = new flakyCacheClass();
      const middleware = createAuthMiddleware({ 
        tokenCache: flakyCache, 
        logger 
      });
      
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = jest.fn();
      
      await middleware(req as Request, res as Response, next);
      
      // キャッシュエラーがあっても認証は成功する
      expect(next).toHaveBeenCalled();
      expect(logger.logs).toContainEqual(
        expect.objectContaining({ 
          level: 'error', 
          message: expect.stringContaining('Cache error') 
        })
      );
    });

    test('動的な設定変更のシミュレーション', async () => {
      const token = jwt.sign(validPayload, secret);
      
      // 設定可能なミドルウェアファクトリ
      const createConfigurableMiddleware = (config: AuthMiddlewareOptions) => {
        return createAuthMiddleware(config);
      };
      
      // 初期設定
      let middleware = createConfigurableMiddleware({ 
        logger, 
        requiredRoles: ['user'] 
      });
      
      const req1 = mockRequest({ authorization: `Bearer ${token}` });
      const res1 = mockResponse();
      const next1 = jest.fn();
      
      await middleware(req1 as Request, res1 as Response, next1);
      expect(next1).toHaveBeenCalled();
      
      // 設定を変更（adminロールが必要に）
      middleware = createConfigurableMiddleware({ 
        logger, 
        requiredRoles: ['superadmin'] 
      });
      
      const req2 = mockRequest({ authorization: `Bearer ${token}` });
      const res2 = mockResponse();
      const next2 = jest.fn();
      
      await middleware(req2 as Request, res2 as Response, next2);
      expect(next2).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(403);
    });
  });

  describe('高度なパフォーマンステスト', () => {
    test('キャッシュウォーミングのパフォーマンス影響', async () => {
      const tokens: string[] = [];
      const payloads: UserPayload[] = [];
      
      // 100個のトークンを生成
      for (let i = 0; i < 100; i++) {
        const payload = { 
          ...validPayload, 
          id: `user-${i}`, 
          jti: `token-${i}` 
        };
        payloads.push(payload);
        tokens.push(jwt.sign(payload, secret));
      }
      
      const middleware = createAuthMiddleware({ tokenCache, logger });
      
      // キャッシュをウォーミング
      const warmupStart = process.hrtime.bigint();
      for (let i = 0; i < 100; i++) {
        await tokenCache.set(tokens[i], payloads[i], 3600);
      }
      const warmupEnd = process.hrtime.bigint();
      const warmupTime = Number(warmupEnd - warmupStart);
      
      // ウォーミング後のパフォーマンステスト
      const testStart = process.hrtime.bigint();
      for (let i = 0; i < 100; i++) {
        const req = mockRequest({ authorization: `Bearer ${tokens[i]}` });
        const res = mockResponse();
        await middleware(req as Request, res as Response, jest.fn());
      }
      const testEnd = process.hrtime.bigint();
      const testTime = Number(testEnd - testStart);
      
      // ウォーミングありのテストは高速であるべき
      expect(testTime).toBeLessThan(warmupTime * 10);
    });

    test('メモリ効率性のテスト', async () => {
      const middleware = createAuthMiddleware({ tokenCache, logger });
      
      // ヒープ使用量の初期値を記録
      if (global.gc) {
        global.gc();
      }
      const initialHeap = process.memoryUsage().heapUsed;
      
      // 大量のトークンを処理
      for (let i = 0; i < 10000; i++) {
        const payload = { 
          ...validPayload, 
          id: `user-${i}`, 
          jti: `token-${i}`,
          data: 'x'.repeat(100) // 追加データ
        };
        const token = jwt.sign(payload, secret);
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        
        await middleware(req as Request, res as Response, jest.fn());
      }
      
      // ガベージコレクションを実行
      if (global.gc) {
        global.gc();
      }
      const finalHeap = process.memoryUsage().heapUsed;
      
      // メモリ使用量の増加が妥当な範囲内
      const memoryIncrease = finalHeap - initialHeap;
      const memoryIncreaseInMB = memoryIncrease / 1024 / 1024;
      
      expect(memoryIncreaseInMB).toBeLessThan(100); // 100MB未満
    });

    test('CPU集約的な処理のベンチマーク', async () => {
      const complexPayload = {
        ...validPayload,
        nestedData: {
          level1: {
            level2: {
              level3: {
                data: Array(100).fill(0).map((_, i) => ({
                  id: i,
                  value: crypto.randomBytes(32).toString('hex')
                }))
              }
            }
          }
        }
      };
      
      const token = jwt.sign(complexPayload, secret);
      const middleware = createAuthMiddleware({ logger });
      
      const iterations = 1000;
      const cpuTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startCPU = process.cpuUsage();
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        
        await middleware(req as Request, res as Response, jest.fn());
        
        const endCPU = process.cpuUsage(startCPU);
        cpuTimes.push(endCPU.user + endCPU.system);
      }
      
      // CPU使用時間の統計
      const avgCPUTime = cpuTimes.reduce((a, b) => a + b) / cpuTimes.length;
      const maxCPUTime = Math.max(...cpuTimes);
      
      // 平均CPU時間が妥当な範囲内
      expect(avgCPUTime).toBeLessThan(1000); // 1ms未満
      expect(maxCPUTime).toBeLessThan(5000); // 最大5ms未満
    });
  });

  describe('高度なセキュリティテスト', () => {
    test('JWT爆弾攻撃への耐性', async () => {
      // 巨大なペイロードを持つJWT（JWT爆弾）
      const bombPayload = {
        ...validPayload,
        bomb: 'x'.repeat(1000000) // 1MBのペイロード
      };
      
      const bombToken = jwt.sign(bombPayload, secret);
      const middleware = createAuthMiddleware({ 
        logger,
        maxTokenLength: 10000 // 10KB制限
      });
      
      const req = mockRequest({ authorization: `Bearer ${bombToken}` });
      const res = mockResponse();
      const next = jest.fn();
      
      await middleware(req as Request, res as Response, next);
      
      // トークンが長すぎるため拒否される
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('レート制限との統合', async () => {
      const token = jwt.sign(validPayload, secret);
      const rateLimitedIPs = new Map<string, number>();
      
      // レート制限付きミドルウェア
      const rateLimitedAuthMiddleware = (options: AuthMiddlewareOptions) => {
        const authMiddleware = createAuthMiddleware(options);
        
        return async (req: Request, res: Response, next: NextFunction) => {
          const ip = req.ip || '127.0.0.1';
          const attempts = rateLimitedIPs.get(ip) || 0;
          
          if (attempts >= 5) {
            res.status(429).json({ error: 'Too many requests' });
            return;
          }
          
          rateLimitedIPs.set(ip, attempts + 1);
          
          await authMiddleware(req, res, (error?: any) => {
            if (error || res.statusCode === 401) {
              // 失敗時はカウントを増やす
              rateLimitedIPs.set(ip, attempts + 1);
            } else {
              // 成功時はカウントをリセット
              rateLimitedIPs.delete(ip);
            }
            next(error);
          });
        };
      };
      
      const middleware = rateLimitedAuthMiddleware({ logger });
      
      // 5回失敗
      for (let i = 0; i < 5; i++) {
        const req = mockRequest({ 
          authorization: 'Bearer invalid.token',
          ip: '192.168.1.1'
        });
        const res = mockResponse();
        await middleware(req as Request, res as Response, jest.fn());
      }
      
      // 6回目はレート制限
      const req = mockRequest({ 
        authorization: `Bearer ${token}`,
        ip: '192.168.1.1'
      });
      const res = mockResponse();
      const next = jest.fn();
      
      await middleware(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
    });

    test('サイドチャネル攻撃への耐性', async () => {
      const validToken = jwt.sign(validPayload, secret);
      const middleware = createAuthMiddleware({ logger });
      
      // 異なる長さのトークンでタイミング測定
      const tokenLengths = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      const timingsByLength = new Map<number, number[]>();
      
      for (const length of tokenLengths) {
        const timings: number[] = [];
        const paddedToken = validToken + 'x'.repeat(length - validToken.length);
        
        for (let i = 0; i < 20; i++) {
          const start = process.hrtime.bigint();
          const req = mockRequest({ authorization: `Bearer ${paddedToken}` });
          const res = mockResponse();
          
          await middleware(req as Request, res as Response, jest.fn());
          
          const end = process.hrtime.bigint();
          timings.push(Number(end - start));
        }
        
        timingsByLength.set(length, timings);
      }
      
      // 処理時間がトークン長に線形相関しないことを確認
      const avgTimings = Array.from(timingsByLength.entries()).map(([length, timings]) => ({
        length,
        avgTime: timings.reduce((a, b) => a + b) / timings.length
      }));
      
      // 相関係数を計算
      const correlation = calculateCorrelation(
        avgTimings.map(t => t.length),
        avgTimings.map(t => t.avgTime)
      );
      
      expect(Math.abs(correlation)).toBeLessThan(0.5); // 弱い相関
    });

    test('暗号学的タイミング攻撃への防御', async () => {
      const secret1 = 'secret-key-1';
      const secret2 = 'secret-key-2';
      const payload = validPayload;
      
      const token1 = jwt.sign(payload, secret1);
      const token2 = jwt.sign(payload, secret2);
      
      const middleware1 = createAuthMiddleware({ secret: secret1, logger });
      const middleware2 = createAuthMiddleware({ secret: secret2, logger });
      
      const timings1: number[] = [];
      const timings2: number[] = [];
      
      // 正しい秘密鍵でのタイミング
      for (let i = 0; i < 50; i++) {
        const start = process.hrtime.bigint();
        const req = mockRequest({ authorization: `Bearer ${token1}` });
        const res = mockResponse();
        await middleware1(req as Request, res as Response, jest.fn());
        const end = process.hrtime.bigint();
        timings1.push(Number(end - start));
      }
      
      // 間違った秘密鍵でのタイミング
      for (let i = 0; i < 50; i++) {
        const start = process.hrtime.bigint();
        const req = mockRequest({ authorization: `Bearer ${token1}` });
        const res = mockResponse();
        await middleware2(req as Request, res as Response, jest.fn());
        const end = process.hrtime.bigint();
        timings2.push(Number(end - start));
      }
      
      // タイミングの分布が似ていることを確認
      const avg1 = timings1.reduce((a, b) => a + b) / timings1.length;
      const avg2 = timings2.reduce((a, b) => a + b) / timings2.length;
      const timingRatio = avg1 / avg2;
      
      expect(timingRatio).toBeGreaterThan(0.8);
      expect(timingRatio).toBeLessThan(1.2);
    });
  });

  describe('実際の運用シナリオテスト', () => {
    test('トークンローテーションシナリオ', async () => {
      // 古いトークンと新しいトークンの同時運用
      const oldSecret = 'old-secret';
      const newSecret = 'new-secret';
      
      const oldToken = jwt.sign(validPayload, oldSecret);
      const newToken = jwt.sign(validPayload, newSecret);
      
      // 複数の秘密鍵をサポートするミドルウェア
      const multiSecretMiddleware = (secrets: string[]) => {
        return async (req: Request, res: Response, next: NextFunction) => {
          for (const secret of secrets) {
            try {
              const middleware = createAuthMiddleware({ secret, logger });
              await middleware(req, res, (error?: any) => {
                if (!error && !res.headersSent) {
                  next();
                  return;
                }
              });
              
              if (!res.headersSent && (req as any).user) {
                return;
              }
            } catch (error) {
              // 次の秘密鍵を試す
            }
          }
          
          // すべての秘密鍵で失敗
          if (!res.headersSent) {
            res.status(401).json({ error: 'Invalid token' });
          }
        };
      };
      
      const middleware = multiSecretMiddleware([newSecret, oldSecret]);
      
      // 新しいトークンで認証
      const req1 = mockRequest({ authorization: `Bearer ${newToken}` });
      const res1 = mockResponse();
      const next1 = jest.fn();
      await middleware(req1 as Request, res1 as Response, next1);
      expect(next1).toHaveBeenCalled();
      
      // 古いトークンでも認証可能
      const req2 = mockRequest({ authorization: `Bearer ${oldToken}` });
      const res2 = mockResponse();
      const next2 = jest.fn();
      await middleware(req2 as Request, res2 as Response, next2);
      expect(next2).toHaveBeenCalled();
    });

    test('グレースフルシャットダウンシナリオ', async () => {
      const token = jwt.sign(validPayload, secret);
      let isShuttingDown = false;
      
      // シャットダウン中の動作をシミュレート
      const gracefulMiddleware = createAuthMiddleware({
        logger,
        tokenCache,
        onAuthenticated: async (user, req) => {
          if (isShuttingDown) {
            // シャットダウン中は新しいキャッシュエントリを作成しない
            return;
          }
        }
      });
      
      // 通常の動作
      const req1 = mockRequest({ authorization: `Bearer ${token}` });
      const res1 = mockResponse();
      await gracefulMiddleware(req1 as Request, res1 as Response, jest.fn());
      
      // シャットダウン開始
      isShuttingDown = true;
      
      // シャットダウン中でも既存のリクエストは処理
      const req2 = mockRequest({ authorization: `Bearer ${token}` });
      const res2 = mockResponse();
      const next2 = jest.fn();
      await gracefulMiddleware(req2 as Request, res2 as Response, next2);
      
      expect(next2).toHaveBeenCalled();
    });

    test('マイクロサービス間認証シナリオ', async () => {
      // サービス間通信用の特別なトークン
      const servicePayload: UserPayload = {
        id: 'service-account',
        email: 'service@internal.com',
        roles: ['service'],
        permissions: ['internal-api'],
        jti: 'service-token-123',
        serviceAccount: true
      };
      
      const serviceToken = jwt.sign(servicePayload, secret);
      
      // サービスアカウント用の特別な検証
      const serviceAuthMiddleware = createAuthMiddleware({
        logger,
        userValidator: async (user) => {
          if (user.serviceAccount) {
            // サービスアカウントの追加検証
            return user.roles?.includes('service') || false;
          }
          return true;
        },
        onAuthenticated: async (user, req) => {
          if (user.serviceAccount) {
            // サービスアカウントのアクセスをログ
            logger.info('Service account access', {
              service: user.id,
              endpoint: req.path
            });
          }
        }
      });
      
      const req = mockRequest({ 
        authorization: `Bearer ${serviceToken}`,
        headers: {
          'x-service-name': 'api-gateway',
          'x-request-id': 'req-123'
        }
      });
      const res = mockResponse();
      const next = jest.fn();
      
      await serviceAuthMiddleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
      expect(logger.logs).toContainEqual(
        expect.objectContaining({
          level: 'info',
          message: 'Service account access'
        })
      );
    });
  });

  describe('障害回復とレジリエンステスト', () => {
    test('キャッシュ障害からの自動回復', async () => {
      const token = jwt.sign(validPayload, secret);
      let cacheHealthy = true;
      
      // 障害をシミュレートするキャッシュ
      class UnstableCache implements TokenCache {
        private backup = new Map<string, UserPayload>();
        
        async get(token: string): Promise<UserPayload | null> {
          if (!cacheHealthy) {
            throw new Error('Cache unavailable');
          }
          return this.backup.get(token) || null;
        }
        
        async set(token: string, payload: UserPayload, ttl?: number): Promise<void> {
          if (!cacheHealthy) {
            // 障害時は黙って失敗
            return;
          }
          this.backup.set(token, payload);
        }
        
        async invalidate(token: string): Promise<void> {
          this.backup.delete(token);
        }
      }
      
      const unstableCache = new UnstableCache();
      const middleware = createAuthMiddleware({
        tokenCache: unstableCache,
        logger,
        metricsCollector
      });
      
      // 正常時
      const req1 = mockRequest({ authorization: `Bearer ${token}` });
      await middleware(req1 as Request, mockResponse() as Response, jest.fn());
      
      // キャッシュ障害
      cacheHealthy = false;
      const req2 = mockRequest({ authorization: `Bearer ${token}` });
      const next2 = jest.fn();
      await middleware(req2 as Request, mockResponse() as Response, next2);
      
      // 障害があっても認証は成功
      expect(next2).toHaveBeenCalled();
      
      // キャッシュ回復
      cacheHealthy = true;
      const req3 = mockRequest({ authorization: `Bearer ${token}` });
      await middleware(req3 as Request, mockResponse() as Response, jest.fn());
      
      // エラーログを確認
      const cacheErrors = logger.logs.filter(
        log => log.level === 'error' && log.message.includes('Cache error')
      );
      expect(cacheErrors.length).toBeGreaterThan(0);
    });

    test('無効化チェッカーのタイムアウト処理', async () => {
      const token = jwt.sign(validPayload, secret);
      
      // タイムアウトするチェッカー
      class TimeoutRevocationChecker implements TokenRevocationChecker {
        async isRevoked(tokenId: string): Promise<boolean> {
          await sleep(5000); // 5秒待機
          return false;
        }
      }
      
      const timeoutChecker = new TimeoutRevocationChecker();
      const middleware = createAuthMiddleware({
        revocationChecker: timeoutChecker,
        logger,
        // タイムアウトを短く設定（実装に依存）
      });
      
      const start = Date.now();
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = jest.fn();
      
      await middleware(req as Request, res as Response, next);
      const duration = Date.now() - start;
      
      // タイムアウトせずに処理が完了（フォールバック動作）
      expect(duration).toBeLessThan(1000); // 1秒以内
      expect(next).toHaveBeenCalled();
    });
  });
});

// ヘルパー関数
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
  
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return correlation;
}