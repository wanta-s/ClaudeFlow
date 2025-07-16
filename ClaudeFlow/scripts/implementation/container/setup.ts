/**
 * Container setup and service registration
 */
import 'reflect-metadata';
import { container } from './Container';
import { config } from '../config';
import { UserRepository } from '../repositories/UserRepository';
import { PasswordService } from '../passwordService';
import { TokenService } from '../services/TokenService';
import { RegisterService } from '../services/RegisterService';
import { LoginService } from '../loginService';
import { Logger } from '../utils/logger';
import { Sequelize } from 'sequelize';

/**
 * Setup dependency injection container
 */
export function setupContainer(): void {
  // Register config
  container.register('config', () => config);

  // Register database
  container.register('database', (c) => {
    const cfg = c.get<typeof config>('config');
    return new Sequelize(cfg.database.uri, {
      dialect: cfg.database.dialect,
      logging: cfg.database.logging ? console.log : false,
      pool: cfg.database.pool
    });
  });

  // Register logger
  container.register('logger', (c) => {
    const cfg = c.get<typeof config>('config');
    return new Logger(cfg.logging);
  });

  // Register repositories
  container.register('userRepository', (c) => {
    const db = c.get<Sequelize>('database');
    const logger = c.get<Logger>('logger');
    return new UserRepository(db, logger);
  });

  // Register services
  container.register('passwordService', (c) => {
    const cfg = c.get<typeof config>('config');
    const logger = c.get<Logger>('logger');
    return new PasswordService({
      saltRounds: cfg.security.bcryptSaltRounds,
      logger
    });
  });

  container.register('tokenService', (c) => {
    const cfg = c.get<typeof config>('config');
    const logger = c.get<Logger>('logger');
    return new TokenService(cfg.jwt, logger);
  });

  container.register('registerService', (c) => {
    const userRepository = c.get<UserRepository>('userRepository');
    const passwordService = c.get<PasswordService>('passwordService');
    const tokenService = c.get<TokenService>('tokenService');
    const logger = c.get<Logger>('logger');
    
    return new RegisterService(
      userRepository,
      passwordService,
      tokenService,
      logger
    );
  });

  container.register('loginService', (c) => {
    const userRepository = c.get<UserRepository>('userRepository');
    const passwordService = c.get<PasswordService>('passwordService');
    const tokenService = c.get<TokenService>('tokenService');
    const logger = c.get<Logger>('logger');
    
    return new LoginService(
      userRepository,
      passwordService,
      tokenService,
      logger
    );
  });
}

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<void> {
  const database = container.get<Sequelize>('database');
  const logger = container.get<Logger>('logger');
  
  try {
    await database.authenticate();
    logger.info('Database connection established successfully');
    
    // Sync models in development
    if (config.server.env === 'development') {
      await database.sync({ alter: true });
      logger.info('Database models synchronized');
    }
  } catch (error) {
    logger.error('Failed to initialize database', error);
    throw error;
  }
}