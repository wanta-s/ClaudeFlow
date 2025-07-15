import { UserService } from '../../../backend/src/services/userService';
import { UserRepository } from '../../../backend/src/repositories/userRepository';
import { AppError, ErrorCode } from '../../../backend/src/models/errors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('UserService', () => {
  let userService: UserService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    userService = new UserService(userRepository);
  });

  describe('createUser', () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: '1',
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      userRepository.create.mockResolvedValue(createdUser);

      const result = await userService.createUser(userData);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...userData,
        password: hashedPassword,
      });
      expect(result).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
      });
    });

    it('should throw error if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: userData.email,
      } as any);

      await expect(userService.createUser(userData)).rejects.toThrow(
        new AppError(ErrorCode.USER001, 400)
      );

      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should handle password hashing errors', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(userService.createUser(userData)).rejects.toThrow(
        'Hashing failed'
      );
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const user = {
        id: '1',
        email: loginData.email,
        password: 'hashedPassword',
        name: 'Test User',
      };
      const token = 'jwt-token';

      userRepository.findByEmail.mockResolvedValue(user as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(token);

      const result = await userService.login(loginData);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        user.password
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      expect(result).toEqual({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    });

    it('should throw error if user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.login(loginData)).rejects.toThrow(
        new AppError(ErrorCode.AUTH001, 401)
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      const user = {
        id: '1',
        email: loginData.email,
        password: 'hashedPassword',
      };

      userRepository.findByEmail.mockResolvedValue(user as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.login(loginData)).rejects.toThrow(
        new AppError(ErrorCode.AUTH001, 401)
      );

      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findById.mockResolvedValue(user as any);

      const result = await userService.findById('1');

      expect(userRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const result = await userService.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    const updateData = {
      name: 'Updated Name',
    };

    it('should update user successfully', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        name: updateData.name,
        updatedAt: new Date(),
      };

      userRepository.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateUser('1', updateData);

      expect(userRepository.update).toHaveBeenCalledWith('1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should hash password if updating password', async () => {
      const updateWithPassword = {
        password: 'newPassword123',
      };
      const hashedPassword = 'hashedNewPassword';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      userRepository.update.mockResolvedValue({} as any);

      await userService.updateUser('1', updateWithPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(updateWithPassword.password, 10);
      expect(userRepository.update).toHaveBeenCalledWith('1', {
        password: hashedPassword,
      });
    });
  });
});