/**
 * User repository implementation
 */
import { User, UserCreationAttributes } from '../models/User';
import { IUserRepository } from '../loginService';
import { Sequelize } from 'sequelize';
import { DatabaseError, ConflictError } from '../errors/AppError';
import { Logger } from '../utils/logger';

/**
 * User repository for database operations
 */
export class UserRepository implements IUserRepository {
  private database: Sequelize;
  private logger: Logger;

  /**
   * Create a user repository instance
   * @param {Sequelize} database - Database connection
   * @param {Logger} logger - Logger instance
   */
  constructor(database: Sequelize, logger: Logger) {
    this.database = database;
    this.logger = logger;
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<User | null>} User instance or null
   * @throws {DatabaseError} Database operation error
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await User.findOne({ where: { email } });
    } catch (error) {
      this.logger.error('Failed to find user by email', { email, error });
      throw new DatabaseError('Failed to retrieve user');
    }
  }

  /**
   * Create a new user
   * @param {UserCreationAttributes} data - User data
   * @returns {Promise<User>} Created user
   * @throws {ConflictError} User already exists
   * @throws {DatabaseError} Database operation error
   */
  async create(data: UserCreationAttributes): Promise<User> {
    try {
      return await User.create(data);
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        this.logger.warn('Attempted to create duplicate user', { email: data.email });
        throw new ConflictError('User with this email already exists');
      }
      this.logger.error('Failed to create user', { data, error });
      throw new DatabaseError('Failed to create user');
    }
  }

  /**
   * Check if a user exists by email
   * @param {string} email - User email
   * @returns {Promise<boolean>} True if user exists
   * @throws {DatabaseError} Database operation error
   */
  async existsByEmail(email: string): Promise<boolean> {
    try {
      const count = await User.count({ where: { email } });
      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check user existence', { email, error });
      throw new DatabaseError('Failed to check user existence');
    }
  }

  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Promise<User | null>} User instance or null
   * @throws {DatabaseError} Database operation error
   */
  async findById(id: string): Promise<User | null> {
    try {
      return await User.findByPk(id);
    } catch (error) {
      this.logger.error('Failed to find user by ID', { id, error });
      throw new DatabaseError('Failed to retrieve user');
    }
  }

  /**
   * Update a user
   * @param {string} id - User ID
   * @param {Partial<UserCreationAttributes>} data - Update data
   * @returns {Promise<User | null>} Updated user or null
   * @throws {DatabaseError} Database operation error
   */
  async update(id: string, data: Partial<UserCreationAttributes>): Promise<User | null> {
    try {
      const [affected, users] = await User.update(data, {
        where: { id },
        returning: true
      });
      return affected > 0 ? users[0] : null;
    } catch (error) {
      this.logger.error('Failed to update user', { id, data, error });
      throw new DatabaseError('Failed to update user');
    }
  }
}