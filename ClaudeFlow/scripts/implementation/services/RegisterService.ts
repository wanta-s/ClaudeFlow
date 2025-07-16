/**
 * User registration service
 */
import { PasswordService } from '../passwordService';
import { UserRepository } from '../repositories/UserRepository';
import { TokenService } from './TokenService';
import { ValidationError, ConflictError, AppError } from '../errors/AppError';
import { Logger } from '../utils/logger';
import { User } from '../models/User';

/**
 * Registration request interface
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * Registration response interface
 */
export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * User registration service
 */
export class RegisterService {
  private userRepository: UserRepository;
  private passwordService: PasswordService;
  private tokenService: TokenService;
  private logger: Logger;

  /**
   * Create a registration service instance
   * @param {UserRepository} userRepository - User repository
   * @param {PasswordService} passwordService - Password service
   * @param {TokenService} tokenService - Token service
   * @param {Logger} logger - Logger instance
   */
  constructor(
    userRepository: UserRepository,
    passwordService: PasswordService,
    tokenService: TokenService,
    logger: Logger
  ) {
    this.userRepository = userRepository;
    this.passwordService = passwordService;
    this.tokenService = tokenService;
    this.logger = logger;
  }

  /**
   * Register a new user
   * @param {RegisterRequest} request - Registration request
   * @returns {Promise<RegisterResponse>} Registration response
   * @throws {ValidationError} Invalid input
   * @throws {ConflictError} User already exists
   * @throws {AppError} Registration failed
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, name } = request;

    // Log registration attempt
    this.logger.info('Registration attempt', { email });

    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        this.logger.warn('Registration failed - user exists', { email });
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await this.passwordService.hash(password);

      // Create user
      const user = await this.userRepository.create({
        email: email.toLowerCase(),
        name,
        passwordHash
      });

      // Generate tokens
      const tokens = await this.tokenService.generateTokenPair(user);

      // Log successful registration
      this.logger.info('User registered successfully', { userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        tokens
      };
    } catch (error) {
      // Re-throw known errors
      if (error instanceof ConflictError) {
        throw error;
      }

      // Log and wrap unknown errors
      this.logger.error('Registration failed', { email, error });
      throw new AppError('Failed to register user', 500, 'REGISTRATION_ERROR');
    }
  }

  /**
   * Validate registration input
   * @param {RegisterRequest} request - Registration request
   * @throws {ValidationError} Invalid input
   */
  private validateInput(request: RegisterRequest): void {
    const errors = [];

    if (!request.email) {
      errors.push({ field: 'email', message: 'Email is required' });
    }

    if (!request.password) {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    if (!request.name) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid registration data', errors);
    }
  }
}