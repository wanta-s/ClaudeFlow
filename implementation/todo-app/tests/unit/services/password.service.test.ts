import { PasswordService, PasswordError, SecurityLevels } from '../../../src/services/password.service';

describe('PasswordService', () => {
  let service: PasswordService;
  
  beforeEach(() => {
    service = new PasswordService();
  });
  
  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await service.hash(password);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/); // bcrypt format
    });
    
    it('should throw error for null password', async () => {
      await expect(service.hash(null as any)).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should throw error for undefined password', async () => {
      await expect(service.hash(undefined as any)).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should throw error for empty string', async () => {
      await expect(service.hash('')).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should throw error for non-string input', async () => {
      await expect(service.hash(123 as any)).rejects.toThrow(PasswordError.INVALID_INPUT);
      await expect(service.hash({} as any)).rejects.toThrow(PasswordError.INVALID_INPUT);
      await expect(service.hash([] as any)).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should throw error for password exceeding max length', async () => {
      const longPassword = 'a'.repeat(129);
      await expect(service.hash(longPassword)).rejects.toThrow(PasswordError.TOO_LONG);
    });
    
    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await service.hash(password);
      
      const result = await service.verify(password, hash);
      expect(result).toBe(true);
    });
    
    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const hash = await service.hash(password);
      
      const result = await service.verify(wrongPassword, hash);
      expect(result).toBe(false);
    });
    
    it('should throw error for null password', async () => {
      const hash = await service.hash('TestPassword123');
      await expect(service.verify(null as any, hash)).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should throw error for null hash', async () => {
      await expect(service.verify('password', null as any)).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should throw error for empty password', async () => {
      const hash = await service.hash('TestPassword123');
      await expect(service.verify('', hash)).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should throw error for empty hash', async () => {
      await expect(service.verify('password', '')).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should throw error for invalid hash format', async () => {
      await expect(service.verify('password', 'invalid-hash')).rejects.toThrow(PasswordError.INVALID_INPUT);
      await expect(service.verify('password', '$1$invalid')).rejects.toThrow(PasswordError.INVALID_INPUT);
    });
    
    it('should handle case sensitivity', async () => {
      const password = 'TestPassword123';
      const hash = await service.hash(password);
      
      const result = await service.verify('testpassword123', hash);
      expect(result).toBe(false);
    });
  });
  
  describe('validateStrength', () => {
    it('should validate strong password', () => {
      const result = service.validateStrength('StrongPass123');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should handle null input', () => {
      const result = service.validateStrength(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(PasswordError.INVALID_INPUT);
    });
    
    it('should handle undefined input', () => {
      const result = service.validateStrength(undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(PasswordError.INVALID_INPUT);
    });
    
    it('should handle non-string input', () => {
      const result = service.validateStrength(123 as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(PasswordError.INVALID_INPUT);
    });
    
    it('should reject short password', () => {
      const result = service.validateStrength('Short1');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(PasswordError.TOO_SHORT))).toBe(true);
    });
    
    it('should reject long password', () => {
      const longPassword = 'a'.repeat(129);
      const result = service.validateStrength(longPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(PasswordError.TOO_LONG))).toBe(true);
    });
    
    it('should reject password without uppercase', () => {
      const result = service.validateStrength('weakpassword123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(PasswordError.MISSING_UPPERCASE))).toBe(true);
    });
    
    it('should reject password without lowercase', () => {
      const result = service.validateStrength('STRONGPASSWORD123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(PasswordError.MISSING_LOWERCASE))).toBe(true);
    });
    
    it('should reject password without numbers', () => {
      const result = service.validateStrength('StrongPassword');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(PasswordError.MISSING_NUMBER))).toBe(true);
    });
    
    it('should return multiple errors', () => {
      const result = service.validateStrength('weak');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
    
    it('should validate password at edge of min length', () => {
      const result = service.validateStrength('Pass123A');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate password at edge of max length', () => {
      const password = 'A1' + 'a'.repeat(125) + 'Z';
      const result = service.validateStrength(password);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
  
  describe('with custom configuration', () => {
    it('should use custom salt rounds', async () => {
      const customService = PasswordService.withConfig({ saltRounds: 5 });
      const password = 'TestPassword123';
      const hash = await customService.hash(password);
      
      expect(hash).toMatch(/^\$2[ab]\$05\$/); // 05 salt rounds
    });
    
    it('should validate with custom min length', () => {
      const customService = PasswordService.withConfig({ minLength: 4 });
      const result = customService.validateStrength('Ab1');
      
      expect(result.isValid).toBe(true);
    });
    
    it('should validate with special characters requirement', () => {
      const customService = PasswordService.withConfig({ requireSpecialChars: true });
      
      const result1 = customService.validateStrength('StrongPass123');
      expect(result1.isValid).toBe(false);
      expect(result1.errors.some(e => e.includes(PasswordError.MISSING_SPECIAL))).toBe(true);
      
      const result2 = customService.validateStrength('StrongPass123!');
      expect(result2.isValid).toBe(true);
    });
    
    it('should use custom special characters', () => {
      const customService = PasswordService.withConfig({ 
        requireSpecialChars: true,
        specialChars: '@#$'
      });
      
      const result1 = customService.validateStrength('StrongPass123!');
      expect(result1.isValid).toBe(false);
      
      const result2 = customService.validateStrength('StrongPass123@');
      expect(result2.isValid).toBe(true);
    });
  });
  
  describe('with security levels', () => {
    it('should use LOW security level', () => {
      const service = PasswordService.withSecurityLevel('LOW');
      const config = service.getConfig();
      
      expect(config.minLength).toBe(6);
      expect(config.requireUpperCase).toBe(false);
      expect(config.requireNumbers).toBe(false);
      
      const result = service.validateStrength('simple');
      expect(result.isValid).toBe(true);
    });
    
    it('should use MEDIUM security level', () => {
      const service = PasswordService.withSecurityLevel('MEDIUM');
      const config = service.getConfig();
      
      expect(config.minLength).toBe(8);
      expect(config.requireUpperCase).toBe(true);
      expect(config.requireNumbers).toBe(true);
      
      const result = service.validateStrength('Pass123word');
      expect(result.isValid).toBe(true);
    });
    
    it('should use HIGH security level', () => {
      const service = PasswordService.withSecurityLevel('HIGH');
      const config = service.getConfig();
      
      expect(config.minLength).toBe(12);
      expect(config.requireSpecialChars).toBe(true);
      
      const result1 = service.validateStrength('Pass123word');
      expect(result1.isValid).toBe(false);
      
      const result2 = service.validateStrength('Pass123word!@#');
      expect(result2.isValid).toBe(true);
    });
  });
  
  describe('getConfig', () => {
    it('should return copy of configuration', () => {
      const config = service.getConfig();
      config.minLength = 100;
      
      const newConfig = service.getConfig();
      expect(newConfig.minLength).toBe(8);
    });
  });
  
  describe('error messages', () => {
    it('should include context in error messages', async () => {
      try {
        await service.hash(null as any);
      } catch (error) {
        expect(error.message).toContain('Password must be a non-empty string');
      }
    });
    
    it('should include length requirements in validation errors', () => {
      const result = service.validateStrength('short');
      const lengthError = result.errors.find(e => e.includes(PasswordError.TOO_SHORT));
      
      expect(lengthError).toContain('Minimum length is 8');
    });
    
    it('should include special character list in validation errors', () => {
      const customService = PasswordService.withConfig({ 
        requireSpecialChars: true,
        specialChars: '@#$'
      });
      
      const result = customService.validateStrength('StrongPass123');
      const specialError = result.errors.find(e => e.includes(PasswordError.MISSING_SPECIAL));
      
      expect(specialError).toContain('@#$');
    });
  });
});