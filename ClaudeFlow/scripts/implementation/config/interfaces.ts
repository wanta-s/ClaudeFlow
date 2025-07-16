/**
 * Configuration interfaces for the application
 */

/**
 * JWT configuration
 */
export interface IJwtConfig {
  secret: string;
  expiresIn: string;
  issuer?: string;
  audience?: string;
}

/**
 * Database configuration
 */
export interface IDatabaseConfig {
  uri: string;
  dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  logging?: boolean;
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

/**
 * Server configuration
 */
export interface IServerConfig {
  port: number;
  host: string;
  env: 'development' | 'test' | 'production';
}

/**
 * Security configuration
 */
export interface ISecurityConfig {
  bcryptSaltRounds: number;
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
}

/**
 * Logging configuration
 */
export interface ILoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  filename?: string;
}

/**
 * Main application configuration
 */
export interface IConfig {
  server: IServerConfig;
  database: IDatabaseConfig;
  jwt: IJwtConfig;
  security: ISecurityConfig;
  logging: ILoggingConfig;
}