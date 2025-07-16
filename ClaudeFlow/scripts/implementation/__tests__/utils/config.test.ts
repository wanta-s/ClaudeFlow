import { config, validateConfig } from '../../src/utils/config';

describe('Config Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        nodeEnv: 'development',
        port: 3000,
        database: {
          url: 'postgres://localhost:5432/testdb',
          logging: false,
          pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
          }
        },
        jwt: {
          secret: 'test-secret-key-that-is-long-enough',
          expiresIn: '24h',
          refreshExpiresIn: '7d'
        },
        cors: {
          origin: 'http://localhost:3000',
          credentials: true
        },
        bcrypt: {
          saltRounds: 10
        },
        rateLimit: {
          windowMs: 900000,
          max: 100
        }
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const invalidConfig = {
        nodeEnv: 'development',
        port: 3000,
        // Missing database field
        jwt: {
          secret: 'test-secret',
          expiresIn: '24h',
          refreshExpiresIn: '7d'
        }
      };

      expect(() => validateConfig(invalidConfig as any)).toThrow('Invalid configuration');
    });

    it('should throw error for invalid port number', () => {
      const invalidConfig = {
        nodeEnv: 'development',
        port: -1, // Invalid port
        database: {
          url: 'postgres://localhost:5432/testdb',
          logging: false,
          pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
          }
        },
        jwt: {
          secret: 'test-secret-key-that-is-long-enough',
          expiresIn: '24h',
          refreshExpiresIn: '7d'
        }
      };

      expect(() => validateConfig(invalidConfig as any)).toThrow();
    });

    it('should throw error for short JWT secret', () => {
      const invalidConfig = {
        nodeEnv: 'development',
        port: 3000,
        database: {
          url: 'postgres://localhost:5432/testdb',
          logging: false,
          pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
          }
        },
        jwt: {
          secret: 'short', // Too short
          expiresIn: '24h',
          refreshExpiresIn: '7d'
        }
      };

      expect(() => validateConfig(invalidConfig as any)).toThrow();
    });

    it('should throw error for invalid node environment', () => {
      const invalidConfig = {
        nodeEnv: 'invalid-env', // Invalid environment
        port: 3000,
        database: {
          url: 'postgres://localhost:5432/testdb',
          logging: false,
          pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
          }
        },
        jwt: {
          secret: 'test-secret-key-that-is-long-enough',
          expiresIn: '24h',
          refreshExpiresIn: '7d'
        }
      };

      expect(() => validateConfig(invalidConfig as any)).toThrow();
    });
  });

  describe('config object', () => {
    it('should use default values when environment variables are not set', () => {
      // Clear relevant environment variables
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      // Set required values
      process.env.DATABASE_URL = 'postgres://localhost:5432/testdb';
      process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough';

      // Re-import to get fresh config
      jest.resetModules();
      const { config: freshConfig } = require('../../src/utils/config');

      expect(freshConfig.nodeEnv).toBe('development');
      expect(freshConfig.port).toBe(3000);
      expect(freshConfig.jwt.expiresIn).toBe('24h');
      expect(freshConfig.bcrypt.saltRounds).toBe(10);
    });

    it('should use environment variables when set', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '4000';
      process.env.DATABASE_URL = 'postgres://prod:5432/proddb';
      process.env.JWT_SECRET = 'production-secret-key-that-is-long-enough';
      process.env.JWT_EXPIRES_IN = '12h';
      process.env.BCRYPT_SALT_ROUNDS = '12';

      // Re-import to get fresh config
      jest.resetModules();
      const { config: freshConfig } = require('../../src/utils/config');

      expect(freshConfig.nodeEnv).toBe('production');
      expect(freshConfig.port).toBe(4000);
      expect(freshConfig.database.url).toBe('postgres://prod:5432/proddb');
      expect(freshConfig.jwt.secret).toBe('production-secret-key-that-is-long-enough');
      expect(freshConfig.jwt.expiresIn).toBe('12h');
      expect(freshConfig.bcrypt.saltRounds).toBe(12);
    });

    it('should handle CORS configuration from environment', () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      process.env.DATABASE_URL = 'postgres://localhost:5432/testdb';
      process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough';

      // Re-import to get fresh config
      jest.resetModules();
      const { config: freshConfig } = require('../../src/utils/config');

      expect(freshConfig.cors.origin).toBe('https://example.com');
      expect(freshConfig.cors.credentials).toBe(true);
    });

    it('should handle rate limit configuration from environment', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '600000';
      process.env.RATE_LIMIT_MAX = '50';
      process.env.DATABASE_URL = 'postgres://localhost:5432/testdb';
      process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough';

      // Re-import to get fresh config
      jest.resetModules();
      const { config: freshConfig } = require('../../src/utils/config');

      expect(freshConfig.rateLimit.windowMs).toBe(600000);
      expect(freshConfig.rateLimit.max).toBe(50);
    });

    it('should set database logging to true in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgres://localhost:5432/testdb';
      process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough';

      // Re-import to get fresh config
      jest.resetModules();
      const { config: freshConfig } = require('../../src/utils/config');

      expect(freshConfig.database.logging).toBe(true);
    });

    it('should set database logging to false in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://localhost:5432/testdb';
      process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough';

      // Re-import to get fresh config
      jest.resetModules();
      const { config: freshConfig } = require('../../src/utils/config');

      expect(freshConfig.database.logging).toBe(false);
    });
  });
});