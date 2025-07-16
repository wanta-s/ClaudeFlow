import { Request, Response } from 'express';
import { AuthController } from '../../src/controllers/authController';
import { UserRepository } from '../../src/repositories/userRepository';
import { PasswordService } from '../../src/services/passwordService';
import { JwtService } from '../../src/services/jwtService';
import { User } from '../../src/models/user';
import { ValidationError, UnauthorizedError, NotFoundError } from '../../src/utils/errors';
import { logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/services/passwordService');
jest.mock('../../src/services/jwtService');
jest.mock('../../src/utils/logger');

const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const MockedPasswordService = PasswordService as jest.MockedClass<typeof PasswordService>;
const MockedJwtService = JwtService as jest.MockedClass<typeof JwtService>;

describe('AuthController', () => {
  let authController: AuthController;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockPasswordService: jest.Mocked<PasswordService>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockUser: jest.Mocked<User>;

  beforeEach(() => {
    // Create mock instances
    mockUserRepository = new MockedUserRepository(User) as jest.Mocked<UserRepository>;
    mockPasswordService = new MockedPasswordService({} as any) as jest.Mocked<PasswordService>;
    mockJwtService = new MockedJwtService({} as any) as jest.Mocked<JwtService>;

    // Create controller with mocked dependencies
    authController = new AuthController(mockUserRepository, mockPasswordService, mockJwtService);

    // Create mock user
    mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      tokenVersion: 0,
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

    // Setup request and response mocks
    mockReq = {
      body: {},
      user: undefined
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockReq.body = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      mockUserRepository.create.mockResolvedValue(mockUser);
      mockJwtService.generateAccessToken.mockReturnValue('access.token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh.token');

      await authController.register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith'
      });

      expect(mockJwtService.generateAccessToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'test@example.com'
      });

      expect(mockJwtService.generateRefreshToken).toHaveBeenCalledWith({
        userId: 1,
        tokenVersion: 0
      });

      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'refresh.token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockUser.toJSON(),
        accessToken: 'access.token'
      });
    });

    it('should handle registration errors', async () => {
      mockReq.body = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const error = new Error('Database error');
      mockUserRepository.create.mockRejectedValue(error);

      await authController.register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      mockReq.body = {
        email: 'new@example.com',
        // Missing password
        firstName: 'Jane',
        lastName: 'Smith'
      };

      mockUserRepository.create.mockRejectedValue(new ValidationError('Password is required'));

      await authController.register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle optional isActive field', async () => {
      mockReq.body = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: false
      };

      mockUserRepository.create.mockResolvedValue(mockUser);
      mockJwtService.generateAccessToken.mockReturnValue('access.token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh.token');

      await authController.register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: false
      });
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockJwtService.generateAccessToken.mockReturnValue('access.token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh.token');

      await authController.login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('Password123!');
      expect(mockJwtService.generateAccessToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'test@example.com'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockUser.toJSON(),
        accessToken: 'access.token'
      });
    });

    it('should return error for non-existent user', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await authController.login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('Invalid email or password'));
      expect(mockUser.comparePassword).not.toHaveBeenCalled();
    });

    it('should return error for incorrect password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      await authController.login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('Invalid email or password'));
      expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should return error for inactive user', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser as any);
      inactiveUser.comparePassword.mockResolvedValue(true);

      await authController.login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('Account is disabled'));
    });

    it('should handle database errors', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const error = new Error('Database error');
      mockUserRepository.findByEmail.mockRejectedValue(error);

      await authController.login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should log failed login attempts', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      await authController.login(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Failed login attempt', {
        email: 'test@example.com'
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockReq.body = {
        refreshToken: 'valid.refresh.token'
      };

      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 1,
        tokenVersion: 0
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.generateAccessToken.mockReturnValue('new.access.token');
      mockJwtService.generateRefreshToken.mockReturnValue('new.refresh.token');

      await authController.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwtService.verifyRefreshToken).toHaveBeenCalledWith('valid.refresh.token');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: 'new.access.token'
      });
    });

    it('should return error for invalid refresh token', async () => {
      mockReq.body = {
        refreshToken: 'invalid.refresh.token'
      };

      mockJwtService.verifyRefreshToken.mockImplementation(() => {
        throw new UnauthorizedError('Invalid refresh token');
      });

      await authController.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('Invalid refresh token'));
    });

    it('should return error for non-existent user', async () => {
      mockReq.body = {
        refreshToken: 'valid.refresh.token'
      };

      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 999,
        tokenVersion: 0
      });
      mockUserRepository.findById.mockResolvedValue(null);

      await authController.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('User not found'));
    });

    it('should return error for mismatched token version', async () => {
      mockReq.body = {
        refreshToken: 'valid.refresh.token'
      };

      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 1,
        tokenVersion: 0
      });
      const userWithNewVersion = { ...mockUser, tokenVersion: 1 };
      mockUserRepository.findById.mockResolvedValue(userWithNewVersion as any);

      await authController.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('Invalid refresh token'));
    });

    it('should return error for inactive user', async () => {
      mockReq.body = {
        refreshToken: 'valid.refresh.token'
      };

      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 1,
        tokenVersion: 0
      });
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findById.mockResolvedValue(inactiveUser as any);

      await authController.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('Account is disabled'));
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockReq.user = { userId: 1, email: 'test@example.com' };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await authController.logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(mockUser.incrementTokenVersion).toHaveBeenCalled();
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 0
      });
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should return error if user not found', async () => {
      mockReq.user = { userId: 999, email: 'test@example.com' };

      mockUserRepository.findById.mockResolvedValue(null);

      await authController.logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new NotFoundError('User not found'));
    });

    it('should handle missing user in request', async () => {
      mockReq.user = undefined;

      await authController.logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('User not authenticated'));
    });

    it('should log logout action', async () => {
      mockReq.user = { userId: 1, email: 'test@example.com' };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await authController.logout(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('User logged out', {
        userId: 1,
        email: 'test@example.com'
      });
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      mockReq.user = { userId: 1, email: 'test@example.com' };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await authController.getProfile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith(mockUser.toJSON());
    });

    it('should return error if user not found', async () => {
      mockReq.user = { userId: 999, email: 'test@example.com' };

      mockUserRepository.findById.mockResolvedValue(null);

      await authController.getProfile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new NotFoundError('User not found'));
    });

    it('should handle missing user in request', async () => {
      mockReq.user = undefined;

      await authController.getProfile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new UnauthorizedError('User not authenticated'));
    });

    it('should handle database errors', async () => {
      mockReq.user = { userId: 1, email: 'test@example.com' };

      const error = new Error('Database error');
      mockUserRepository.findById.mockRejectedValue(error);

      await authController.getProfile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});