import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as cluster from 'cluster';
import * as os from 'os';
import { performance } from 'perf_hooks';
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

// 負荷テスト用の設定
const STRESS_TEST_CONFIG = {
  CONCURRENT_USERS: 10000,
  REQUESTS_PER_USER: 100,
  TOKEN_VARIATIONS: 1000,
  CACHE_SIZE_LIMIT: 10000,
  TEST_DURATION_MS: 60000, // 1分間
  MEMORY_LIMIT_MB: 512,
  CPU_CORES: os.cpus().length
};

// パフォーマンス統計
interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  memoryUsedMB: number;
  cpuUsagePercent: number;
  cacheHitRate: number;
  errorRate: number;
}

// 分散キャッシュのシミュレーション
class DistributedCache implements TokenCache {
  private shards: Map<string, UserPayload>[] = [];
  private shardCount: number;
  private hits = 0;
  private misses = 0;
  
  constructor(shardCount: number = 4) {
    this.shardCount = shardCount;
    for (let i = 0; i < shardCount; i++) {
      this.shards.push(new Map());
    }
  }
  
  private getShard(key: string): Map<string, UserPayload> {
    const hash = this.hashCode(key);
    const shardIndex = Math.abs(hash) % this.shardCount;
    return this.shards[shardIndex];
  }
  
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
  
  async get(token: string): Promise<UserPayload | null> {
    const shard = this.getShard(token);
    const result = shard.get(token) || null;
    if (result) {
      this.hits++;
    } else {
      this.misses++;
    }
    return result;
  }
  
  async set(token: string, payload: UserPayload, ttl?: number): Promise<void> {
    const shard = this.getShard(token);
    
    // LRU eviction if shard is too large
    if (shard.size >= STRESS_TEST_CONFIG.CACHE_SIZE_LIMIT / this.shardCount) {
      const firstKey = shard.keys().next().value;
      if (firstKey) {
        shard.delete(firstKey);
      }
    }
    
    shard.set(token, payload);
    
    // TTL implementation
    if (ttl) {
      setTimeout(() => {
        shard.delete(token);
      }, ttl * 1000);
    }
  }
  
  async invalidate(token: string): Promise<void> {
    const shard = this.getShard(token);
    shard.delete(token);
  }
  
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
  
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      totalSize: this.shards.reduce((sum, shard) => sum + shard.size, 0),
      shardSizes: this.shards.map(shard => shard.size)
    };
  }
}

// メトリクス収集の高度な実装
class AdvancedMetricsCollector implements MetricsCollector {
  private responseTimes: number[] = [];
  private authAttempts = { success: 0, failed: 0 };
  private errorTypes = new Map<AuthErrorType, number>();
  private startTime = Date.now();
  
  recordAuthAttempt(success: boolean, errorType?: AuthErrorType): void {
    if (success) {
      this.authAttempts.success++;
    } else {
      this.authAttempts.failed++;
      if (errorType) {
        this.errorTypes.set(errorType, (this.errorTypes.get(errorType) || 0) + 1);
      }
    }
  }
  
  recordLatency(duration: number): void {
    this.responseTimes.push(duration);
  }
  
  getStats(): PerformanceStats {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const totalRequests = this.responseTimes.length;
    const duration = (Date.now() - this.startTime) / 1000; // seconds
    
    return {
      totalRequests,
      successfulRequests: this.authAttempts.success,
      failedRequests: this.authAttempts.failed,
      avgResponseTime: totalRequests > 0 
        ? this.responseTimes.reduce((a, b) => a + b, 0) / totalRequests 
        : 0,
      minResponseTime: sortedTimes[0] || 0,
      maxResponseTime: sortedTimes[sortedTimes.length - 1] || 0,
      p50ResponseTime: this.getPercentile(sortedTimes, 50),
      p95ResponseTime: this.getPercentile(sortedTimes, 95),
      p99ResponseTime: this.getPercentile(sortedTimes, 99),
      requestsPerSecond: duration > 0 ? totalRequests / duration : 0,
      memoryUsedMB: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsagePercent: process.cpuUsage().user / 1000000, // microseconds to seconds
      cacheHitRate: 0, // Will be set externally
      errorRate: totalRequests > 0 ? this.authAttempts.failed / totalRequests : 0
    };
  }
  
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index];
  }
  
  getErrorBreakdown() {
    return Object.fromEntries(this.errorTypes);
  }
}

