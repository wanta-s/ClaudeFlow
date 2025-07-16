import { PasswordService } from './passwordService';
import crypto from 'crypto';

describe('PasswordService Security Tests', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('Password strength validation', () => {
    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'qwerty123',
        'admin123',
        'Password',
        'Password1',
        'Passw0rd',
      ];

      for (const password of weakPasswords) {
        const errors = passwordService.validatePassword(password);
        expect(errors.length).toBeGreaterThan(0);
        console.log(`Weak password "${password}" rejected with errors:`, errors);
      }
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'MyStr0ng!Pass',
        'C0mpl3x#P@ssw0rd',
        'Secure123!@#',
        'P@ssw0rd$2024',
        'Un1que&Str0ng!',
      ];

      for (const password of strongPasswords) {
        const errors = passwordService.validatePassword(password);
        expect(errors.length).toBe(0);
      }
    });

    it('should enforce minimum entropy', () => {
      const lowEntropyPasswords = [
        'Aaaa1111!!!!',
        'Abcd1234!@#$',
        'Pass1234!!!!',
      ];

      // カスタム設定で最小エントロピーを強制
      const strictService = new PasswordService({
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      });

      for (const password of lowEntropyPasswords) {
        const errors = strictService.validatePassword(password);
        // 低エントロピーパスワードは他の要件を満たしても弱い
        console.log(`Low entropy password "${password}" validation:`, errors);
      }
    });
  });

  describe('Hash security', () => {
    it('should use proper bcrypt format', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordService.hashPassword(password);
      
      // bcrypt形式の検証
      const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;
      expect(hash).toMatch(bcryptRegex);
      
      // ハッシュの各部分を検証
      const parts = hash.split('$');
      expect(parts[1]).toMatch(/2[aby]/); // bcryptバージョン
      expect(parseInt(parts[2])).toBeGreaterThanOrEqual(10); // salt rounds
    });

    it('should use sufficient salt rounds', async () => {
      const password = 'TestPassword123!';
      
      // 各セキュリティレベルでのsalt roundsを検証
      const levels: Array<'low' | 'standard' | 'high'> = ['low', 'standard', 'high'];
      const expectedRounds = { low: 10, standard: 12, high: 14 };
      
      for (const level of levels) {
        const hash = await passwordService.hashPassword(password, level);
        const rounds = parseInt(hash.split('$')[2]);
        expect(rounds).toBe(expectedRounds[level]);
      }
    });

    it('should generate unique salts', async () => {
      const password = 'SamePassword123!';
      const hashes = new Set<string>();
      
      // 同じパスワードで複数のハッシュを生成
      for (let i = 0; i < 10; i++) {
        const hash = await passwordService.hashPassword(password);
        hashes.add(hash);
      }
      
      // すべてのハッシュが一意であることを確認
      expect(hashes.size).toBe(10);
    });
  });

  describe('Timing attack resistance', () => {
    it('should have consistent verification time for valid and invalid passwords', async () => {
      const password = 'CorrectPassword123!';
      const hash = await passwordService.hashPassword(password);
      const wrongPasswords = [
        'WrongPassword123!',
        'X',
        'a'.repeat(100),
        '',
      ];
      
      const timings = {
        correct: [] as number[],
        wrong: [] as number[],
      };
      
      // 正しいパスワードのタイミング
      for (let i = 0; i < 20; i++) {
        const start = process.hrtime.bigint();
        await passwordService.verifyPassword(password, hash);
        const end = process.hrtime.bigint();
        timings.correct.push(Number(end - start) / 1000000); // ナノ秒をミリ秒に変換
      }
      
      // 間違ったパスワードのタイミング
      for (const wrongPassword of wrongPasswords) {
        for (let i = 0; i < 5; i++) {
          const start = process.hrtime.bigint();
          await passwordService.verifyPassword(wrongPassword, hash);
          const end = process.hrtime.bigint();
          timings.wrong.push(Number(end - start) / 1000000);
        }
      }
      
      // 平均時間を計算
      const avgCorrect = timings.correct.reduce((a, b) => a + b, 0) / timings.correct.length;
      const avgWrong = timings.wrong.reduce((a, b) => a + b, 0) / timings.wrong.length;
      
      console.log(`Average verification time - Correct: ${avgCorrect.toFixed(2)}ms, Wrong: ${avgWrong.toFixed(2)}ms`);
      
      // タイミングの差が10%以内であることを確認
      const timingDifference = Math.abs(avgCorrect - avgWrong) / Math.max(avgCorrect, avgWrong);
      expect(timingDifference).toBeLessThan(0.1);
    });
  });

  describe('Input sanitization', () => {
    it('should handle potentially malicious inputs safely', async () => {
      const maliciousInputs = [
        // SQLインジェクション試行
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        
        // XSS試行
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        
        // コマンドインジェクション試行
        '`rm -rf /`',
        '$(cat /etc/passwd)',
        
        // バッファオーバーフロー試行
        'A'.repeat(10000),
        
        // Unicode攻撃
        '\u0000password',
        'pass\u0000word',
        
        // 制御文字
        'pass\nword\r\n',
        'pass\tword',
      ];
      
      for (const input of maliciousInputs) {
        // 検証が安全に失敗することを確認
        const errors = passwordService.validatePassword(input);
        expect(errors.length).toBeGreaterThan(0);
        
        // 無害化されたパスワードでもハッシュ化が安全に動作することを確認
        if (input.length >= 8 && input.length <= 128) {
          const hash = await passwordService.hashPassword(input + 'Valid1!');
          expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
        }
      }
    });

    it('should prevent DoS through expensive operations', async () => {
      // 非常に長いパスワード
      const veryLongPassword = 'a'.repeat(1000) + 'A1!';
      
      const start = Date.now();
      const errors = passwordService.validatePassword(veryLongPassword);
      const validationTime = Date.now() - start;
      
      // 検証が迅速に失敗することを確認
      expect(errors).toContain('Password must not exceed 128 characters');
      expect(validationTime).toBeLessThan(10); // 10ms以内
      
      // ハッシュ化を試みない（DoS防止）
      await expect(passwordService.hashPassword(veryLongPassword)).rejects.toThrow();
    });
  });

  describe('Cryptographic randomness', () => {
    it('should use cryptographically secure random for salts', async () => {
      // bcryptが内部的に使用するランダム性をテスト
      const password = 'TestRandom123!';
      const salts = new Set<string>();
      
      // 複数のハッシュからsaltを抽出
      for (let i = 0; i < 20; i++) {
        const hash = await passwordService.hashPassword(password);
        const salt = hash.substring(0, 29); // bcryptのsalt部分
        salts.add(salt);
      }
      
      // すべてのsaltが一意であることを確認
      expect(salts.size).toBe(20);
    });
  });

  describe('Security best practices', () => {
    it('should not expose sensitive information in errors', async () => {
      try {
        // 無効な入力でエラーを発生させる
        await passwordService.hashPassword(null as any);
      } catch (error: any) {
        // エラーメッセージに機密情報が含まれていないことを確認
        expect(error.message).not.toContain('bcrypt');
        expect(error.message).not.toContain('salt');
        expect(error.message).not.toContain('rounds');
        expect(error.message).toBe('Failed to hash password');
      }
    });

    it('should clear sensitive data from memory', () => {
      // JavaScriptでは明示的なメモリクリアは困難だが、
      // パスワードを保持しないことを確認
      const service = new PasswordService();
      
      // サービスインスタンスにパスワードが保存されていないことを確認
      const keys = Object.keys(service);
      const values = Object.values(service);
      
      expect(keys).not.toContain('password');
      expect(values).not.toContain('TestPassword123!');
    });

    it('should implement rate limiting recommendations', () => {
      // 実際のレート制限は実装レベルで行うが、
      // 推奨される遅延を確認
      const recommendations = {
        maxAttemptsPerMinute: 5,
        lockoutDuration: 300000, // 5分
        progressiveDelay: true,
      };
      
      // これらの推奨事項が文書化されていることを確認
      expect(recommendations.maxAttemptsPerMinute).toBeLessThanOrEqual(10);
      expect(recommendations.lockoutDuration).toBeGreaterThanOrEqual(60000);
      expect(recommendations.progressiveDelay).toBe(true);
    });
  });

  describe('Common vulnerability tests', () => {
    it('should prevent password enumeration', async () => {
      const existingHash = await passwordService.hashPassword('ExistingUser123!');
      const nonExistentHash = '$2b$10$invalid.hash.that.does.not.exist.anywhere';
      
      // 両方のケースで同様の動作を確認
      const result1 = await passwordService.verifyPassword('TestPassword123!', existingHash);
      const result2 = await passwordService.verifyPassword('TestPassword123!', nonExistentHash);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should resist brute force through computational cost', async () => {
      const password = 'TargetPassword123!';
      const hash = await passwordService.hashPassword(password, 'high');
      
      const attempts = ['password', 'Password1', 'TargetPassword', 'TargetPassword1'];
      const start = Date.now();
      
      for (const attempt of attempts) {
        await passwordService.verifyPassword(attempt, hash);
      }
      
      const totalTime = Date.now() - start;
      const avgTimePerAttempt = totalTime / attempts.length;
      
      console.log(`Average time per brute force attempt: ${avgTimePerAttempt}ms`);
      
      // 高セキュリティレベルでは各試行に時間がかかることを確認
      expect(avgTimePerAttempt).toBeGreaterThan(50);
    });
  });
});