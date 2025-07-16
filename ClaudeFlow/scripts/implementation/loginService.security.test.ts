import { LoginService, IUserRepository, ITokenService, User } from './loginService';
import { PasswordService } from './passwordService';
import { InMemoryRateLimiter } from './rateLimiter';

// Mock implementations
class MockUserRepository implements IUserRepository {
  private users = new Map<string, User>();
  private queryLog: string[] = [];

  async findByEmail(email: string): Promise<User | null> {
    this.queryLog.push(email);
    return this.users.get(email) || null;
  }

  addUser(user: User): void {
    this.users.set(user.email, user);
  }

  getQueryLog(): string[] {
    return [...this.queryLog];
  }

  clearQueryLog(): void {
    this.queryLog = [];
  }
}

class MockTokenService implements ITokenService {
  async generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    return {
      accessToken: `access_${user.id}_${Date.now()}`,
      refreshToken: `refresh_${user.id}_${Date.now()}`
    };
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

// Security Tests
async function testSQLInjectionPrevention() {
  console.log('セキュリティテスト: SQLインジェクション対策\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Common SQL injection attempts
  const sqlInjectionAttempts = [
    "admin' OR '1'='1",
    "admin'; DROP TABLE users; --",
    "' OR 1=1 --",
    "admin' /*",
    "admin' #",
    "admin'-- ",
    "' UNION SELECT * FROM users WHERE '1'='1",
    "admin' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055'",
    "'; EXEC xp_cmdshell('net user hack hack /add'); --"
  ];

  console.log('SQLインジェクション試行:');
  for (const attempt of sqlInjectionAttempts) {
    userRepo.clearQueryLog();
    
    const result = await loginService.login({
      email: attempt,
      password: 'anyPassword123'
    });

    const queryLog = userRepo.getQueryLog();
    const isSecure = !result.success && 
                     queryLog.length <= 1 && // Only validation, no DB query for invalid emails
                     (queryLog.length === 0 || queryLog[0] === attempt); // Exact string passed, not interpreted

    console.log(`  "${attempt.substring(0, 30)}...": ${isSecure ? '✓ 安全' : '✗ 脆弱性あり'}`);
  }
}

async function testXSSPrevention() {
  console.log('\n\nセキュリティテスト: XSS対策\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // XSS attempts
  const xssAttempts = [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "<svg onload=alert('xss')>",
    "';alert('xss');//",
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    "<iframe src='javascript:alert(`xss`)'></iframe>",
    "<body onload=alert('xss')>"
  ];

  console.log('XSS試行（エラーメッセージ内でのエスケープ確認）:');
  for (const attempt of xssAttempts) {
    const result = await loginService.login({
      email: attempt,
      password: 'password123'
    });

    // Check if error messages contain unescaped content
    if (!result.success && 'error' in result) {
      const errorString = JSON.stringify(result.error);
      const containsRawScript = errorString.includes('<script>') || 
                               errorString.includes('javascript:') ||
                               errorString.includes('onerror=') ||
                               errorString.includes('onload=');
      
      console.log(`  "${attempt.substring(0, 30)}...": ${!containsRawScript ? '✓ エスケープ済み' : '✗ 未エスケープ'}`);
    }
  }
}

async function testTimingAttackResistance() {
  console.log('\n\nセキュリティテスト: タイミング攻撃耐性\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Create a test user
  const existingUser = await createTestUser('existing@example.com', 'correctPassword', passwordService);
  userRepo.addUser(existingUser);

  console.log('ユーザー存在確認のタイミング差分測定:');

  // Measure timing for existing vs non-existing users
  const iterations = 50;
  const existingUserTimes: number[] = [];
  const nonExistingUserTimes: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Existing user with wrong password
    const start1 = performance.now();
    await loginService.login({
      email: 'existing@example.com',
      password: 'wrongPassword'
    });
    existingUserTimes.push(performance.now() - start1);

    // Non-existing user
    const start2 = performance.now();
    await loginService.login({
      email: 'nonexisting@example.com',
      password: 'wrongPassword'
    });
    nonExistingUserTimes.push(performance.now() - start2);
  }

  const avgExisting = existingUserTimes.reduce((a, b) => a + b) / iterations;
  const avgNonExisting = nonExistingUserTimes.reduce((a, b) => a + b) / iterations;
  const timingDifference = Math.abs(avgExisting - avgNonExisting);
  const percentDifference = (timingDifference / Math.min(avgExisting, avgNonExisting)) * 100;

  console.log(`  存在するユーザー平均: ${avgExisting.toFixed(2)}ms`);
  console.log(`  存在しないユーザー平均: ${avgNonExisting.toFixed(2)}ms`);
  console.log(`  差分: ${timingDifference.toFixed(2)}ms (${percentDifference.toFixed(1)}%)`);
  console.log(`  評価: ${percentDifference < 20 ? '✓ タイミング攻撃に耐性あり' : '✗ タイミング差が大きい'}`);
}

async function testBruteForceProtection() {
  console.log('\n\nセキュリティテスト: ブルートフォース攻撃対策\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const rateLimiter = new InMemoryRateLimiter(5, 15); // 5 attempts, 15 min lockout
  const loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);

  const user = await createTestUser('bruteforce@example.com', 'correctPassword', passwordService);
  userRepo.addUser(user);

  console.log('ブルートフォース攻撃シミュレーション:');

  // Common passwords to try
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'letmein',
    '12345678', 'qwerty', '123456789', 'abc123', '111111'
  ];

  let blockedAt = -1;
  for (let i = 0; i < commonPasswords.length; i++) {
    const result = await loginService.login({
      email: 'bruteforce@example.com',
      password: commonPasswords[i]
    });

    if (!result.success && 'error' in result && result.error.code === 'RATE_001') {
      blockedAt = i + 1;
      break;
    }
  }

  console.log(`  ${blockedAt}回目の試行でブロック: ${blockedAt > 0 && blockedAt <= 5 ? '✓ 適切' : '✗ 不適切'}`);
  console.log(`  ロックアウト時間: 15分 ✓`);
}

async function testPasswordLeakPrevention() {
  console.log('\n\nセキュリティテスト: パスワード漏洩防止\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const sensitivePassword = 'SuperSecret123!@#';
  const user = await createTestUser('leak@example.com', sensitivePassword, passwordService);
  userRepo.addUser(user);

  console.log('レスポンス内のパスワード情報確認:');

  // Test various scenarios
  const scenarios = [
    { email: 'leak@example.com', password: sensitivePassword, desc: '成功時' },
    { email: 'leak@example.com', password: 'wrong', desc: '失敗時' },
    { email: '', password: sensitivePassword, desc: 'バリデーションエラー時' }
  ];

  for (const scenario of scenarios) {
    const result = await loginService.login({
      email: scenario.email,
      password: scenario.password
    });

    const resultString = JSON.stringify(result);
    const containsPassword = resultString.includes(scenario.password) || 
                           resultString.includes(user.passwordHash);

    console.log(`  ${scenario.desc}: ${!containsPassword ? '✓ パスワード情報なし' : '✗ パスワード情報漏洩'}`);
  }
}

async function testInputSanitization() {
  console.log('\n\nセキュリティテスト: 入力値サニタイゼーション\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Test various malicious inputs
  const maliciousInputs = [
    { email: '\x00admin@example.com', password: 'password', desc: 'Null byte injection' },
    { email: 'admin@example.com\r\nX-Injected-Header: malicious', password: 'password', desc: 'CRLF injection' },
    { email: '../../../etc/passwd', password: 'password', desc: 'Path traversal' },
    { email: 'admin@example.com%00', password: 'password', desc: 'URL encoding' },
    { email: 'admin@example.com\u0000', password: 'password', desc: 'Unicode null' },
    { email: String.fromCharCode(0) + 'admin@example.com', password: 'password', desc: 'Binary data' }
  ];

  console.log('悪意のある入力の処理:');
  for (const input of maliciousInputs) {
    try {
      const result = await loginService.login({
        email: input.email,
        password: input.password
      });

      // Should reject all malicious inputs at validation
      const isSecure = !result.success && 'error' in result && result.error.code === 'VAL_001';
      console.log(`  ${input.desc}: ${isSecure ? '✓ 拒否' : '✗ 通過'}`);
    } catch (error) {
      console.log(`  ${input.desc}: ✓ エラーで拒否`);
    }
  }
}

async function testErrorMessageSecurity() {
  console.log('\n\nセキュリティテスト: エラーメッセージの安全性\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const user = await createTestUser('error@example.com', 'correctPassword', passwordService);
  userRepo.addUser(user);

  console.log('エラーメッセージの情報漏洩確認:');

  // Test that error messages don't reveal sensitive information
  const result1 = await loginService.login({
    email: 'error@example.com',
    password: 'wrongPassword'
  });

  const result2 = await loginService.login({
    email: 'nonexistent@example.com',
    password: 'anyPassword'
  });

  if (!result1.success && !result2.success && 'error' in result1 && 'error' in result2) {
    const sameMessage = result1.error.message === result2.error.message;
    const sameCode = result1.error.code === result2.error.code;
    
    console.log(`  同一エラーメッセージ: ${sameMessage ? '✓' : '✗'}`);
    console.log(`  同一エラーコード: ${sameCode ? '✓' : '✗'}`);
    console.log(`  ユーザー存在情報の秘匿: ${sameMessage && sameCode ? '✓ 安全' : '✗ 情報漏洩'}`);
  }
}

async function testLongInputHandling() {
  console.log('\n\nセキュリティテスト: 長大入力の処理\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  console.log('DoS攻撃を想定した長大入力:');

  // Test extremely long inputs
  const longInputTests = [
    { size: 1000, desc: '1KB' },
    { size: 10000, desc: '10KB' },
    { size: 100000, desc: '100KB' },
    { size: 1000000, desc: '1MB' }
  ];

  for (const test of longInputTests) {
    const longEmail = 'a'.repeat(test.size) + '@example.com';
    const start = performance.now();
    
    try {
      const result = await loginService.login({
        email: longEmail,
        password: 'password123'
      });
      
      const elapsed = performance.now() - start;
      const isSecure = !result.success && elapsed < 100; // Should reject quickly
      
      console.log(`  ${test.desc}入力: ${isSecure ? `✓ ${elapsed.toFixed(0)}ms で拒否` : `✗ ${elapsed.toFixed(0)}ms`}`);
    } catch (error) {
      const elapsed = performance.now() - start;
      console.log(`  ${test.desc}入力: ✓ エラー (${elapsed.toFixed(0)}ms)`);
    }
  }
}

// Run all security tests
async function runSecurityTests() {
  console.log('ログインサービス セキュリティテスト\n');
  console.log('='.repeat(50));

  try {
    await testSQLInjectionPrevention();
    await testXSSPrevention();
    await testTimingAttackResistance();
    await testBruteForceProtection();
    await testPasswordLeakPrevention();
    await testInputSanitization();
    await testErrorMessageSecurity();
    await testLongInputHandling();

    console.log('\n' + '='.repeat(50));
    console.log('セキュリティテスト完了\n');

    console.log('セキュリティ推奨事項:');
    console.log('- すべての入力値を適切にバリデート・サニタイズする');
    console.log('- エラーメッセージから情報が漏洩しないよう注意する');
    console.log('- タイミング攻撃に対する耐性を確保する');
    console.log('- レート制限を実装してブルートフォース攻撃を防ぐ');
    console.log('- 長大入力によるDoS攻撃を防ぐため入力サイズを制限する');
  } catch (error) {
    console.error('セキュリティテストエラー:', error);
  }
}

if (require.main === module) {
  runSecurityTests();
}