describe('ストレステストとロードテスト', () => {
  const secret = 'stress-test-secret';
  let distributedCache: DistributedCache;
  let metricsCollector: AdvancedMetricsCollector;
  
  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    distributedCache = new DistributedCache(4);
    metricsCollector = new AdvancedMetricsCollector();
  });
  
  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('大規模並行アクセステスト', async () => {
    const middleware = createAuthMiddleware({
      tokenCache: distributedCache,
      metricsCollector,
      maxTokenLength: 5000
    });
    
    // 様々なトークンを生成
    const tokens: string[] = [];
    for (let i = 0; i < STRESS_TEST_CONFIG.TOKEN_VARIATIONS; i++) {
      const payload: UserPayload = {
        id: `user-${i}`,
        email: `user${i}@example.com`,
        roles: i % 2 === 0 ? ['user'] : ['user', 'admin'],
        permissions: i % 3 === 0 ? ['read'] : ['read', 'write'],
        jti: `token-${i}`
      };
      tokens.push(jwt.sign(payload, secret));
    }
    
    // 無効なトークンも混ぜる
    const invalidTokens = [
      'invalid.token.here',
      jwt.sign({ id: 'expired' }, secret, { expiresIn: '-1h' }),
      jwt.sign({ id: 'wrong-secret' }, 'wrong-secret'),
      'Bearer ' + 'x'.repeat(6000), // 長すぎるトークン
    ];
    
    const allTokens = [...tokens, ...invalidTokens];
    
    // 並行リクエストのシミュレーション
    const startTime = performance.now();
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < STRESS_TEST_CONFIG.CONCURRENT_USERS; i++) {
      promises.push((async () => {
        for (let j = 0; j < 10; j++) { // 各ユーザー10リクエスト
          const tokenIndex = Math.floor(Math.random() * allTokens.length);
          const token = allTokens[tokenIndex];
          
          const reqStartTime = performance.now();
          const req = {
            headers: { authorization: `Bearer ${token}` },
            ip: `192.168.1.${i % 255}`,
            path: '/api/test',
            method: 'GET',
            get: (name: string) => req.headers[name as keyof typeof req.headers]
          } as Request;
          
          const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
            headersSent: false
          } as unknown as Response;
          
          const next = jest.fn();
          
          try {
            await middleware(req, res, next);
            const duration = performance.now() - reqStartTime;
            metricsCollector.recordLatency(duration);
          } catch (error) {
            // エラーも記録
            const duration = performance.now() - reqStartTime;
            metricsCollector.recordLatency(duration);
          }
        }
      })());
      
      // バッチ処理で負荷を分散
      if (promises.length >= 100) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    
    // 残りのリクエストを処理
    await Promise.all(promises);
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    // 統計情報を取得
    const stats = metricsCollector.getStats();
    stats.cacheHitRate = distributedCache.getHitRate();
    
    // パフォーマンス基準の検証
    expect(stats.avgResponseTime).toBeLessThan(10); // 平均10ms未満
    expect(stats.p95ResponseTime).toBeLessThan(50); // 95パーセンタイル50ms未満
    expect(stats.p99ResponseTime).toBeLessThan(100); // 99パーセンタイル100ms未満
    expect(stats.requestsPerSecond).toBeGreaterThan(1000); // 1000 RPS以上
    expect(stats.cacheHitRate).toBeGreaterThan(0.7); // 70%以上のキャッシュヒット率
    expect(stats.errorRate).toBeLessThan(0.1); // エラー率10%未満
    
    // メモリ使用量の確認
    expect(stats.memoryUsedMB).toBeLessThan(STRESS_TEST_CONFIG.MEMORY_LIMIT_MB);
    
    // キャッシュの統計
    const cacheStats = distributedCache.getStats();
    expect(cacheStats.totalSize).toBeGreaterThan(0);
    expect(cacheStats.shardSizes.every(size => size <= STRESS_TEST_CONFIG.CACHE_SIZE_LIMIT / 4)).toBe(true);
    
    console.log('Performance Stats:', stats);
    console.log('Cache Stats:', cacheStats);
    console.log('Error Breakdown:', metricsCollector.getErrorBreakdown());
  });

  test('メモリリーク検出テスト', async () => {
    const middleware = createAuthMiddleware({
      tokenCache: distributedCache,
      metricsCollector
    });
    
    // 初期メモリ使用量
    if (global.gc) {
      global.gc();
    }
    const initialMemory = process.memoryUsage();
    
    // 長時間実行のシミュレーション
    const iterations = 10000;
    const batchSize = 100;
    
    for (let batch = 0; batch < iterations / batchSize; batch++) {
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < batchSize; i++) {
        const payload: UserPayload = {
          id: `user-${batch}-${i}`,
          email: `user${batch}${i}@example.com`,
          roles: ['user'],
          permissions: ['read'],
          jti: `token-${batch}-${i}`,
          // 大きなペイロードでメモリ使用を増やす
          metadata: {
            data: 'x'.repeat(1000),
            timestamp: Date.now(),
            random: Math.random()
          }
        };
        
        const token = jwt.sign(payload, secret);
        
        promises.push((async () => {
          const req = {
            headers: { authorization: `Bearer ${token}` },
            get: (name: string) => req.headers[name as keyof typeof req.headers]
          } as Request;
          
          const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis()
          } as unknown as Response;
          
          await middleware(req, res, jest.fn());
        })());
      }
      
      await Promise.all(promises);
      
      // 定期的にガベージコレクション
      if (batch % 10 === 0 && global.gc) {
        global.gc();
      }
    }
    
    // 最終メモリ使用量
    if (global.gc) {
      global.gc();
    }
    const finalMemory = process.memoryUsage();
    
    // メモリリークのチェック
    const memoryGrowth = {
      heapUsed: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
      heapTotal: (finalMemory.heapTotal - initialMemory.heapTotal) / 1024 / 1024,
      external: (finalMemory.external - initialMemory.external) / 1024 / 1024,
      arrayBuffers: (finalMemory.arrayBuffers - initialMemory.arrayBuffers) / 1024 / 1024
    };
    
    console.log('Memory Growth (MB):', memoryGrowth);
    
    // 許容可能なメモリ増加量（100MB未満）
    expect(memoryGrowth.heapUsed).toBeLessThan(100);
    expect(memoryGrowth.heapTotal).toBeLessThan(200);
  });

  test('CPUバウンドシナリオのテスト', async () => {
    // CPU集約的なペイロード検証
    const cpuIntensiveValidator = async (user: UserPayload): Promise<boolean> => {
      // 意図的にCPUを使う処理
      let result = 0;
      for (let i = 0; i < 10000; i++) {
        result += Math.sqrt(i) * Math.sin(i);
      }
      return result > 0;
    };
    
    const middleware = createAuthMiddleware({
      userValidator: cpuIntensiveValidator,
      metricsCollector
    });
    
    const token = jwt.sign({
      id: 'cpu-test',
      email: 'cpu@test.com',
      roles: ['user'],
      permissions: ['read'],
      jti: 'cpu-token'
    }, secret);
    
    const cpuBefore = process.cpuUsage();
    const startTime = performance.now();
    
    // 並行CPUバウンドリクエスト
    const promises: Promise<void>[] = [];
    const concurrentRequests = 50;
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push((async () => {
        const req = {
          headers: { authorization: `Bearer ${token}` },
          get: (name: string) => req.headers[name as keyof typeof req.headers]
        } as Request;
        
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
          setHeader: jest.fn().mockReturnThis()
        } as unknown as Response;
        
        await middleware(req, res, jest.fn());
      })());
    }
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const cpuAfter = process.cpuUsage(cpuBefore);
    
    const stats = {
      totalTimeMs: endTime - startTime,
      cpuUserMs: cpuAfter.user / 1000,
      cpuSystemMs: cpuAfter.system / 1000,
      cpuTotalMs: (cpuAfter.user + cpuAfter.system) / 1000,
      cpuUtilization: ((cpuAfter.user + cpuAfter.system) / 1000) / (endTime - startTime)
    };
    
    console.log('CPU Bound Test Stats:', stats);
    
    // CPU使用率が適切な範囲内
    expect(stats.cpuUtilization).toBeLessThan(STRESS_TEST_CONFIG.CPU_CORES);
    expect(stats.totalTimeMs / concurrentRequests).toBeLessThan(100); // 平均100ms未満
  });

  test('ネットワーク遅延シミュレーション', async () => {
    // ネットワーク遅延をシミュレートするキャッシュ
    class NetworkDelayCache implements TokenCache {
      private cache = new Map<string, UserPayload>();
      private minDelay = 10;
      private maxDelay = 100;
      
      private async simulateNetworkDelay(): Promise<void> {
        const delay = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      async get(token: string): Promise<UserPayload | null> {
        await this.simulateNetworkDelay();
        return this.cache.get(token) || null;
      }
      
      async set(token: string, payload: UserPayload): Promise<void> {
        await this.simulateNetworkDelay();
        this.cache.set(token, payload);
      }
      
      async invalidate(token: string): Promise<void> {
        await this.simulateNetworkDelay();
        this.cache.delete(token);
      }
    }
    
    const networkCache = new NetworkDelayCache();
    const middleware = createAuthMiddleware({
      tokenCache: networkCache,
      metricsCollector
    });
    
    const tokens: string[] = [];
    for (let i = 0; i < 10; i++) {
      tokens.push(jwt.sign({
        id: `network-user-${i}`,
        email: `network${i}@test.com`,
        roles: ['user'],
        permissions: ['read'],
        jti: `network-token-${i}`
      }, secret));
    }
    
    const startTime = performance.now();
    const promises: Promise<void>[] = [];
    
    // 並行リクエストでネットワーク遅延の影響を測定
    for (let i = 0; i < 100; i++) {
      const token = tokens[i % tokens.length];
      
      promises.push((async () => {
        const reqStart = performance.now();
        const req = {
          headers: { authorization: `Bearer ${token}` },
          get: (name: string) => req.headers[name as keyof typeof req.headers]
        } as Request;
        
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
          setHeader: jest.fn().mockReturnThis()
        } as unknown as Response;
        
        await middleware(req, res, jest.fn());
        
        const duration = performance.now() - reqStart;
        metricsCollector.recordLatency(duration);
      })());
    }
    
    await Promise.all(promises);
    
    const totalTime = performance.now() - startTime;
    const stats = metricsCollector.getStats();
    
    console.log('Network Delay Test Stats:', {
      totalTimeMs: totalTime,
      avgResponseTime: stats.avgResponseTime,
      p95ResponseTime: stats.p95ResponseTime,
      p99ResponseTime: stats.p99ResponseTime
    });
    
    // ネットワーク遅延があっても性能基準を満たす
    expect(stats.avgResponseTime).toBeLessThan(200); // 平均200ms未満
    expect(stats.p99ResponseTime).toBeLessThan(500); // 99パーセンタイル500ms未満
  });
});