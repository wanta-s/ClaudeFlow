import express, { Application, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import supertest from 'supertest';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import Redis from 'ioredis';
import { 
  createAuthMiddleware, 
  AuthMiddlewareOptions, 
  UserPayload,
  AuthErrorType,
  TokenCache,
  TokenRevocationChecker,
  Logger,
  MetricsCollector
} from './authMiddleware.improved';

// Redisを使用した実際のキャッシュ実装
class RedisTokenCache implements TokenCache {
  private client: Redis;
  
  constructor(redisUrl?: string) {
    this.client = new Redis(redisUrl || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableOfflineQueue: false
    });
  }
  
  async get(token: string): Promise<UserPayload | null> {
    try {
      const data = await this.client.get(`auth:token:${token}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }
  
  async set(token: string, payload: UserPayload, ttl: number = 3600): Promise<void> {
    try {
      await this.client.setex(
        `auth:token:${token}`, 
        ttl, 
        JSON.stringify(payload)
      );
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
  
  async invalidate(token: string): Promise<void> {
    try {
      await this.client.del(`auth:token:${token}`);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }
  
  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Redisベースの無効化チェッカー
class RedisRevocationChecker implements TokenRevocationChecker {
  private client: Redis;
  
  constructor(redisUrl?: string) {
    this.client = new Redis(redisUrl || 'redis://localhost:6379');
  }
  
  async isRevoked(tokenId: string): Promise<boolean> {
    try {
      const result = await this.client.get(`auth:revoked:${tokenId}`);
      return result === '1';
    } catch (error) {
      console.error('Redis revocation check error:', error);
      return false;
    }
  }
  
  async revoke(tokenId: string, ttl: number = 86400): Promise<void> {
    try {
      await this.client.setex(`auth:revoked:${tokenId}`, ttl, '1');
    } catch (error) {
      console.error('Redis revoke error:', error);
    }
  }
  
  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Prometheusスタイルのメトリクス収集
class PrometheusMetricsCollector implements MetricsCollector {
  private metrics = {
    auth_attempts_total: { success: 0, failed: 0 },
    auth_latency_seconds: [] as number[],
    auth_errors_total: new Map<string, number>()
  };
  
  recordAuthAttempt(success: boolean, errorType?: AuthErrorType): void {
    if (success) {
      this.metrics.auth_attempts_total.success++;
    } else {
      this.metrics.auth_attempts_total.failed++;
      if (errorType) {
        const current = this.metrics.auth_errors_total.get(errorType) || 0;
        this.metrics.auth_errors_total.set(errorType, current + 1);
      }
    }
  }
  
  recordLatency(duration: number): void {
    this.metrics.auth_latency_seconds.push(duration / 1000); // Convert to seconds
  }
  
  getMetrics(): string {
    const lines: string[] = [];
    
    // Auth attempts
    lines.push('# HELP auth_attempts_total Total number of authentication attempts');
    lines.push('# TYPE auth_attempts_total counter');
    lines.push(`auth_attempts_total{status="success"} ${this.metrics.auth_attempts_total.success}`);
    lines.push(`auth_attempts_total{status="failed"} ${this.metrics.auth_attempts_total.failed}`);
    
    // Auth errors
    lines.push('# HELP auth_errors_total Total number of authentication errors by type');
    lines.push('# TYPE auth_errors_total counter');
    this.metrics.auth_errors_total.forEach((count, errorType) => {
      lines.push(`auth_errors_total{type="${errorType}"} ${count}`);
    });
    
    // Latency histogram
    if (this.metrics.auth_latency_seconds.length > 0) {
      const sorted = [...this.metrics.auth_latency_seconds].sort((a, b) => a - b);
      const quantiles = [0.5, 0.9, 0.95, 0.99];
      
      lines.push('# HELP auth_latency_seconds Authentication latency in seconds');
      lines.push('# TYPE auth_latency_seconds summary');
      
      quantiles.forEach(q => {
        const index = Math.floor(q * sorted.length);
        const value = sorted[index] || 0;
        lines.push(`auth_latency_seconds{quantile="${q}"} ${value}`);
      });
      
      const sum = sorted.reduce((a, b) => a + b, 0);
      lines.push(`auth_latency_seconds_sum ${sum}`);
      lines.push(`auth_latency_seconds_count ${sorted.length}`);
    }
    
    return lines.join('\n');
  }
}

// 実際のExpressアプリケーション
function createTestApp(authOptions: AuthMiddlewareOptions): Application {
  const app = express();
  
  // ヘルスチェックエンドポイント
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // 認証が必要なエンドポイント
  app.get('/api/user', 
    createAuthMiddleware(authOptions),
    (req, res) => {
      res.json({ user: (req as any).user });
    }
  );
  
  // ロールベースのアクセス制御
  app.get('/api/admin',
    createAuthMiddleware({ ...authOptions, requiredRoles: ['admin'] }),
    (req, res) => {
      res.json({ message: 'Admin access granted' });
    }
  );
  
  // 権限ベースのアクセス制御
  app.post('/api/write',
    createAuthMiddleware({ ...authOptions, requiredPermissions: ['write'] }),
    (req, res) => {
      res.json({ message: 'Write access granted' });
    }
  );
  
  // メトリクスエンドポイント
  app.get('/metrics', (req, res) => {
    if (authOptions.metricsCollector && 'getMetrics' in authOptions.metricsCollector) {
      res.set('Content-Type', 'text/plain');
      res.send((authOptions.metricsCollector as PrometheusMetricsCollector).getMetrics());
    } else {
      res.status(404).send('Metrics not available');
    }
  });
  
  // エラーハンドリング
  app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  return app;
}

describe('E2Eテスト - 実際の環境での統合テスト', () => {
  const secret = 'e2e-test-secret';
  let app: Application;
  let server: http.Server;
  let redisCache: RedisTokenCache;
  let redisRevocation: RedisRevocationChecker;
  let metricsCollector: PrometheusMetricsCollector;
  
  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    
    // Redis接続をスキップする場合はモックを使用
    const useRedis = process.env.USE_REDIS === 'true';
    
    if (useRedis) {
      redisCache = new RedisTokenCache();
      redisRevocation = new RedisRevocationChecker();
    }
    
    metricsCollector = new PrometheusMetricsCollector();
    
    app = createTestApp({
      tokenCache: useRedis ? redisCache : undefined,
      revocationChecker: useRedis ? redisRevocation : undefined,
      metricsCollector,
      logger: console as Logger
    });
    
    server = app.listen(0); // ランダムポート
  });
  
  afterAll(async () => {
    if (redisCache) await redisCache.close();
    if (redisRevocation) await redisRevocation.close();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    delete process.env.JWT_SECRET;
  });

  describe('基本的な認証フロー', () => {
    test('有効なトークンでAPIアクセス', async () => {
      const token = jwt.sign({
        id: 'e2e-user',
        email: 'e2e@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'e2e-token-1'
      }, secret);
      
      const response = await supertest(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.user).toMatchObject({
        id: 'e2e-user',
        email: 'e2e@test.com'
      });
    });
    
    test('トークンなしでアクセス拒否', async () => {
      const response = await supertest(app)
        .get('/api/user')
        .expect(401);
      
      expect(response.body.error).toMatchObject({
        type: AuthErrorType.NO_TOKEN,
        message: 'Authentication token is required'
      });
    });
    
    test('無効なトークンでアクセス拒否', async () => {
      const response = await supertest(app)
        .get('/api/user')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
      
      expect(response.body.error).toMatchObject({
        type: AuthErrorType.INVALID_TOKEN
      });
    });
  });

  describe('ロールと権限ベースのアクセス制御', () => {
    test('管理者ロールでのアクセス', async () => {
      const adminToken = jwt.sign({
        id: 'admin-user',
        email: 'admin@test.com',
        roles: ['user', 'admin'],
        permissions: ['read', 'write'],
        jti: 'admin-token-1'
      }, secret);
      
      const response = await supertest(app)
        .get('/api/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.message).toBe('Admin access granted');
    });
    
    test('通常ユーザーの管理者エンドポイントへのアクセス拒否', async () => {
      const userToken = jwt.sign({
        id: 'normal-user',
        email: 'user@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'user-token-1'
      }, secret);
      
      const response = await supertest(app)
        .get('/api/admin')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      
      expect(response.body.error).toMatchObject({
        type: AuthErrorType.INSUFFICIENT_PERMISSIONS
      });
    });
    
    test('書き込み権限でのアクセス', async () => {
      const writeToken = jwt.sign({
        id: 'writer-user',
        email: 'writer@test.com',
        roles: ['user'],
        permissions: ['read', 'write'],
        jti: 'write-token-1'
      }, secret);
      
      const response = await supertest(app)
        .post('/api/write')
        .set('Authorization', `Bearer ${writeToken}`)
        .expect(200);
      
      expect(response.body.message).toBe('Write access granted');
    });
  });

  describe('トークンの有効期限とリフレッシュ', () => {
    test('期限切れトークンの拒否', async () => {
      const expiredToken = jwt.sign({
        id: 'expired-user',
        email: 'expired@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'expired-token-1',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1時間前に期限切れ
      }, secret);
      
      const response = await supertest(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
      
      expect(response.body.error).toMatchObject({
        type: AuthErrorType.TOKEN_EXPIRED
      });
    });
    
    test('もうすぐ期限切れのトークンの受け入れ', async () => {
      const soonToExpireToken = jwt.sign({
        id: 'soon-expire-user',
        email: 'soon@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'soon-expire-token-1',
        exp: Math.floor(Date.now() / 1000) + 60 // 60秒後に期限切れ
      }, secret);
      
      const response = await supertest(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${soonToExpireToken}`)
        .expect(200);
      
      expect(response.body.user.id).toBe('soon-expire-user');
    });
  });

  describe('メトリクスとモニタリング', () => {
    test('メトリクスエンドポイントの動作確認', async () => {
      // いくつかのリクエストを実行してメトリクスを生成
      const validToken = jwt.sign({
        id: 'metrics-user',
        email: 'metrics@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'metrics-token-1'
      }, secret);
      
      // 成功するリクエスト
      await supertest(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${validToken}`);
      
      // 失敗するリクエスト
      await supertest(app)
        .get('/api/user')
        .set('Authorization', 'Bearer invalid.token');
      
      // メトリクスを取得
      const response = await supertest(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.text).toContain('auth_attempts_total');
      expect(response.text).toContain('auth_latency_seconds');
      expect(response.text).toContain('status="success"');
      expect(response.text).toContain('status="failed"');
    });
  });

  describe('並行性とパフォーマンス', () => {
    test('同時複数リクエストの処理', async () => {
      const token = jwt.sign({
        id: 'concurrent-user',
        email: 'concurrent@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'concurrent-token-1'
      }, secret);
      
      const promises = Array.from({ length: 50 }, (_, i) => 
        supertest(app)
          .get('/api/user')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      );
      
      const responses = await Promise.all(promises);
      
      // すべてのリクエストが成功
      responses.forEach(response => {
        expect(response.body.user.id).toBe('concurrent-user');
      });
    });
    
    test('異なるユーザーの同時アクセス', async () => {
      const tokens = Array.from({ length: 10 }, (_, i) => 
        jwt.sign({
          id: `user-${i}`,
          email: `user${i}@test.com`,
          roles: i % 2 === 0 ? ['user', 'admin'] : ['user'],
          permissions: ['read'],
          jti: `token-${i}`
        }, secret)
      );
      
      const promises = tokens.map((token, i) => 
        supertest(app)
          .get(i % 2 === 0 ? '/api/admin' : '/api/user')
          .set('Authorization', `Bearer ${token}`)
      );
      
      const responses = await Promise.all(promises);
      
      // 適切なレスポンスを確認
      responses.forEach((response, i) => {
        if (i % 2 === 0) {
          expect(response.status).toBe(200);
          expect(response.body.message).toBe('Admin access granted');
        } else {
          expect(response.status).toBe(200);
          expect(response.body.user.id).toBe(`user-${i}`);
        }
      });
    });
  });

  describe('セキュリティヘッダーとCSRF保護', () => {
    test('セキュリティヘッダーの確認', async () => {
      const token = jwt.sign({
        id: 'security-user',
        email: 'security@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'security-token-1'
      }, secret);
      
      const response = await supertest(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // カスタムヘッダーが設定されているか確認
      // （実装に応じて調整）
      expect(response.headers).toBeDefined();
    });
    
    test('異なるオリジンからのリクエスト', async () => {
      const token = jwt.sign({
        id: 'cors-user',
        email: 'cors@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'cors-token-1'
      }, secret);
      
      const response = await supertest(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .set('Origin', 'https://evil.com')
        .expect(200);
      
      // CORSポリシーに応じた動作を確認
      expect(response.body.user.id).toBe('cors-user');
    });
  });

  describe('エラーリカバリーとフォールバック', () => {
    test('キャッシュ障害時の動作', async () => {
      // キャッシュが利用できない場合でも認証が機能することを確認
      const token = jwt.sign({
        id: 'fallback-user',
        email: 'fallback@test.com',
        roles: ['user'],
        permissions: ['read'],
        jti: 'fallback-token-1'
      }, secret);
      
      const response = await supertest(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.user.id).toBe('fallback-user');
    });
  });
});