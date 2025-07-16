import { PasswordService } from './passwordService';
import bcrypt from 'bcrypt';

describe('PasswordService Integration Tests', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('Real bcrypt integration', () => {
    it('should hash and verify password with actual bcrypt', async () => {
      const password = 'MySecurePassword123!';
      
      // ハッシュ化
      const hashedPassword = await passwordService.hashPassword(password);
      
      // bcryptハッシュの形式を検証
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
      
      // 検証
      const isValid = await passwordService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
      
      // 異なるパスワードでの検証
      const isInvalid = await passwordService.verifyPassword('WrongPassword123!', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);
      
      // 同じパスワードでも異なるハッシュが生成される
      expect(hash1).not.toBe(hash2);
      
      // どちらのハッシュでも検証が成功する
      expect(await passwordService.verifyPassword(password, hash1)).toBe(true);
      expect(await passwordService.verifyPassword(password, hash2)).toBe(true);
    });

    it('should handle different security levels correctly', async () => {
      const password = 'SecurePassword123!';
      
      // 高セキュリティレベル
      const highSecurityService = new PasswordService();
      const highSecurityHash = await highSecurityService.hashPassword(password, 'high');
      
      // 標準セキュリティレベル
      const standardHash = await passwordService.hashPassword(password, 'standard');
      
      // 低セキュリティレベル
      const lowSecurityHash = await passwordService.hashPassword(password, 'low');
      
      // すべて異なるハッシュ
      expect(highSecurityHash).not.toBe(standardHash);
      expect(standardHash).not.toBe(lowSecurityHash);
      
      // すべて検証可能
      expect(await passwordService.verifyPassword(password, highSecurityHash)).toBe(true);
      expect(await passwordService.verifyPassword(password, standardHash)).toBe(true);
      expect(await passwordService.verifyPassword(password, lowSecurityHash)).toBe(true);
    });
  });

  describe('Concurrent operations', () => {
    it('should handle multiple concurrent hash operations', async () => {
      const passwords = Array.from({ length: 10 }, (_, i) => `Password${i}!`);
      
      const hashPromises = passwords.map(pwd => passwordService.hashPassword(pwd));
      const hashes = await Promise.all(hashPromises);
      
      // すべてのハッシュが一意であることを確認
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(passwords.length);
      
      // すべてのパスワードが正しく検証できることを確認
      const verifyPromises = passwords.map((pwd, i) => 
        passwordService.verifyPassword(pwd, hashes[i])
      );
      const results = await Promise.all(verifyPromises);
      
      expect(results.every(result => result === true)).toBe(true);
    });

    it('should handle mixed hash and verify operations', async () => {
      const operations = [
        passwordService.hashPassword('Password1!'),
        passwordService.hashPassword('Password2!'),
        passwordService.verifyPassword('Test123!', '$2b$10$fakehash'),
        passwordService.hashPassword('Password3!'),
      ];
      
      const results = await Promise.all(operations);
      
      expect(typeof results[0]).toBe('string');
      expect(typeof results[1]).toBe('string');
      expect(results[2]).toBe(false);
      expect(typeof results[3]).toBe('string');
    });
  });

  describe('Edge cases with real implementation', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000) + 'A1!';
      
      const hash = await passwordService.hashPassword(longPassword);
      const isValid = await passwordService.verifyPassword(longPassword, hash);
      
      expect(isValid).toBe(true);
    });

    it('should handle passwords with special characters', async () => {
      const specialPasswords = [
        'Pass@#$%^&*()123',
        'パスワード123!',
        '🔒Security123!',
        'Pass\nword\t123!',
        'Pass\'word"123!',
      ];
      
      for (const password of specialPasswords) {
        const hash = await passwordService.hashPassword(password);
        const isValid = await passwordService.verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    it('should reject invalid hash formats', async () => {
      const invalidHashes = [
        'not-a-hash',
        '$2b$10$invalid',
        '$1b$10$' + 'a'.repeat(53),
        '',
        null,
        undefined,
      ];
      
      for (const hash of invalidHashes) {
        const isValid = await passwordService.verifyPassword('Password123!', hash as any);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('Error recovery', () => {
    it('should handle bcrypt errors gracefully', async () => {
      // 無効な salt rounds
      const service = new PasswordService();
      
      // bcryptの内部エラーをシミュレート
      const originalHash = bcrypt.hash;
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('bcrypt error'));
      
      await expect(service.hashPassword('Password123!')).rejects.toThrow('Failed to hash password');
      
      // 元に戻す
      bcrypt.hash = originalHash;
    });
  });
});