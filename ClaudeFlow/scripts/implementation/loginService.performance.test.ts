import { LoginService, IUserRepository, ITokenService, User } from './loginService';
import { PasswordService } from './passwordService';
import { InMemoryRateLimiter } from './rateLimiter';

// Performance test implementations
class PerformanceUserRepository implements IUserRepository {
  private users = new Map<string, User>();
  private queryCount = 0;
  private totalQueryTime = 0;

  async findByEmail(email: string): Promise<User | null> {
    const start = performance.now();
    this.queryCount++;
    
    // Simulate database query delay (1-5ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 4 + 1));
    
    const user = this.users.get(email) || null;
    this.totalQueryTime += performance.now() - start;
    
    return user;
  }

  addUser(user: User): void {
    this.users.set(user.email, user);
  }

  getStats() {
    return {
      queryCount: this.queryCount,
      avgQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      totalQueryTime: this.totalQueryTime
    };
  }

  resetStats() {
    this.queryCount = 0;
    this.totalQueryTime = 0;
  }
}

class PerformanceTokenService implements ITokenService {
  private tokenCount = 0;
  private totalGenerationTime = 0;

  async generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const start = performance.now();
    this.tokenCount++;
    
    // Simulate JWT generation (2-5ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3 + 2));
    
    const tokens = {
      accessToken: `access_${user.id}_${this.tokenCount}_${Date.now()}`,
      refreshToken: `refresh_${user.id}_${this.tokenCount}_${Date.now()}`
    };
    
    this.totalGenerationTime += performance.now() - start;
    return tokens;
  }

  getStats() {
    return {
      tokenCount: this.tokenCount,
      avgGenerationTime: this.tokenCount > 0 ? this.totalGenerationTime / this.tokenCount : 0,
      totalGenerationTime: this.totalGenerationTime
    };
  }

  resetStats() {
    this.tokenCount = 0;
    this.totalGenerationTime = 0;
  }
}

// Test helpers
const createTestUser = async (email: string, password: string, passwordService: PasswordService): Promise<User> => ({
  id: `user_${email}`,
  email,
  name: 'Test User',
  passwordHash: await passwordService.hash(password),
  createdAt: new Date()
});

async function measurePerformance<T>(
  operation: () => Promise<T>,
  iterations: number
): Promise<{
  results: T[];
  metrics: {
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}> {
  const times: number[] = [];
  const results: T[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = await operation();
    const elapsed = performance.now() - start;
    
    times.push(elapsed);
    results.push(result);
  }

  times.sort((a, b) => a - b);
  
  return {
    results,
    metrics: {
      totalTime: times.reduce((a, b) => a + b, 0),
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p50: times[Math.floor(times.length * 0.5)],
      p90: times[Math.floor(times.length * 0.9)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)]
    }
  };
}

// Performance Tests
async function testLoginPerformance() {
  console.log('パフォーマンステスト: ログイン処理速度\n');

  const userRepo = new PerformanceUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new PerformanceTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Create test user
  const user = await createTestUser('perf@example.com', 'testPassword123', passwordService);
  userRepo.addUser(user);

  console.log('成功ログインのパフォーマンス (100回):');
  const successPerf = await measurePerformance(
    () => loginService.login({ email: 'perf@example.com', password: 'testPassword123' }),
    100
  );

  console.log(`  平均時間: ${successPerf.metrics.avgTime.toFixed(2)}ms`);
  console.log(`  最小時間: ${successPerf.metrics.minTime.toFixed(2)}ms`);
  console.log(`  最大時間: ${successPerf.metrics.maxTime.toFixed(2)}ms`);
  console.log(`  P50: ${successPerf.metrics.p50.toFixed(2)}ms`);
  console.log(`  P90: ${successPerf.metrics.p90.toFixed(2)}ms`);
  console.log(`  P95: ${successPerf.metrics.p95.toFixed(2)}ms`);
  console.log(`  P99: ${successPerf.metrics.p99.toFixed(2)}ms`);

  const dbStats = userRepo.getStats();
  const tokenStats = tokenService.getStats();
  console.log(`\n  DB平均クエリ時間: ${dbStats.avgQueryTime.toFixed(2)}ms`);
  console.log(`  トークン平均生成時間: ${tokenStats.avgGenerationTime.toFixed(2)}ms`);
}

async function testValidationPerformance() {
  console.log('\n\nパフォーマンステスト: バリデーション処理速度\n');

  const userRepo = new PerformanceUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new PerformanceTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  console.log('バリデーションエラーのパフォーマンス (1000回):');
  const validationPerf = await measurePerformance(
    () => loginService.login({ email: 'invalid-email', password: '123' }),
    1000
  );

  console.log(`  平均時間: ${validationPerf.metrics.avgTime.toFixed(2)}ms`);
  console.log(`  最小時間: ${validationPerf.metrics.minTime.toFixed(2)}ms`);
  console.log(`  最大時間: ${validationPerf.metrics.maxTime.toFixed(2)}ms`);
  console.log(`  P95: ${validationPerf.metrics.p95.toFixed(2)}ms`);
  console.log(`  P99: ${validationPerf.metrics.p99.toFixed(2)}ms`);
}

