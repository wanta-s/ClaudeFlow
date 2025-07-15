import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/register/route';

describe('User Registration Performance Tests', () => {
  // パフォーマンス計測用のヘルパー関数
  const measurePerformance = async (fn: () => Promise<any>) => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    return {
      result,
      duration: endTime - startTime,
    };
  };

  // 統計情報を計算するヘルパー関数
  const calculateStats = (durations: number[]) => {
    const sorted = durations.sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = sum / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return { avg, median, p95, p99, min, max };
  };

  describe('レスポンスタイム測定', () => {
    it('単一リクエストの処理時間が100ms以内である', async () => {
      const userData = {
        email: 'perf-single@example.com',
        password: 'PerfPass123!',
        name: 'パフォーマンステスト',
      };

      const request = {
        json: async () => userData,
      } as NextRequest;

      const { duration } = await measurePerformance(() => POST(request));

      expect(duration).toBeLessThan(100);
    });

    it('100回の連続リクエストの平均処理時間が50ms以内である', async () => {
      const durations: number[] = [];

      for (let i = 0; i < 100; i++) {
        const userData = {
          email: `perf-avg-${i}@example.com`,
          password: 'PerfPass123!',
          name: `パフォーマンステスト${i}`,
        };

        const request = {
          json: async () => userData,
        } as NextRequest;

        const { duration } = await measurePerformance(() => POST(request));
        durations.push(duration);
      }

      const stats = calculateStats(durations);
      console.log('Performance Statistics:', stats);

      expect(stats.avg).toBeLessThan(50);
      expect(stats.p95).toBeLessThan(100);
      expect(stats.p99).toBeLessThan(150);
    });
  });

  describe('負荷テスト', () => {
    it('10件の同時リクエストを処理できる', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const userData = {
          email: `load-concurrent-${i}@example.com`,
          password: 'LoadPass123!',
          name: `負荷テスト${i}`,
        };

        const request = {
          json: async () => userData,
        } as NextRequest;

        return measurePerformance(() => POST(request));
      });

      const results = await Promise.all(promises);
      const durations = results.map(r => r.duration);
      const stats = calculateStats(durations);

      // 同時実行でも各リクエストが妥当な時間内に完了すること
      expect(stats.max).toBeLessThan(500);
      expect(stats.avg).toBeLessThan(200);
    });

    it('高頻度リクエスト（100req/秒）でも安定して動作する', async () => {
      const requestsPerSecond = 100;
      const durationSeconds = 1;
      const totalRequests = requestsPerSecond * durationSeconds;
      const interval = 1000 / requestsPerSecond;

      const durations: number[] = [];
      const errors: any[] = [];
      const startTime = Date.now();

      const sendRequest = async (index: number) => {
        const userData = {
          email: `high-freq-${index}@example.com`,
          password: 'HighFreqPass123!',
          name: `高頻度テスト${index}`,
        };

        const request = {
          json: async () => userData,
        } as NextRequest;

        try {
          const { duration } = await measurePerformance(() => POST(request));
          durations.push(duration);
        } catch (error) {
          errors.push(error);
        }
      };

      // リクエストを一定間隔で送信
      const promises: Promise<void>[] = [];
      for (let i = 0; i < totalRequests; i++) {
        await new Promise(resolve => setTimeout(resolve, interval));
        promises.push(sendRequest(i));
      }

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const stats = calculateStats(durations);
      const successRate = (durations.length / totalRequests) * 100;

      console.log('High Frequency Test Results:', {
        totalTime,
        totalRequests,
        successfulRequests: durations.length,
        failedRequests: errors.length,
        successRate,
        stats,
      });

      // 95%以上のリクエストが成功すること
      expect(successRate).toBeGreaterThan(95);
      // 平均レスポンスタイムが妥当であること
      expect(stats.avg).toBeLessThan(100);
    });
  });

  describe('メモリ使用量測定', () => {
    it('1000件の登録後もメモリリークが発生しない', async () => {
      // メモリ使用量の初期値を記録
      const initialMemory = process.memoryUsage();

      // 1000件のユーザー登録
      for (let i = 0; i < 1000; i++) {
        const userData = {
          email: `memory-test-${i}@example.com`,
          password: 'MemoryPass123!',
          name: `メモリテスト${i}`,
        };

        const request = {
          json: async () => userData,
        } as NextRequest;

        await POST(request);

        // 100件ごとにガベージコレクションを実行
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      // 最終的なメモリ使用量を記録
      const finalMemory = process.memoryUsage();

      // メモリ増加量を計算
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapIncreaseInMB = heapIncrease / 1024 / 1024;

      console.log('Memory Usage:', {
        initial: initialMemory.heapUsed / 1024 / 1024,
        final: finalMemory.heapUsed / 1024 / 1024,
        increase: heapIncreaseInMB,
      });

      // メモリ増加が妥当な範囲内であること（100MB以内）
      expect(heapIncreaseInMB).toBeLessThan(100);
    });
  });

  describe('データベース接続プール', () => {
    it('同時接続数が制限を超えてもエラーが発生しない', async () => {
      const maxConnections = 50;
      const promises = Array.from({ length: maxConnections }, (_, i) => {
        const userData = {
          email: `pool-test-${i}@example.com`,
          password: 'PoolPass123!',
          name: `プールテスト${i}`,
        };

        const request = {
          json: async () => userData,
        } as NextRequest;

        return POST(request);
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log('Connection Pool Test:', {
        total: maxConnections,
        successful,
        failed,
      });

      // すべてのリクエストが成功すること
      expect(successful).toBe(maxConnections);
      expect(failed).toBe(0);
    });
  });

  describe('キャッシュパフォーマンス', () => {
    it('重複メールチェックが効率的に実行される', async () => {
      const email = 'cache-test@example.com';
      
      // 初回登録
      const firstRequest = {
        json: async () => ({
          email,
          password: 'CachePass123!',
          name: 'キャッシュテスト',
        }),
      } as NextRequest;

      await POST(firstRequest);

      // 同じメールで100回リクエスト
      const durations: number[] = [];
      for (let i = 0; i < 100; i++) {
        const request = {
          json: async () => ({
            email,
            password: 'CachePass123!',
            name: `キャッシュテスト${i}`,
          }),
        } as NextRequest;

        const { duration } = await measurePerformance(() => POST(request));
        durations.push(duration);
      }

      const stats = calculateStats(durations);

      // 重複チェックが高速に実行されること
      expect(stats.avg).toBeLessThan(10);
      expect(stats.p95).toBeLessThan(20);
    });
  });

  describe('エラーハンドリングのパフォーマンス', () => {
    it('バリデーションエラーが高速に処理される', async () => {
      const invalidRequests = [
        { email: '', password: 'pass', name: 'test' },
        { email: 'invalid', password: '123', name: 'test' },
        { email: 'test@test.com', password: '', name: '' },
      ];

      const durations: number[] = [];
      for (const data of invalidRequests) {
        const request = {
          json: async () => data,
        } as NextRequest;

        const { duration } = await measurePerformance(() => POST(request));
        durations.push(duration);
      }

      const stats = calculateStats(durations);

      // バリデーションエラーが高速に返されること
      expect(stats.avg).toBeLessThan(5);
      expect(stats.max).toBeLessThan(10);
    });
  });

  describe('スケーラビリティテスト', () => {
    it('ユーザー数が増えても検索性能が劣化しない', async () => {
      // 事前に多数のユーザーを登録
      const baseUsers = 10000;
      console.log(`Creating ${baseUsers} base users...`);

      // バッチ処理で効率的に登録
      const batchSize = 100;
      for (let batch = 0; batch < baseUsers / batchSize; batch++) {
        const promises = Array.from({ length: batchSize }, (_, i) => {
          const index = batch * batchSize + i;
          const userData = {
            email: `scale-base-${index}@example.com`,
            password: 'ScalePass123!',
            name: `スケールテスト${index}`,
          };

          const request = {
            json: async () => userData,
          } as NextRequest;

          return POST(request);
        });

        await Promise.all(promises);
      }

      // 新規登録のパフォーマンスを測定
      const testDurations: number[] = [];
      for (let i = 0; i < 10; i++) {
        const userData = {
          email: `scale-test-${i}@example.com`,
          password: 'ScaleTestPass123!',
          name: `スケール検証${i}`,
        };

        const request = {
          json: async () => userData,
        } as NextRequest;

        const { duration } = await measurePerformance(() => POST(request));
        testDurations.push(duration);
      }

      const stats = calculateStats(testDurations);

      // 大量のユーザーが存在しても新規登録が高速であること
      expect(stats.avg).toBeLessThan(100);
      expect(stats.p95).toBeLessThan(200);
    });
  });
});