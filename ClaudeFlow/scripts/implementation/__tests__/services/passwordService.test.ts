import bcrypt from 'bcrypt';
import { PasswordService } from '../../src/services/passwordService';
import { IConfig } from '../../src/types';
import { ValidationError } from '../../src/utils/errors';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('PasswordService', () => {
  let passwordService: PasswordService;
  let mockConfig: IConfig;

  beforeEach(() => {
    mockConfig = {
      nodeEnv: 'test',
      port: 3000,
      database: {
        url: 'postgres://test',
        logging: false,
        pool: { max: 10, min: 2, acquire: 30000, idle: 10000 }
      },
      jwt: {
        secret: 'test-secret',
        expiresIn: '24h',
        refreshExpiresIn: '7d'
      },
      cors: { origin: '*', credentials: true },
      bcrypt: { saltRounds: 10 },
      rateLimit: { windowMs: 900000, max: 100 }
    };

    passwordService = new PasswordService(mockConfig);
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash a valid password', async () => {
      const password = 'ValidPassword123!';
      const hashedPassword = '$2b$10$hashedpassword';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await passwordService.hash(password);

      expect(result).toBe(hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, mockConfig.bcrypt.saltRounds);
    });

    it('should throw ValidationError for empty password', async () => {
      await expect(passwordService.hash('')).rejects.toThrow(ValidationError);
      await expect(passwordService.hash('')).rejects.toThrow('Password cannot be empty');
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for password with only spaces', async () => {
      await expect(passwordService.hash('   ')).rejects.toThrow(ValidationError);
      await expect(passwordService.hash('   ')).rejects.toThrow('Password cannot be empty');
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for password exceeding max length', async () => {
      const longPassword = 'a'.repeat(73); // 73 characters (bcrypt max is 72)
      
      await expect(passwordService.hash(longPassword)).rejects.toThrow(ValidationError);
      await expect(passwordService.hash(longPassword)).rejects.toThrow('Password cannot exceed 72 characters');
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should handle bcrypt errors', async () => {
      const password = 'ValidPassword123!';
      const bcryptError = new Error('Bcrypt error');
      
      mockedBcrypt.hash.mockRejectedValue(bcryptError);

      await expect(passwordService.hash(password)).rejects.toThrow('Failed to hash password');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, mockConfig.bcrypt.saltRounds);
    });

    it('should hash password at the boundary (72 characters)', async () => {
      const boundaryPassword = 'a'.repeat(72);
      const hashedPassword = '$2b$10$boundaryhash';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await passwordService.hash(boundaryPassword);

      expect(result).toBe(hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(boundaryPassword, mockConfig.bcrypt.saltRounds);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
      const hashedPassword = '$2b$10$specialhash';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await passwordService.hash(specialPassword);

      expect(result).toBe(hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(specialPassword, mockConfig.bcrypt.saltRounds);
    });

    it('should handle unicode characters in password', async () => {
      const unicodePassword = '密码パスワード🔐';
      const hashedPassword = '$2b$10$unicodehash';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await passwordService.hash(unicodePassword);

      expect(result).toBe(hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(unicodePassword, mockConfig.bcrypt.saltRounds);
    });
  });

  describe('compare', () => {
    it('should return true for matching password', async () => {
      const plainPassword = 'ValidPassword123!';
      const hashedPassword = '$2b$10$hashedpassword';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await passwordService.compare(plainPassword, hashedPassword);

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('should return false for non-matching password', async () => {
      const plainPassword = 'WrongPassword123!';
      const hashedPassword = '$2b$10$hashedpassword';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await passwordService.compare(plainPassword, hashedPassword);

      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('should throw ValidationError for empty plain password', async () => {
      const hashedPassword = '$2b$10$hashedpassword';
      
      await expect(passwordService.compare('', hashedPassword)).rejects.toThrow(ValidationError);
      await expect(passwordService.compare('', hashedPassword)).rejects.toThrow('Password and hash cannot be empty');
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for empty hash', async () => {
      const plainPassword = 'ValidPassword123!';
      
      await expect(passwordService.compare(plainPassword, '')).rejects.toThrow(ValidationError);
      await expect(passwordService.compare(plainPassword, '')).rejects.toThrow('Password and hash cannot be empty');
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for both empty inputs', async () => {
      await expect(passwordService.compare('', '')).rejects.toThrow(ValidationError);
      await expect(passwordService.compare('', '')).rejects.toThrow('Password and hash cannot be empty');
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should handle bcrypt errors during comparison', async () => {
      const plainPassword = 'ValidPassword123!';
      const hashedPassword = '$2b$10$hashedpassword';
      const bcryptError = new Error('Bcrypt comparison error');
      
      mockedBcrypt.compare.mockRejectedValue(bcryptError);

      await expect(passwordService.compare(plainPassword, hashedPassword)).rejects.toThrow('Failed to compare password');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('should handle invalid hash format', async () => {
      const plainPassword = 'ValidPassword123!';
      const invalidHash = 'not-a-valid-bcrypt-hash';
      
      mockedBcrypt.compare.mockRejectedValue(new Error('Invalid hash'));

      await expect(passwordService.compare(plainPassword, invalidHash)).rejects.toThrow('Failed to compare password');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(plainPassword, invalidHash);
    });

    it('should compare passwords with special characters', async () => {
      const specialPassword = '!@#$%^&*()';
      const hashedPassword = '$2b$10$specialhash';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await passwordService.compare(specialPassword, hashedPassword);

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(specialPassword, hashedPassword);
    });

    it('should handle case-sensitive password comparison', async () => {
      const lowerPassword = 'password123';
      const hashedPassword = '$2b$10$hashedpassword';
      
      // First call with lowercase
      mockedBcrypt.compare.mockResolvedValueOnce(false as never);
      const result1 = await passwordService.compare(lowerPassword, hashedPassword);
      expect(result1).toBe(false);

      // Second call with uppercase
      const upperPassword = 'PASSWORD123';
      mockedBcrypt.compare.mockResolvedValueOnce(false as never);
      const result2 = await passwordService.compare(upperPassword, hashedPassword);
      expect(result2).toBe(false);

      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration', () => {
    it('should use the configured salt rounds', async () => {
      const customConfig = { ...mockConfig, bcrypt: { saltRounds: 12 } };
      const customService = new PasswordService(customConfig);
      
      const password = 'TestPassword123!';
      const hashedPassword = '$2b$12$customhash';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      await customService.hash(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should handle minimum salt rounds', async () => {
      const customConfig = { ...mockConfig, bcrypt: { saltRounds: 1 } };
      const customService = new PasswordService(customConfig);
      
      const password = 'TestPassword123!';
      const hashedPassword = '$2b$01$minhash';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      await customService.hash(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 1);
    });
  });
});