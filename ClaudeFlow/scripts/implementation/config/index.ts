/**
 * Configuration module
 */
import { IConfig } from './interfaces';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Get configuration based on environment
 * @returns {IConfig} Application configuration
 */
export function getConfig(): IConfig {
  const env = process.env.NODE_ENV || 'development';

  return {
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || 'localhost',
      env: env as 'development' | 'test' | 'production'
    },
    database: {
      uri: process.env.DATABASE_URL || 'sqlite::memory:',
      dialect: (process.env.DB_DIALECT || 'sqlite') as any,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      logging: env === 'development',
      pool: {
        max: parseInt(process.env.DB_POOL_MAX || '5', 10),
        min: parseInt(process.env.DB_POOL_MIN || '0', 10),
        acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
        idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10)
      }
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'development-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: process.env.JWT_ISSUER || 'auth-service',
      audience: process.env.JWT_AUDIENCE || 'api'
    },
    security: {
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
      rateLimiting: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
      },
      cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
        credentials: process.env.CORS_CREDENTIALS === 'true'
      }
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as any,
      format: (process.env.LOG_FORMAT || 'json') as any,
      filename: process.env.LOG_FILE
    }
  };
}

// Export singleton instance
export const config = getConfig();

// Re-export interfaces
export * from './interfaces';