import { UserRepository } from '../../src/repositories/userRepository';
import { User } from '../../src/models/user';
import { IUserCreationAttributes } from '../../src/types';
import { ConflictError, NotFoundError } from '../../src/utils/errors';
import { Op } from 'sequelize';

// Mock User model
jest.mock('../../src/models/user');
const MockedUser = User as jest.MockedClass<typeof User>;

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockUserInstance: jest.Mocked<User>;

  beforeEach(() => {
    userRepository = new UserRepository(MockedUser);
    
    // Create mock user instance
    mockUserInstance = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      comparePassword: jest.fn(),
      incrementTokenVersion: jest.fn(),
      toJSON: jest.fn().mockReturnValue({
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      })
    } as any;
    
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData: IUserCreationAttributes = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      MockedUser.findOne.mockResolvedValue(null);
      MockedUser.create.mockResolvedValue(mockUserInstance as any);

      const result = await userRepository.create(userData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: userData.email }
      });
      expect(MockedUser.create).toHaveBeenCalledWith(userData);
      expect(result).toBe(mockUserInstance);
    });

    it('should throw ConflictError if email already exists', async () => {
      const userData: IUserCreationAttributes = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      MockedUser.findOne.mockResolvedValue(mockUserInstance as any);

      await expect(userRepository.create(userData)).rejects.toThrow(ConflictError);
      await expect(userRepository.create(userData)).rejects.toThrow('User with this email already exists');
      
      expect(MockedUser.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during creation', async () => {
      const userData: IUserCreationAttributes = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      MockedUser.findOne.mockResolvedValue(null);
      MockedUser.create.mockRejectedValue(new Error('Database error'));

      await expect(userRepository.create(userData)).rejects.toThrow('Failed to create user');
      
      expect(MockedUser.findOne).toHaveBeenCalled();
      expect(MockedUser.create).toHaveBeenCalled();
    });

    it('should handle database errors during existence check', async () => {
      const userData: IUserCreationAttributes = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      MockedUser.findOne.mockRejectedValue(new Error('Database connection error'));

      await expect(userRepository.create(userData)).rejects.toThrow('Failed to create user');
      
      expect(MockedUser.create).not.toHaveBeenCalled();
    });

    it('should create user with optional fields', async () => {
      const userData: IUserCreationAttributes = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: false
      };

      MockedUser.findOne.mockResolvedValue(null);
      MockedUser.create.mockResolvedValue(mockUserInstance as any);

      await userRepository.create(userData);

      expect(MockedUser.create).toHaveBeenCalledWith(userData);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      MockedUser.findByPk.mockResolvedValue(mockUserInstance as any);

      const result = await userRepository.findById(1);

      expect(MockedUser.findByPk).toHaveBeenCalledWith(1);
      expect(result).toBe(mockUserInstance);
    });

    it('should return null for non-existent user', async () => {
      MockedUser.findByPk.mockResolvedValue(null);

      const result = await userRepository.findById(999);

      expect(MockedUser.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      MockedUser.findByPk.mockRejectedValue(new Error('Database error'));

      await expect(userRepository.findById(1)).rejects.toThrow('Failed to find user by id');
    });

    it('should handle negative ids', async () => {
      MockedUser.findByPk.mockResolvedValue(null);

      const result = await userRepository.findById(-1);

      expect(MockedUser.findByPk).toHaveBeenCalledWith(-1);
      expect(result).toBeNull();
    });

    it('should handle very large ids', async () => {
      const largeId = Number.MAX_SAFE_INTEGER;
      MockedUser.findByPk.mockResolvedValue(null);

      const result = await userRepository.findById(largeId);

      expect(MockedUser.findByPk).toHaveBeenCalledWith(largeId);
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      MockedUser.findOne.mockResolvedValue(mockUserInstance as any);

      const result = await userRepository.findByEmail('test@example.com');

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(result).toBe(mockUserInstance);
    });

    it('should return null for non-existent email', async () => {
      MockedUser.findOne.mockResolvedValue(null);

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' }
      });
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      MockedUser.findOne.mockRejectedValue(new Error('Database error'));

      await expect(userRepository.findByEmail('test@example.com')).rejects.toThrow('Failed to find user by email');
    });

    it('should handle email with special characters', async () => {
      const specialEmail = 'user+tag@sub.example.com';
      MockedUser.findOne.mockResolvedValue(mockUserInstance as any);

      const result = await userRepository.findByEmail(specialEmail);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: specialEmail }
      });
      expect(result).toBe(mockUserInstance);
    });

    it('should handle empty email string', async () => {
      MockedUser.findOne.mockResolvedValue(null);

      const result = await userRepository.findByEmail('');

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { email: '' }
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = { firstName: 'Updated', lastName: 'Name' };
      const updatedUser = { ...mockUserInstance, ...updateData };

      MockedUser.findByPk.mockResolvedValue(mockUserInstance as any);
      mockUserInstance.update = jest.fn().mockResolvedValue(updatedUser);

      const result = await userRepository.update(1, updateData);

      expect(MockedUser.findByPk).toHaveBeenCalledWith(1);
      expect(mockUserInstance.update).toHaveBeenCalledWith(updateData);
      expect(result).toBe(updatedUser);
    });

    it('should throw NotFoundError if user not found', async () => {
      MockedUser.findByPk.mockResolvedValue(null);

      await expect(userRepository.update(999, { firstName: 'Test' })).rejects.toThrow(NotFoundError);
      await expect(userRepository.update(999, { firstName: 'Test' })).rejects.toThrow('User not found');
    });

    it('should handle database errors during find', async () => {
      MockedUser.findByPk.mockRejectedValue(new Error('Database error'));

      await expect(userRepository.update(1, { firstName: 'Test' })).rejects.toThrow('Failed to update user');
    });

    it('should handle database errors during update', async () => {
      MockedUser.findByPk.mockResolvedValue(mockUserInstance as any);
      mockUserInstance.update = jest.fn().mockRejectedValue(new Error('Update error'));

      await expect(userRepository.update(1, { firstName: 'Test' })).rejects.toThrow('Failed to update user');
    });

    it('should update multiple fields', async () => {
      const updateData = {
        firstName: 'New',
        lastName: 'Name',
        isActive: false
      };

      MockedUser.findByPk.mockResolvedValue(mockUserInstance as any);
      mockUserInstance.update = jest.fn().mockResolvedValue(mockUserInstance);

      await userRepository.update(1, updateData);

      expect(mockUserInstance.update).toHaveBeenCalledWith(updateData);
    });

    it('should handle password updates', async () => {
      const updateData = { password: 'NewPassword123!' };

      MockedUser.findByPk.mockResolvedValue(mockUserInstance as any);
      mockUserInstance.update = jest.fn().mockResolvedValue(mockUserInstance);

      await userRepository.update(1, updateData);

      expect(mockUserInstance.update).toHaveBeenCalledWith(updateData);
    });

    it('should handle empty update data', async () => {
      MockedUser.findByPk.mockResolvedValue(mockUserInstance as any);
      mockUserInstance.update = jest.fn().mockResolvedValue(mockUserInstance);

      const result = await userRepository.update(1, {});

      expect(mockUserInstance.update).toHaveBeenCalledWith({});
      expect(result).toBe(mockUserInstance);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      MockedUser.findByPk.mockResolvedValue(mockUserInstance as any);
      mockUserInstance.destroy = jest.fn().mockResolvedValue(undefined);

      await userRepository.delete(1);

      expect(MockedUser.findByPk).toHaveBeenCalledWith(1);
      expect(mockUserInstance.destroy).toHaveBeenCalled();
    });

    it('should throw NotFoundError if user not found', async () => {
      MockedUser.findByPk.mockResolvedValue(null);

      await expect(userRepository.delete(999)).rejects.toThrow(NotFoundError);
      await expect(userRepository.delete(999)).rejects.toThrow('User not found');
    });

    it('should handle database errors during find', async () => {
      MockedUser.findByPk.mockRejectedValue(new Error('Database error'));

      await expect(userRepository.delete(1)).rejects.toThrow('Failed to delete user');
    });

    it('should handle database errors during destroy', async () => {
      MockedUser.findByPk.mockResolvedValue(mockUserInstance as any);
      mockUserInstance.destroy = jest.fn().mockRejectedValue(new Error('Destroy error'));

      await expect(userRepository.delete(1)).rejects.toThrow('Failed to delete user');
    });
  });

  describe('findAll', () => {
    it('should find all users with default options', async () => {
      const mockUsers = [mockUserInstance, { ...mockUserInstance, id: 2 }];
      MockedUser.findAll.mockResolvedValue(mockUsers as any);

      const result = await userRepository.findAll();

      expect(MockedUser.findAll).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
        order: [['createdAt', 'DESC']]
      });
      expect(result).toBe(mockUsers);
    });

    it('should find all users with custom options', async () => {
      const mockUsers = [mockUserInstance];
      MockedUser.findAll.mockResolvedValue(mockUsers as any);

      const result = await userRepository.findAll({
        limit: 50,
        offset: 10,
        where: { isActive: true }
      });

      expect(MockedUser.findAll).toHaveBeenCalledWith({
        limit: 50,
        offset: 10,
        where: { isActive: true },
        order: [['createdAt', 'DESC']]
      });
      expect(result).toBe(mockUsers);
    });

    it('should handle empty results', async () => {
      MockedUser.findAll.mockResolvedValue([]);

      const result = await userRepository.findAll();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      MockedUser.findAll.mockRejectedValue(new Error('Database error'));

      await expect(userRepository.findAll()).rejects.toThrow('Failed to find users');
    });

    it('should handle complex where conditions', async () => {
      const mockUsers = [mockUserInstance];
      MockedUser.findAll.mockResolvedValue(mockUsers as any);

      const result = await userRepository.findAll({
        where: {
          [Op.or]: [
            { email: { [Op.like]: '%@example.com' } },
            { isActive: false }
          ]
        }
      });

      expect(MockedUser.findAll).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
        where: {
          [Op.or]: [
            { email: { [Op.like]: '%@example.com' } },
            { isActive: false }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
    });

    it('should handle custom ordering', async () => {
      const mockUsers = [mockUserInstance];
      MockedUser.findAll.mockResolvedValue(mockUsers as any);

      const result = await userRepository.findAll({
        order: [['email', 'ASC']]
      });

      expect(MockedUser.findAll).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
        order: [['email', 'ASC']]
      });
    });

    it('should handle large limit values', async () => {
      const mockUsers = Array(1000).fill(mockUserInstance);
      MockedUser.findAll.mockResolvedValue(mockUsers as any);

      const result = await userRepository.findAll({ limit: 1000 });

      expect(MockedUser.findAll).toHaveBeenCalledWith({
        limit: 1000,
        offset: 0,
        order: [['createdAt', 'DESC']]
      });
      expect(result.length).toBe(1000);
    });
  });
});