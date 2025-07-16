import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as bcrypt from 'bcrypt';
import { PasswordService } from './passwordService';

vi.mock('bcrypt');

describe('PasswordService', () => {
  let service: PasswordService;
  const mockedBcrypt = vi.mocked(bcrypt);

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PasswordService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config).toEqual({
        saltRounds: 10,
        minLength: 8,
        requireSpecialChar: false,
        requireNumber: false,
        requireUppercase: false
      });
    });

    it('should accept custom configuration', () => {
      const customService = new PasswordService({
        saltRounds: 12,
        minLength: 10,
        requireSpecialChar: true,
        requireNumber: true,
        requireUppercase: true
      });
      const config = customService.getConfig();
      expect(config.saltRounds).toBe(12);
      expect(config.minLength).toBe(10);
      expect(config.requireSpecialChar).toBe(true);
      expect(config.requireNumber).toBe(true);
      expect(config.requireUppercase).toBe(true);
    });

    it('should merge partial configuration with defaults', () => {
      const customService = new PasswordService({ minLength: 12 });
      const config = customService.getConfig();
      expect(config.minLength).toBe(12);
      expect(config.saltRounds).toBe(10);
    });
  });

  describe('withSecurityLevel', () => {
    it('should create instance with LOW security preset', () => {
      const lowSecurity = PasswordService.withSecurityLevel('LOW');
      const config = lowSecurity.getConfig();
      expect(config.saltRounds).toBe(10);
      expect(config.minLength).toBe(6);
      expect(config.requireSpecialChar).toBe(false);
      expect(config.requireNumber).toBe(false);
      expect(config.requireUppercase).toBe(false);
    });

    it('should create instance with MEDIUM security preset', () => {
      const mediumSecurity = PasswordService.withSecurityLevel('MEDIUM');
      const config = mediumSecurity.getConfig();
      expect(config.saltRounds).toBe(12);
      expect(config.minLength).toBe(8);
      expect(config.requireNumber).toBe(true);
      expect(config.requireSpecialChar).toBe(false);
      expect(config.requireUppercase).toBe(false);
    });

    it('should create instance with HIGH security preset', () => {
      const highSecurity = PasswordService.withSecurityLevel('HIGH');
      const config = highSecurity.getConfig();
      expect(config.saltRounds).toBe(14);
      expect(config.minLength).toBe(12);
      expect(config.requireSpecialChar).toBe(true);
      expect(config.requireNumber).toBe(true);
      expect(config.requireUppercase).toBe(true);
    });
  });

  describe('hash', () => {
    it('should hash a valid password', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await service.hash(password);
      
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });

    it('should normalize password by removing tabs and newlines', async () => {
      const password = '  password\twith\ttabs\nand\nnewlines  ';
      const normalized = '  passwordwithtabsandnewlines';
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      await service.hash(password);
      
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(normalized, 10);
    });

    it('should throw error for empty password', async () => {
      await expect(service.hash('')).rejects.toThrow('Password cannot be empty');
      await expect(service.hash('   ')).rejects.toThrow('Password cannot be empty');
      await expect(service.hash('\t\n')).rejects.toThrow('Password cannot be empty');
    });

    it('should throw error for password shorter than minLength', async () => {
      const customService = new PasswordService({ minLength: 10 });
      await expect(customService.hash('short')).rejects.toThrow('Password must be at least 10 characters long');
    });

    it('should throw error when uppercase is required but missing', async () => {
      const customService = new PasswordService({ requireUppercase: true });
      await expect(customService.hash('lowercase123!')).rejects.toThrow('Password must contain at least one uppercase letter');
    });

    it('should throw error when number is required but missing', async () => {
      const customService = new PasswordService({ requireNumber: true });
      await expect(customService.hash('NoNumbers!')).rejects.toThrow('Password must contain at least one number');
    });

    it('should throw error when special character is required but missing', async () => {
      const customService = new PasswordService({ requireSpecialChar: true });
      await expect(customService.hash('NoSpecialChar123')).rejects.toThrow('Password must contain at least one special character');
    });

    it('should retry on failure', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      
      mockedBcrypt.hash
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(hashedPassword as never);

      const result = await service.hash(password);
      
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(2);
      expect(result).toBe(hashedPassword);
    });

    it('should fail after max retries', async () => {
      const password = 'testPassword123';
      mockedBcrypt.hash.mockRejectedValue(new Error('Persistent failure'));

      await expect(service.hash(password, 2)).rejects.toThrow('Failed after 2 attempts: Persistent failure');
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(3);
    });

    it('should handle bcrypt returning null/undefined', async () => {
      const password = 'testPassword123';
      mockedBcrypt.hash.mockResolvedValue(null as never);

      await expect(service.hash(password, 1)).rejects.toThrow('Failed after 1 attempts: Hash generation failed');
    });

    it('should accept custom retry count', async () => {
      const password = 'testPassword123';
      mockedBcrypt.hash.mockRejectedValue(new Error('Failure'));

      await expect(service.hash(password, 5)).rejects.toThrow('Failed after 5 attempts: Failure');
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(6);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.verify(password, hash);
      
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'wrongPassword';
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.verify(password, hash);
      
      expect(result).toBe(false);
    });

    it('should normalize password before verification', async () => {
      const password = '  password\twith\ttabs\n  ';
      const normalized = '  passwordwithtabs';
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await service.verify(password, hash);
      
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(normalized, hash);
    });

    it('should throw error for empty password', async () => {
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      await expect(service.verify('', hash)).rejects.toThrow('Password cannot be empty');
      await expect(service.verify('   ', hash)).rejects.toThrow('Password cannot be empty');
    });

    it('should throw error for empty hash', async () => {
      await expect(service.verify('password', '')).rejects.toThrow('Hash cannot be empty');
    });

    it('should throw error for invalid hash format', async () => {
      await expect(service.verify('password', 'invalid-hash')).rejects.toThrow('Invalid hash format');
      await expect(service.verify('password', '$2a$10$short')).rejects.toThrow('Invalid hash format');
      await expect(service.verify('password', '$2x$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr')).rejects.toThrow('Invalid hash format');
    });

    it('should accept valid bcrypt hash formats', async () => {
      const password = 'test';
      const validHashes = [
        '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        '$2y$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr'
      ];

      mockedBcrypt.compare.mockResolvedValue(true as never);

      for (const hash of validHashes) {
        await expect(service.verify(password, hash)).resolves.toBe(true);
      }
    });

    it('should wrap bcrypt errors', async () => {
      const password = 'test';
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.compare.mockRejectedValue(new Error('bcrypt error'));

      await expect(service.verify(password, hash)).rejects.toThrow('Verification failed: bcrypt error');
    });
  });

  describe('getConfig', () => {
    it('should return a copy of configuration', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should not allow external modification of internal config', () => {
      const config = service.getConfig();
      config.minLength = 999;
      
      const newConfig = service.getConfig();
      expect(newConfig.minLength).toBe(8);
    });
  });

  describe('edge cases and boundary values', () => {
    it('should handle 1-character password when allowed', async () => {
      const customService = new PasswordService({ minLength: 1 });
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await customService.hash('a');
      expect(result).toBe(hashedPassword);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await service.hash(longPassword);
      expect(result).toBe(hashedPassword);
    });

    it('should handle passwords with Unicode characters', async () => {
      const unicodePassword = '🔐パスワード密码🔑';
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await service.hash(unicodePassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(unicodePassword, 10);
      expect(result).toBe(hashedPassword);
    });

    it('should handle all special characters in validation', async () => {
      const customService = new PasswordService({ requireSpecialChar: true });
      const specialChars = '!@#$%^&*(),.?":{}|<>';
      
      for (const char of specialChars) {
        const password = `Password1${char}`;
        const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
        mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
        
        await expect(customService.hash(password)).resolves.toBe(hashedPassword);
      }
    });

    it('should handle passwords at exactly minLength', async () => {
      const customService = new PasswordService({ minLength: 10 });
      const password = 'a'.repeat(10);
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      await expect(customService.hash(password)).resolves.toBe(hashedPassword);
    });

    it('should handle passwords one character below minLength', async () => {
      const customService = new PasswordService({ minLength: 10 });
      const password = 'a'.repeat(9);

      await expect(customService.hash(password)).rejects.toThrow('Password must be at least 10 characters long');
    });
  });

  describe('retry mechanism', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use exponential backoff for retries', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      
      mockedBcrypt.hash
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValueOnce(hashedPassword as never);

      const promise = service.hash(password, 3);

      // First attempt - immediate
      await vi.advanceTimersByTimeAsync(0);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);

      // Second attempt - 100ms delay
      await vi.advanceTimersByTimeAsync(100);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(2);

      // Third attempt - 200ms delay
      await vi.advanceTimersByTimeAsync(200);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe(hashedPassword);
    });

    it('should calculate correct backoff delays', async () => {
      const password = 'testPassword123';
      
      mockedBcrypt.hash
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockRejectedValueOnce(new Error('Failure 3'))
        .mockRejectedValueOnce(new Error('Failure 4'));

      const promise = service.hash(password, 4);

      // Verify exponential delays: 100ms, 200ms, 400ms, 800ms
      await vi.advanceTimersByTimeAsync(0);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(100);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(200);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(400);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(4);

      await vi.advanceTimersByTimeAsync(800);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(5);

      await expect(promise).rejects.toThrow('Failed after 4 attempts');
    });
  });

  describe('validation patterns', () => {
    it('should correctly identify uppercase letters', async () => {
      const customService = new PasswordService({ requireUppercase: true });
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      await expect(customService.hash('passwordA')).resolves.toBe(hashedPassword);
      await expect(customService.hash('Password')).resolves.toBe(hashedPassword);
      await expect(customService.hash('PASSWORD')).resolves.toBe(hashedPassword);
      await expect(customService.hash('password')).rejects.toThrow('uppercase letter');
    });

    it('should correctly identify numbers', async () => {
      const customService = new PasswordService({ requireNumber: true });
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      await expect(customService.hash('password1')).resolves.toBe(hashedPassword);
      await expect(customService.hash('0password')).resolves.toBe(hashedPassword);
      await expect(customService.hash('pass9word')).resolves.toBe(hashedPassword);
      await expect(customService.hash('password')).rejects.toThrow('one number');
    });

    it('should correctly identify special characters', async () => {
      const customService = new PasswordService({ requireSpecialChar: true });
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      await expect(customService.hash('password!')).resolves.toBe(hashedPassword);
      await expect(customService.hash('pass@word')).resolves.toBe(hashedPassword);
      await expect(customService.hash('password#')).resolves.toBe(hashedPassword);
      await expect(customService.hash('password')).rejects.toThrow('special character');
    });

    it('should validate all requirements together', async () => {
      const customService = new PasswordService({
        minLength: 12,
        requireUppercase: true,
        requireNumber: true,
        requireSpecialChar: true
      });

      await expect(customService.hash('short')).rejects.toThrow('at least 12 characters');
      await expect(customService.hash('longenoughbutbad')).rejects.toThrow('uppercase letter');
      await expect(customService.hash('LongEnoughButBad')).rejects.toThrow('one number');
      await expect(customService.hash('LongEnough1ButBad')).rejects.toThrow('special character');

      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      await expect(customService.hash('LongEnough1!Good')).resolves.toBe(hashedPassword);
    });
  });

  describe('concurrency', () => {
    it('should handle multiple concurrent hash operations', async () => {
      const passwords = ['password1', 'password2', 'password3', 'password4', 'password5'];
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const promises = passwords.map(pwd => service.hash(pwd));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results.every(r => r === hashedPassword)).toBe(true);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(5);
    });

    it('should handle multiple concurrent verify operations', async () => {
      const password = 'password';
      const hashes = [
        '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqs',
        '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqt'
      ];

      mockedBcrypt.compare
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(false as never)
        .mockResolvedValueOnce(true as never);

      const promises = hashes.map(hash => service.verify(password, hash));
      const results = await Promise.all(promises);

      expect(results).toEqual([true, false, true]);
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('should handle non-Error objects in hash', async () => {
      mockedBcrypt.hash.mockRejectedValue('string error');

      await expect(service.hash('password', 1)).rejects.toThrow('Failed after 1 attempts: Unknown error');
    });

    it('should handle non-Error objects in verify', async () => {
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.compare.mockRejectedValue('string error');

      await expect(service.verify('password', hash)).rejects.toThrow('Verification failed: Unknown error');
    });

    it('should handle null/undefined in hash errors', async () => {
      mockedBcrypt.hash.mockRejectedValue(null);

      await expect(service.hash('password', 1)).rejects.toThrow('Failed after 1 attempts: Unknown error');
    });

    it('should handle null/undefined in verify errors', async () => {
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
      mockedBcrypt.compare.mockRejectedValue(undefined);

      await expect(service.verify('password', hash)).rejects.toThrow('Verification failed: Unknown error');
    });
  });
});