async function testRateLimiterPerformance() {
  console.log('\n\nパフォーマンステスト: レート制限チェック\n');

  const userRepo = new PerformanceUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new PerformanceTokenService();
  const rateLimiter = new InMemoryRateLimiter(5, 15);
  const loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);

  // Test rate limiter with many different IPs
  console.log('レート制限チェック (1000個の異なるIP):');
  const rateLimitPerf = await measurePerformance(
    async () => {
      const email = `user${Math.random()}@example.com`;
      return loginService.login({ email, password: 'wrongPassword' });
    },
    1000
  );

  console.log(`  平均時間: ${rateLimitPerf.metrics.avgTime.toFixed(2)}ms`);
  console.log(`  最小時間: ${rateLimitPerf.metrics.minTime.toFixed(2)}ms`);
  console.log(`  最大時間: ${rateLimitPerf.metrics.maxTime.toFixed(2)}ms`);
  console.log(`  P95: ${rateLimitPerf.metrics.p95.toFixed(2)}ms`);
  console.log(`  P99: ${rateLimitPerf.metrics.p99.toFixed(2)}ms`);
}

async function testConcurrentPerformance() {
  console.log('\n\nパフォーマンステスト: 並行処理\n');

  const userRepo = new PerformanceUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new PerformanceTokenService();
  const rateLimiter = new InMemoryRateLimiter(100, 15); // Higher limit for concurrent test
  const loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);

  // Create multiple test users
  for (let i = 0; i < 10; i++) {
    const user = await createTestUser(`concurrent${i}@example.com`, 'testPassword123', passwordService);
    userRepo.addUser(user);
  }

  console.log('並行ログイン処理 (100リクエスト同時):');
  const start = performance.now();
  
  const promises = Array(100).fill(null).map((_, i) => 
    loginService.login({
      email: `concurrent${i % 10}@example.com`,
      password: 'testPassword123'
    })
  );

  const results = await Promise.all(promises);
  const elapsed = performance.now() - start;

  const successCount = results.filter(r => r.success).length;
  console.log(`  総処理時間: ${elapsed.toFixed(2)}ms`);
  console.log(`  成功数: ${successCount}/100`);
  console.log(`  平均処理時間: ${(elapsed / 100).toFixed(2)}ms/request`);
  console.log(`  スループット: ${(100 / (elapsed / 1000)).toFixed(2)} requests/second`);
}

async function testPasswordHashingImpact() {
  console.log('\n\nパフォーマンステスト: パスワードハッシュ検証の影響\n');

  const userRepo = new PerformanceUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new PerformanceTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Create user with varying password complexity
  const simpleUser = await createTestUser('simple@example.com', '12345678', passwordService);
  const complexUser = await createTestUser('complex@example.com', 'C0mpl3x!P@ssw0rd#2024$', passwordService);
  userRepo.addUser(simpleUser);
  userRepo.addUser(complexUser);

  console.log('シンプルパスワード検証 (50回):');
  const simplePerf = await measurePerformance(
    () => loginService.login({ email: 'simple@example.com', password: '12345678' }),
    50
  );
  console.log(`  平均時間: ${simplePerf.metrics.avgTime.toFixed(2)}ms`);

  console.log('\n複雑なパスワード検証 (50回):');
  const complexPerf = await measurePerformance(
    () => loginService.login({ email: 'complex@example.com', password: 'C0mpl3x!P@ssw0rd#2024$' }),
    50
  );
  console.log(`  平均時間: ${complexPerf.metrics.avgTime.toFixed(2)}ms`);
  
  const difference = ((complexPerf.metrics.avgTime - simplePerf.metrics.avgTime) / simplePerf.metrics.avgTime) * 100;
  console.log(`  差分: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}%`);
}

async function testMemoryUsage() {
  console.log('\n\nパフォーマンステスト: メモリ使用量\n');

  const userRepo = new PerformanceUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new PerformanceTokenService();
  const rateLimiter = new InMemoryRateLimiter(5, 15);
  const loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);

  // Create many users
  console.log('大量ユーザー作成 (1000ユーザー):');
  const memBefore = process.memoryUsage();
  
  for (let i = 0; i < 1000; i++) {
    const user = await createTestUser(`user${i}@example.com`, 'testPassword123', passwordService);
    userRepo.addUser(user);
  }

  const memAfter = process.memoryUsage();
  const heapUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
  console.log(`  ヒープ使用量増加: ${heapUsed.toFixed(2)} MB`);
  console.log(`  ユーザーあたり: ${((heapUsed * 1024) / 1000).toFixed(2)} KB`);

  // Test with many failed login attempts (rate limiter memory)
  console.log('\nレート制限メモリ使用量 (1000個の異なるIP):');
  const rateLimitMemBefore = process.memoryUsage();
  
  for (let i = 0; i < 1000; i++) {
    await loginService.login({ email: `attacker${i}@example.com`, password: 'wrong' });
  }

  const rateLimitMemAfter = process.memoryUsage();
  const rateLimitHeapUsed = (rateLimitMemAfter.heapUsed - rateLimitMemBefore.heapUsed) / 1024 / 1024;
  console.log(`  ヒープ使用量増加: ${rateLimitHeapUsed.toFixed(2)} MB`);
  console.log(`  IPあたり: ${((rateLimitHeapUsed * 1024) / 1000).toFixed(2)} KB`);
}

// Run all performance tests
async function runPerformanceTests() {
  console.log('ログインサービス パフォーマンステスト\n');
  console.log('='.repeat(50));

  try {
    await testLoginPerformance();
    await testValidationPerformance();
    await testRateLimiterPerformance();
    await testConcurrentPerformance();
    await testPasswordHashingImpact();
    await testMemoryUsage();

    console.log('\n' + '='.repeat(50));
    console.log('パフォーマンステスト完了\n');

    console.log('推奨事項:');
    console.log('- ログイン処理は平均10ms以内を目標とする');
    console.log('- バリデーション処理は1ms以内を維持する');
    console.log('- 並行処理時は100 req/s以上のスループットを確保する');
    console.log('- メモリ使用量はユーザー数に対して線形増加を維持する');
  } catch (error) {
    console.error('パフォーマンステストエラー:', error);
  }
}

if (require.main === module) {
  runPerformanceTests();
}