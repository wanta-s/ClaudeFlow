import { Sequelize } from 'sequelize';
import { User } from '../../src/models/user';
import { PasswordService } from '../../src/services/passwordService';
import { config } from '../../src/utils/config';

// Mock password service
jest.mock('../../src/services/passwordService');
const MockedPasswordService = PasswordService as jest.MockedClass<typeof PasswordService>;

describe('User Model', () => {
  let sequelize: Sequelize;
  let passwordService: jest.Mocked<PasswordService>;

  beforeAll(async () => {
    // Create in-memory SQLite database for testing
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    
    // Initialize User model
    User.initModel(sequelize);
    
    // Create tables
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Clear all data before each test
    await User.destroy({ where: {}, truncate: true });
    
    // Reset password service mock
    passwordService = new MockedPasswordService(config) as jest.Mocked<PasswordService>;
    passwordService.hash.mockImplementation(async (password) => `hashed_${password}`);
    passwordService.compare.mockImplementation(async (plain, hashed) => hashed === `hashed_${plain}`);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(User.tableName).toBe('users');
    });

    it('should have correct attributes', () => {
      const attributes = User.getAttributes();
      
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('email');
      expect(attributes).toHaveProperty('password');
      expect(attributes).toHaveProperty('firstName');
      expect(attributes).toHaveProperty('lastName');
      expect(attributes).toHaveProperty('isActive');
      expect(attributes).toHaveProperty('tokenVersion');
      expect(attributes).toHaveProperty('createdAt');
      expect(attributes).toHaveProperty('updatedAt');
    });

    it('should have correct attribute types', () => {
      const attributes = User.getAttributes();
      
      expect(attributes.id.type.constructor.name).toBe('INTEGER');
      expect(attributes.email.type.constructor.name).toBe('STRING');
      expect(attributes.password.type.constructor.name).toBe('STRING');
      expect(attributes.firstName.type.constructor.name).toBe('STRING');
      expect(attributes.lastName.type.constructor.name).toBe('STRING');
      expect(attributes.isActive.type.constructor.name).toBe('BOOLEAN');
      expect(attributes.tokenVersion.type.constructor.name).toBe('INTEGER');
    });
  });

  describe('Validations', () => {
    it('should validate required fields', async () => {
      const user = User.build({});
      
      await expect(user.validate()).rejects.toThrow();
      
      try {
        await user.validate();
      } catch (error: any) {
        expect(error.errors).toContainEqual(
          expect.objectContaining({ path: 'email' })
        );
        expect(error.errors).toContainEqual(
          expect.objectContaining({ path: 'password' })
        );
      }
    });

    it('should validate email format', async () => {
      const user = User.build({
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await expect(user.validate()).rejects.toThrow();
      
      try {
        await user.validate();
      } catch (error: any) {
        expect(error.errors).toContainEqual(
          expect.objectContaining({ 
            path: 'email',
            validatorKey: 'isEmail'
          })
        );
      }
    });

    it('should validate email uniqueness', async () => {
      // Create first user
      await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      // Try to create second user with same email
      const duplicateUser = User.build({
        email: 'test@example.com',
        password: 'Password456!',
        firstName: 'Jane',
        lastName: 'Smith'
      });
      
      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should validate password length', async () => {
      const user = User.build({
        email: 'test@example.com',
        password: 'short',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await expect(user.validate()).rejects.toThrow();
      
      try {
        await user.validate();
      } catch (error: any) {
        expect(error.errors).toContainEqual(
          expect.objectContaining({ 
            path: 'password',
            message: 'Password must be at least 8 characters long'
          })
        );
      }
    });

    it('should validate firstName length', async () => {
      const user = User.build({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'J',
        lastName: 'Doe'
      });
      
      await expect(user.validate()).rejects.toThrow();
      
      try {
        await user.validate();
      } catch (error: any) {
        expect(error.errors).toContainEqual(
          expect.objectContaining({ 
            path: 'firstName',
            message: 'First name must be between 2 and 50 characters'
          })
        );
      }
    });

    it('should accept valid user data', async () => {
      const user = User.build({
        email: 'valid@example.com',
        password: 'ValidPassword123!',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      await expect(user.validate()).resolves.not.toThrow();
    });
  });

  describe('Hooks', () => {
    it('should hash password before create', async () => {
      User.setPasswordService(passwordService);
      
      const plainPassword = 'Password123!';
      const user = await User.create({
        email: 'test@example.com',
        password: plainPassword,
        firstName: 'John',
        lastName: 'Doe'
      });
      
      expect(passwordService.hash).toHaveBeenCalledWith(plainPassword);
      expect(user.password).toBe(`hashed_${plainPassword}`);
    });

    it('should hash password before update if changed', async () => {
      User.setPasswordService(passwordService);
      
      const user = await User.create({
        email: 'test@example.com',
        password: 'OldPassword123!',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      passwordService.hash.mockClear();
      
      const newPassword = 'NewPassword123!';
      user.password = newPassword;
      await user.save();
      
      expect(passwordService.hash).toHaveBeenCalledWith(newPassword);
      expect(user.password).toBe(`hashed_${newPassword}`);
    });

    it('should not hash password if not changed', async () => {
      User.setPasswordService(passwordService);
      
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      passwordService.hash.mockClear();
      
      user.firstName = 'Jane';
      await user.save();
      
      expect(passwordService.hash).not.toHaveBeenCalled();
    });
  });

  describe('Instance Methods', () => {
    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        User.setPasswordService(passwordService);
        
        const plainPassword = 'Password123!';
        const user = await User.create({
          email: 'test@example.com',
          password: plainPassword,
          firstName: 'John',
          lastName: 'Doe'
        });
        
        const result = await user.comparePassword(plainPassword);
        
        expect(passwordService.compare).toHaveBeenCalledWith(plainPassword, `hashed_${plainPassword}`);
        expect(result).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        User.setPasswordService(passwordService);
        
        const user = await User.create({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });
        
        const result = await user.comparePassword('WrongPassword123!');
        
        expect(result).toBe(false);
      });
    });

    describe('incrementTokenVersion', () => {
      it('should increment token version', async () => {
        const user = await User.create({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });
        
        expect(user.tokenVersion).toBe(0);
        
        await user.incrementTokenVersion();
        
        expect(user.tokenVersion).toBe(1);
        
        // Verify it's persisted
        const reloadedUser = await User.findByPk(user.id);
        expect(reloadedUser?.tokenVersion).toBe(1);
      });

      it('should handle multiple increments', async () => {
        const user = await User.create({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });
        
        await user.incrementTokenVersion();
        await user.incrementTokenVersion();
        await user.incrementTokenVersion();
        
        expect(user.tokenVersion).toBe(3);
      });
    });

    describe('toJSON', () => {
      it('should exclude password from JSON output', async () => {
        const user = await User.create({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });
        
        const json = user.toJSON();
        
        expect(json).not.toHaveProperty('password');
        expect(json).toHaveProperty('id');
        expect(json).toHaveProperty('email');
        expect(json).toHaveProperty('firstName');
        expect(json).toHaveProperty('lastName');
      });

      it('should exclude tokenVersion from JSON output', async () => {
        const user = await User.create({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });
        
        const json = user.toJSON();
        
        expect(json).not.toHaveProperty('tokenVersion');
      });
    });
  });

  describe('Default Values', () => {
    it('should set default values correctly', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      expect(user.isActive).toBe(true);
      expect(user.tokenVersion).toBe(0);
    });

    it('should allow overriding default values', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        isActive: false,
        tokenVersion: 5
      });
      
      expect(user.isActive).toBe(false);
      expect(user.tokenVersion).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with special characters', async () => {
      const user = await User.create({
        email: 'user+tag@sub.example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      expect(user.email).toBe('user+tag@sub.example.com');
    });

    it('should handle names with special characters', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: "O'Brien",
        lastName: 'José-María'
      });
      
      expect(user.firstName).toBe("O'Brien");
      expect(user.lastName).toBe('José-María');
    });

    it('should handle maximum length values', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'A'.repeat(50),
        lastName: 'B'.repeat(50)
      });
      
      expect(user.firstName.length).toBe(50);
      expect(user.lastName.length).toBe(50);
    });

    it('should reject names exceeding maximum length', async () => {
      const user = User.build({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'A'.repeat(51),
        lastName: 'Doe'
      });
      
      await expect(user.validate()).rejects.toThrow();
    });
  });
});