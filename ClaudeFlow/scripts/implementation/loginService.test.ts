import { LoginService, IUserRepository, ITokenService, User, IRateLimiter } from './loginService';
import { PasswordService } from './passwordService';
import { InMemoryRateLimiter } from './rateLimiter';

// Mock implementations
class MockUserRepository implements IUserRepository {
  private users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return this.users.get(email) || null;
  }

  addUser(user: User): void {
    this.users.set(user.email, user);
  }

  clear(): void {
    this.users.clear();
  }
}

class MockTokenService implements ITokenService {
  private tokenCount = 0;

  async generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    this.tokenCount++;
    return {
      accessToken: `access_${user.id}_${this.tokenCount}`,
      refreshToken: `refresh_${user.id}_${this.tokenCount}`
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

// Success tests
async function testSuccessfulLogin() {
  console.log('テスト: 正常なログイン');
  
  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const user = await createTestUser('test@example.com', 'testPassword123', passwordService);
  userRepo.addUser(user);

  const result = await loginService.login({
    email: 'test@example.com',
    password: 'testPassword123'
  });

  console.log(result.success ? '✓ ログイン成功' : `✗ ログイン失敗: ${!result.success && 'error' in result ? result.error.message : ''}`);
}

async function testInvalidPassword() {
  console.log('\nテスト: 無効なパスワード');
  
  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const user = await createTestUser('test@example.com', 'correctPassword', passwordService);
  userRepo.addUser(user);

  const result = await loginService.login({
    email: 'test@example.com',
    password: 'wrongPassword'
  });

  console.log(!result.success && 'error' in result && result.error.code === 'AUTH_001' ? '✓ 正しくエラーを返しました' : '✗ 期待と異なる結果');
}

async function testUserNotFound() {
  console.log('\nテスト: 存在しないユーザー');
  
  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const result = await loginService.login({
    email: 'notfound@example.com',
    password: 'anyPassword123'
  });

  console.log(!result.success && 'error' in result && result.error.code === 'AUTH_001' ? '✓ 正しくエラーを返しました' : '✗ 期待と異なる結果');
}

async function testValidation() {
  console.log('\nテスト: バリデーションエラー');
  
  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Short password
  const result1 = await loginService.login({
    email: 'test@example.com',
    password: 'short'
  });

  console.log(!result1.success && 'error' in result1 && result1.error.code === 'VAL_001' ? '✓ パスワード長バリデーション' : '✗ 期待と異なる結果');

  // Invalid email
  const result2 = await loginService.login({
    email: 'invalid-email',
    password: 'validPassword123'
  });

  console.log(!result2.success && 'error' in result2 && result2.error.code === 'VAL_001' ? '✓ メール形式バリデーション' : '✗ 期待と異なる結果');
}

async function testRateLimiting() {
  console.log('\nテスト: レート制限');
  
  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const rateLimiter = new InMemoryRateLimiter(3, 1); // 3 attempts, 1 minute lockout
  const loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);

  const email = 'ratelimit@example.com';

  // Make 3 failed attempts
  for (let i = 1; i <= 3; i++) {
    const result = await loginService.login({ email, password: 'wrongPassword' });
    console.log(`  試行 ${i}: ${!result.success ? '✓' : '✗'}`);
  }

  // 4th attempt should be blocked
  const blockedResult = await loginService.login({ email, password: 'anyPassword' });
  console.log(!blockedResult.success && 'error' in blockedResult && blockedResult.error.code === 'RATE_001' ? '✓ レート制限が機能' : '✗ レート制限が機能していない');
}

async function testSuccessfulLoginResetsRateLimit() {
  console.log('\nテスト: 成功時のレート制限リセット');
  
  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const rateLimiter = new InMemoryRateLimiter(3, 1);
  const loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);

  const user = await createTestUser('reset@example.com', 'correctPassword', passwordService);
  userRepo.addUser(user);

  // Make 2 failed attempts
  await loginService.login({ email: 'reset@example.com', password: 'wrong' });
  await loginService.login({ email: 'reset@example.com', password: 'wrong' });

  // Successful login
  const successResult = await loginService.login({ 
    email: 'reset@example.com', 
    password: 'correctPassword' 
  });

  // Should be able to fail 3 more times
  for (let i = 0; i < 3; i++) {
    await loginService.login({ email: 'reset@example.com', password: 'wrong' });
  }
  
  const finalResult = await loginService.login({ email: 'reset@example.com', password: 'wrong' });
  
  console.log(successResult.success && !finalResult.success && 'error' in finalResult && finalResult.error.code === 'RATE_001' 
    ? '✓ 成功後にカウントがリセットされた' 
    : '✗ リセットが正しく動作していない');
}

async function testPasswordBoundaries() {
  console.log('\nテスト: パスワード境界値');
  
  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Min length (8)
  const user8 = await createTestUser('min@example.com', '12345678', passwordService);
  userRepo.addUser(user8);
  const min = await loginService.login({ email: 'min@example.com', password: '12345678' });
  console.log(min.success ? '✓ 8文字パスワード' : '✗ 8文字パスワード失敗');

  // Max length (128)
  const user128 = await createTestUser('max@example.com', 'a'.repeat(128), passwordService);
  userRepo.addUser(user128);
  const max = await loginService.login({ email: 'max@example.com', password: 'a'.repeat(128) });
  console.log(max.success ? '✓ 128文字パスワード' : '✗ 128文字パスワード失敗');

  // Too short (7)
  const short = await loginService.login({ email: 'test@example.com', password: '1234567' });
  console.log(!short.success && 'error' in short && short.error.code === 'VAL_001' ? '✓ 7文字パスワード拒否' : '✗ 7文字パスワード');

  // Too long (129)
  const long = await loginService.login({ email: 'test@example.com', password: 'a'.repeat(129) });
  console.log(!long.success && 'error' in long && long.error.code === 'VAL_001' ? '✓ 129文字パスワード拒否' : '✗ 129文字パスワード');
}

// Run all tests
async function runTests() {
  console.log('ログインサービステスト開始\n');
  console.log('=== 正常系テスト ===');
  
  try {
    await testSuccessfulLogin();
    
    console.log('\n=== 異常系テスト ===');
    await testInvalidPassword();
    await testUserNotFound();
    await testValidation();
    
    console.log('\n=== セキュリティテスト ===');
    await testRateLimiting();
    await testSuccessfulLoginResetsRateLimit();
    
    console.log('\n=== 境界値テスト ===');
    await testPasswordBoundaries();
    
    console.log('\nテスト完了');
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

if (require.main === module) {
  runTests();
}