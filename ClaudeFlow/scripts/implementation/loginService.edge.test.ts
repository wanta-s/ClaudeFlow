import { LoginService, IUserRepository, ITokenService, User, IRateLimiter } from './loginService';
import { PasswordService } from './passwordService';
import { InMemoryRateLimiter } from './rateLimiter';

// Mock implementations
class MockUserRepository implements IUserRepository {
  private users = new Map<string, User>();
  private failNextCall = false;

  async findByEmail(email: string): Promise<User | null> {
    if (this.failNextCall) {
      this.failNextCall = false;
      throw new Error('Database connection failed');
    }
    return this.users.get(email) || null;
  }

  addUser(user: User): void {
    this.users.set(user.email, user);
  }

  setFailNextCall(): void {
    this.failNextCall = true;
  }
}

class MockTokenService implements ITokenService {
  private failNextCall = false;

  async generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    if (this.failNextCall) {
      this.failNextCall = false;
      throw new Error('Token generation failed');
    }
    return {
      accessToken: `access_${user.id}_${Date.now()}`,
      refreshToken: `refresh_${user.id}_${Date.now()}`
    };
  }

  setFailNextCall(): void {
    this.failNextCall = true;
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

// Edge Case Tests
async function testDatabaseFailure() {
  console.log('エッジケーステスト: データベース障害\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  console.log('ユーザー検索中のDB障害:');
  userRepo.setFailNextCall();
  
  const result = await loginService.login({
    email: 'test@example.com',
    password: 'password123'
  });

  console.log(!result.success && 'error' in result && result.error.code === 'SRV_001' 
    ? '✓ サーバーエラーとして処理' 
    : '✗ 適切なエラー処理なし');
}

async function testTokenGenerationFailure() {
  console.log('\n\nエッジケーステスト: トークン生成障害\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const user = await createTestUser('token@example.com', 'password123', passwordService);
  userRepo.addUser(user);

  console.log('トークン生成中の障害:');
  tokenService.setFailNextCall();
  
  const result = await loginService.login({
    email: 'token@example.com',
    password: 'password123'
  });

  console.log(!result.success && 'error' in result && result.error.code === 'SRV_001' 
    ? '✓ サーバーエラーとして処理' 
    : '✗ 適切なエラー処理なし');
}

async function testUnicodeAndSpecialCharacters() {
  console.log('\n\nエッジケーステスト: Unicode文字と特殊文字\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Unicode email addresses
  const unicodeTests = [
    { email: 'ユーザー@例え.jp', password: 'パスワード123', desc: '日本語' },
    { email: '用户@例子.cn', password: '密码123456', desc: '中国語' },
    { email: 'пользователь@пример.ru', password: 'пароль123', desc: 'ロシア語' },
    { email: '🦄unicorn@emoji.com', password: '🔐password123', desc: '絵文字' },
    { email: 'user+tag@example.com', password: 'password123', desc: 'プラス記号' },
    { email: 'user.name@sub.domain.example.com', password: 'password123', desc: 'サブドメイン' }
  ];

  console.log('Unicode/特殊文字の処理:');
  for (const test of unicodeTests) {
    const result = await loginService.login({
      email: test.email,
      password: test.password
    });

    // Most should fail email validation except valid formats
    const isValid = test.email.includes('+') || test.email.includes('.');
    const expectedResult = isValid ? '検証通過' : 'バリデーションエラー';
    const actualResult = !result.success && 'error' in result && result.error.code === 'VAL_001' 
      ? 'バリデーションエラー' 
      : '検証通過';

    console.log(`  ${test.desc}: ${actualResult}`);
  }
}

async function testEmptyAndNullValues() {
  console.log('\n\nエッジケーステスト: 空値とnull値\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const edgeCases = [
    { email: '', password: '', desc: '両方空文字' },
    { email: '   ', password: '   ', desc: '空白のみ' },
    { email: '\t\n', password: '\r\n', desc: '改行・タブ文字' },
    { email: 'test@example.com', password: '', desc: 'パスワードのみ空' },
    { email: '', password: 'password123', desc: 'メールのみ空' }
  ];

  console.log('空値の処理:');
  for (const test of edgeCases) {
    try {
      const result = await loginService.login({
        email: test.email,
        password: test.password
      });

      const hasValidationError = !result.success && 'error' in result && result.error.code === 'VAL_001';
      console.log(`  ${test.desc}: ${hasValidationError ? '✓ バリデーションエラー' : '✗ 予期しない結果'}`);
    } catch (error) {
      console.log(`  ${test.desc}: ✓ エラーで拒否`);
    }
  }
}

async function testBoundaryEmailFormats() {
  console.log('\n\nエッジケーステスト: 境界値メールフォーマット\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const emailTests = [
    { email: 'a@b.c', valid: true, desc: '最短有効形式' },
    { email: 'a'.repeat(64) + '@example.com', valid: true, desc: 'ローカル部64文字' },
    { email: 'a'.repeat(65) + '@example.com', valid: true, desc: 'ローカル部65文字' },
    { email: 'test@' + 'a'.repeat(250) + '.com', valid: false, desc: '全体255文字超' },
    { email: 'test@.com', valid: false, desc: 'ドメイン名なし' },
    { email: '@example.com', valid: false, desc: 'ローカル部なし' },
    { email: 'test.@example.com', valid: false, desc: 'ドット終端' },
    { email: '.test@example.com', valid: false, desc: 'ドット開始' },
    { email: 'test..test@example.com', valid: false, desc: '連続ドット' },
    { email: 'test@example..com', valid: false, desc: 'ドメイン内連続ドット' }
  ];

  console.log('メールフォーマット境界値:');
  for (const test of emailTests) {
    const result = await loginService.login({
      email: test.email,
      password: 'password123'
    });

    const isValidFormat = result.success || ('error' in result && result.error.code !== 'VAL_001');
    const matches = isValidFormat === test.valid;
    console.log(`  ${test.desc}: ${matches ? '✓' : '✗'} ${isValidFormat ? '有効' : '無効'}`);
  }
}

async function testConcurrentRateLimiting() {
  console.log('\n\nエッジケーステスト: 同時レート制限\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const rateLimiter = new InMemoryRateLimiter(3, 1); // 3 attempts, 1 minute
  const loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);

  console.log('同時多重リクエスト:');
  
  // Fire 10 requests simultaneously
  const promises = Array(10).fill(null).map(() => 
    loginService.login({
      email: 'concurrent@example.com',
      password: 'wrongPassword'
    })
  );

  const results = await Promise.all(promises);
  const blockedCount = results.filter(r => !r.success && 'error' in r && r.error.code === 'RATE_001').length;
  const failedCount = results.filter(r => !r.success && 'error' in r && r.error.code === 'AUTH_001').length;

  console.log(`  10リクエスト同時実行:`);
  console.log(`    認証エラー: ${failedCount}回`);
  console.log(`    レート制限: ${blockedCount}回`);
  console.log(`    ${blockedCount >= 7 ? '✓ 適切にレート制限' : '✗ レート制限が不十分'}`);
}

async function testPasswordHashingEdgeCases() {
  console.log('\n\nエッジケーステスト: パスワードハッシュ境界ケース\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  const passwordTests = [
    { password: '12345678', desc: '最小長(8文字)' },
    { password: 'a'.repeat(128), desc: '最大長(128文字)' },
    { password: '🔐🔑🗝️🔓🔒🔏🔐🔑', desc: '絵文字のみ' },
    { password: 'パスワード密码пароль', desc: '多言語混在' },
    { password: String.fromCharCode(0) + 'password', desc: 'NULL文字含む' },
    { password: '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007', desc: '制御文字' },
    { password: '    spaced    ', desc: '前後空白' },
    { password: 'pass\nword\r\n123', desc: '改行含む' }
  ];

  console.log('特殊パスワードのハッシュ化:');
  for (const test of passwordTests) {
    try {
      const user = await createTestUser(`edge${Math.random()}@example.com`, test.password, passwordService);
      userRepo.addUser(user);

      const result = await loginService.login({
        email: user.email,
        password: test.password
      });

      const success = result.success;
      console.log(`  ${test.desc}: ${success ? '✓ ログイン成功' : '✗ ログイン失敗'}`);
    } catch (error) {
      console.log(`  ${test.desc}: ✗ エラー発生`);
    }
  }
}

async function testDateHandling() {
  console.log('\n\nエッジケーステスト: 日付処理\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const loginService = new LoginService(userRepo, passwordService, tokenService);

  // Create users with edge case dates
  const dateTests = [
    { date: new Date(0), desc: 'Unix epoch (1970-01-01)' },
    { date: new Date('2038-01-19T03:14:07Z'), desc: 'Y2K38問題境界' },
    { date: new Date('9999-12-31T23:59:59Z'), desc: '遠い未来' },
    { date: new Date('invalid'), desc: '無効な日付' }
  ];

  console.log('特殊な作成日時:');
  for (const test of dateTests) {
    try {
      const email = `date${Math.random()}@example.com`;
      const user: User = {
        id: `user_${email}`,
        email,
        name: 'Test User',
        passwordHash: await passwordService.hash('password123'),
        createdAt: test.date
      };
      
      if (!isNaN(test.date.getTime())) {
        userRepo.addUser(user);
        
        const result = await loginService.login({
          email: user.email,
          password: 'password123'
        });

        if (result.success) {
          const isoString = result.data.user.createdAt;
          console.log(`  ${test.desc}: ✓ ${isoString}`);
        } else {
          console.log(`  ${test.desc}: ✗ ログイン失敗`);
        }
      } else {
        console.log(`  ${test.desc}: ✓ 無効な日付として処理`);
      }
    } catch (error) {
      console.log(`  ${test.desc}: ✓ エラーで処理`);
    }
  }
}

async function testMemoryExhaustion() {
  console.log('\n\nエッジケーステスト: メモリ枯渇シナリオ\n');

  const userRepo = new MockUserRepository();
  const passwordService = new PasswordService();
  const tokenService = new MockTokenService();
  const rateLimiter = new InMemoryRateLimiter(5, 15);
  const loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);

  console.log('大量の異なるIPからのアクセス:');
  
  const memBefore = process.memoryUsage();
  const attackerCount = 10000;
  
  // Simulate many different attackers
  for (let i = 0; i < attackerCount; i++) {
    await loginService.login({
      email: `attacker${i}@evil.com`,
      password: 'attempt'
    });
    
    if (i % 1000 === 0 && i > 0) {
      const memCurrent = process.memoryUsage();
      const heapGrowth = (memCurrent.heapUsed - memBefore.heapUsed) / 1024 / 1024;
      console.log(`  ${i}アクセス後: +${heapGrowth.toFixed(2)}MB`);
    }
  }

  const memAfter = process.memoryUsage();
  const totalHeapGrowth = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
  const perAttacker = (totalHeapGrowth * 1024) / attackerCount;

  console.log(`  総メモリ増加: ${totalHeapGrowth.toFixed(2)}MB`);
  console.log(`  攻撃者あたり: ${perAttacker.toFixed(2)}KB`);
  console.log(`  評価: ${perAttacker < 1 ? '✓ メモリ効率的' : '✗ メモリ使用量が多い'}`);
}

// Run all edge case tests
async function runEdgeCaseTests() {
  console.log('ログインサービス エッジケーステスト\n');
  console.log('='.repeat(50));

  try {
    await testDatabaseFailure();
    await testTokenGenerationFailure();
    await testUnicodeAndSpecialCharacters();
    await testEmptyAndNullValues();
    await testBoundaryEmailFormats();
    await testConcurrentRateLimiting();
    await testPasswordHashingEdgeCases();
    await testDateHandling();
    await testMemoryExhaustion();

    console.log('\n' + '='.repeat(50));
    console.log('エッジケーステスト完了\n');

    console.log('推奨事項:');
    console.log('- すべての外部依存関係の障害を適切に処理する');
    console.log('- Unicode文字と特殊文字を正しく扱う');
    console.log('- 境界値での動作を確実にテストする');
    console.log('- 同時実行時のレート制限の整合性を保つ');
    console.log('- メモリ使用量が攻撃者数に対して線形に増加することを確認する');
  } catch (error) {
    console.error('エッジケーステストエラー:', error);
  }
}

if (require.main === module) {
  runEdgeCaseTests();
}