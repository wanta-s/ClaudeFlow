import { PasswordService, SecurityLevels, PasswordConfig } from './passwordService';
import bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    jest.clearAllMocks();
    passwordService = new PasswordService();
  });

  describe('hash', () => {
    describe('正常系', () => {
      it('should hash a valid password successfully', async () => {
        const password = 'ValidPass123!';
        const hashedPassword = '$2b$10$mockHashedPassword';
        mockedBcrypt.hash.mockResolvedValue(hashedPassword);

        const result = await passwordService.hash(password);

        expect(result).toBe(hashedPassword);
        expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      });

      it('should hash passwords with different security levels', async () => {
        const password = 'TestPass123!';
        const hashedPassword = '$2b$12$mockHashedPassword';
        
        const highSecurityService = PasswordService.withSecurityLevel('HIGH');
        mockedBcrypt.hash.mockResolvedValue(hashedPassword);

        const result = await highSecurityService.hash(password);

        expect(result).toBe(hashedPassword);
        expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
      });

      it('should hash very long passwords', async () => {
        const password = 'a'.repeat(100) + 'A1!';
        const hashedPassword = '$2b$10$mockHashedLongPassword';
        mockedBcrypt.hash.mockResolvedValue(hashedPassword);

        const result = await passwordService.hash(password);

        expect(result).toBe(hashedPassword);
        expect(mockedBcrypt.hash).toHaveBeenCalled();
      });
    });

    describe('異常系', () => {
      it('should throw error for null password', async () => {
        await expect(passwordService.hash(null as any))
          .rejects.toThrow('Password is required and must be a non-empty string');
      });

      it('should throw error for undefined password', async () => {
        await expect(passwordService.hash(undefined as any))
          .rejects.toThrow('Password is required and must be a non-empty string');
      });

      it('should throw error for empty string password', async () => {
        await expect(passwordService.hash(''))
          .rejects.toThrow('Password is required and must be a non-empty string');
      });

      it('should throw error for non-string password', async () => {
        await expect(passwordService.hash(123 as any))
          .rejects.toThrow('Password is required and must be a non-empty string');
      });

      it('should throw error for password exceeding max length', async () => {
        const longPassword = 'a'.repeat(1001);
        await expect(passwordService.hash(longPassword))
          .rejects.toThrow('Password exceeds maximum length of 1000 characters');
      });

      it('should throw error when bcrypt fails', async () => {
        const password = 'ValidPass123!';
        const bcryptError = new Error('bcrypt error');
        mockedBcrypt.hash.mockRejectedValue(bcryptError);

        await expect(passwordService.hash(password))
          .rejects.toThrow(`Failed to hash password: ${bcryptError.message}`);
      });
    });

    describe('境界値テスト', () => {
      it('should hash password with exactly minimum length', async () => {
        const password = 'Pass123!'; // 8 characters
        const hashedPassword = '$2b$10$mockHashedPassword';
        mockedBcrypt.hash.mockResolvedValue(hashedPassword);

        const result = await passwordService.hash(password);

        expect(result).toBe(hashedPassword);
      });

      it('should hash password with exactly maximum length', async () => {
        const password = 'a'.repeat(999) + 'A';
        const hashedPassword = '$2b$10$mockHashedPassword';
        mockedBcrypt.hash.mockResolvedValue(hashedPassword);

        const result = await passwordService.hash(password);

        expect(result).toBe(hashedPassword);
      });

      it('should handle whitespace-only passwords', async () => {
        await expect(passwordService.hash('   '))
          .rejects.toThrow('Password is required and must be a non-empty string');
      });
    });
  });

  describe('verify', () => {
    describe('正常系', () => {
      it('should verify correct password', async () => {
        const password = 'ValidPass123!';
        const hash = '$2b$10$mockHashedPassword';
        mockedBcrypt.compare.mockResolvedValue(true);

        const result = await passwordService.verify(password, hash);

        expect(result).toBe(true);
        expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
      });

      it('should reject incorrect password', async () => {
        const password = 'WrongPass123!';
        const hash = '$2b$10$mockHashedPassword';
        mockedBcrypt.compare.mockResolvedValue(false);

        const result = await passwordService.verify(password, hash);

        expect(result).toBe(false);
        expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
      });
    });

    describe('異常系', () => {
      it('should throw error for null password', async () => {
        const hash = '$2b$10$mockHashedPassword';
        await expect(passwordService.verify(null as any, hash))
          .rejects.toThrow('Password and hash are required and must be non-empty strings');
      });

      it('should throw error for null hash', async () => {
        const password = 'ValidPass123!';
        await expect(passwordService.verify(password, null as any))
          .rejects.toThrow('Password and hash are required and must be non-empty strings');
      });

      it('should throw error for empty password', async () => {
        const hash = '$2b$10$mockHashedPassword';
        await expect(passwordService.verify('', hash))
          .rejects.toThrow('Password and hash are required and must be non-empty strings');
      });

      it('should throw error for empty hash', async () => {
        const password = 'ValidPass123!';
        await expect(passwordService.verify(password, ''))
          .rejects.toThrow('Password and hash are required and must be non-empty strings');
      });

      it('should throw error for invalid hash format', async () => {
        const password = 'ValidPass123!';
        const invalidHash = 'not-a-bcrypt-hash';
        await expect(passwordService.verify(password, invalidHash))
          .rejects.toThrow('Invalid hash format');
      });

      it('should throw error when bcrypt fails', async () => {
        const password = 'ValidPass123!';
        const hash = '$2b$10$mockHashedPassword';
        const bcryptError = new Error('bcrypt compare error');
        mockedBcrypt.compare.mockRejectedValue(bcryptError);

        await expect(passwordService.verify(password, hash))
          .rejects.toThrow(`Failed to verify password: ${bcryptError.message}`);
      });
    });

    describe('境界値テスト', () => {
      it('should verify password with exactly maximum length', async () => {
        const password = 'a'.repeat(999) + 'A';
        const hash = '$2b$10$mockHashedPassword';
        mockedBcrypt.compare.mockResolvedValue(true);

        const result = await passwordService.verify(password, hash);

        expect(result).toBe(true);
      });

      it('should throw error for password exceeding max length in verify', async () => {
        const longPassword = 'a'.repeat(1001);
        const hash = '$2b$10$mockHashedPassword';
        
        await expect(passwordService.verify(longPassword, hash))
          .rejects.toThrow('Password exceeds maximum length of 1000 characters');
      });
    });
  });

  describe('validateStrength', () => {
    describe('正常系', () => {
      it('should validate strong password with all requirements', () => {
        const password = 'StrongPass123!';
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate password meeting minimum requirements', () => {
        const password = 'ValidPass123';
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate with custom config', () => {
        const customConfig: PasswordConfig = {
          saltRounds: 10,
          minLength: 6,
          requireUpperCase: false,
          requireLowerCase: true,
          requireNumbers: false,
          requireSpecialChars: false
        };
        const customService = PasswordService.withConfig(customConfig);
        const password = 'simple';
        
        const result = customService.validateStrength(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('異常系', () => {
      it('should reject password shorter than minimum length', () => {
        const password = 'Short1!';
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });

      it('should reject password without uppercase', () => {
        const password = 'lowercase123!';
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      it('should reject password without lowercase', () => {
        const password = 'UPPERCASE123!';
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      it('should reject password without numbers', () => {
        const password = 'NoNumbers!';
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should reject password without special chars when required', () => {
        const highSecurityService = PasswordService.withSecurityLevel('HIGH');
        const password = 'NoSpecial123';
        const result = highSecurityService.validateStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character');
      });

      it('should collect multiple validation errors', () => {
        const password = 'short';
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(3);
        expect(result.errors).toContain('Password must be at least 8 characters long');
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should handle null password', () => {
        const result = passwordService.validateStrength(null as any);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });

      it('should handle undefined password', () => {
        const result = passwordService.validateStrength(undefined as any);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });

      it('should handle non-string password', () => {
        const result = passwordService.validateStrength(123 as any);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be a string');
      });
    });

    describe('境界値テスト', () => {
      it('should validate password with exactly minimum length', () => {
        const password = 'Pass123!'; // exactly 8 characters
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject password with one less than minimum length', () => {
        const password = 'Pass12!'; // 7 characters
        const result = passwordService.validateStrength(password);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });

      it('should validate password with custom special characters', () => {
        const customConfig: PasswordConfig = {
          saltRounds: 10,
          minLength: 8,
          requireUpperCase: true,
          requireLowerCase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          specialChars: '@#$'
        };
        const customService = PasswordService.withConfig(customConfig);
        
        const validPassword = 'Pass123@';
        const invalidPassword = 'Pass123!'; // ! is not in custom special chars

        const validResult = customService.validateStrength(validPassword);
        const invalidResult = customService.validateStrength(invalidPassword);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors).toContain('Password must contain at least one special character');
      });
    });
  });

  describe('Security Levels', () => {
    it('should use LOW security settings', () => {
      const lowSecurityService = PasswordService.withSecurityLevel('LOW');
      const config = lowSecurityService.getConfig();

      expect(config.saltRounds).toBe(8);
      expect(config.minLength).toBe(6);
      expect(config.requireSpecialChars).toBe(false);
    });

    it('should use MEDIUM security settings', () => {
      const mediumSecurityService = PasswordService.withSecurityLevel('MEDIUM');
      const config = mediumSecurityService.getConfig();

      expect(config.saltRounds).toBe(10);
      expect(config.minLength).toBe(8);
      expect(config.requireSpecialChars).toBe(false);
    });

    it('should use HIGH security settings', () => {
      const highSecurityService = PasswordService.withSecurityLevel('HIGH');
      const config = highSecurityService.getConfig();

      expect(config.saltRounds).toBe(12);
      expect(config.minLength).toBe(12);
      expect(config.requireSpecialChars).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should get current configuration', () => {
      const config = passwordService.getConfig();

      expect(config).toEqual({
        saltRounds: 10,
        minLength: 8,
        requireUpperCase: true,
        requireLowerCase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
      });
    });

    it('should create instance with custom configuration', () => {
      const customConfig: PasswordConfig = {
        saltRounds: 15,
        minLength: 10,
        requireUpperCase: true,
        requireLowerCase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        specialChars: '!@#'
      };

      const customService = PasswordService.withConfig(customConfig);
      const config = customService.getConfig();

      expect(config).toEqual(customConfig);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle password validation before hashing', async () => {
      const weakPassword = 'weak';
      const strongPassword = 'StrongPass123!';
      const hashedPassword = '$2b$10$mockHashedPassword';

      // Validate weak password
      const weakValidation = passwordService.validateStrength(weakPassword);
      expect(weakValidation.isValid).toBe(false);

      // Validate strong password
      const strongValidation = passwordService.validateStrength(strongPassword);
      expect(strongValidation.isValid).toBe(true);

      // Hash strong password
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);
      const hashedResult = await passwordService.hash(strongPassword);
      expect(hashedResult).toBe(hashedPassword);

      // Verify hashed password
      mockedBcrypt.compare.mockResolvedValue(true);
      const verifyResult = await passwordService.verify(strongPassword, hashedResult);
      expect(verifyResult).toBe(true);
    });

    it('should handle complete user registration flow', async () => {
      const userPassword = 'UserPass123!';
      const hashedPassword = '$2b$10$userHashedPassword';

      // Step 1: Validate password strength
      const validation = passwordService.validateStrength(userPassword);
      expect(validation.isValid).toBe(true);

      // Step 2: Hash password for storage
      mockedBcrypt.hash.mockResolvedValue(hashedPassword);
      const storedHash = await passwordService.hash(userPassword);

      // Step 3: Later, verify password during login
      mockedBcrypt.compare.mockResolvedValue(true);
      const isValid = await passwordService.verify(userPassword, storedHash);
      expect(isValid).toBe(true);

      // Step 4: Reject wrong password
      mockedBcrypt.compare.mockResolvedValue(false);
      const isInvalid = await passwordService.verify('WrongPassword123!', storedHash);
      expect(isInvalid).toBe(false);
    });
  });
});