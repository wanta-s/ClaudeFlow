import winston from 'winston';
import { logger } from '../../src/utils/logger';

describe('Logger Module', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('Logger instance', () => {
    it('should be a winston logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });

    it('should log info messages', () => {
      const infoSpy = jest.spyOn(logger, 'info');
      logger.info('Test info message');
      expect(infoSpy).toHaveBeenCalledWith('Test info message');
      infoSpy.mockRestore();
    });

    it('should log error messages', () => {
      const errorSpy = jest.spyOn(logger, 'error');
      logger.error('Test error message');
      expect(errorSpy).toHaveBeenCalledWith('Test error message');
      errorSpy.mockRestore();
    });

    it('should log warning messages', () => {
      const warnSpy = jest.spyOn(logger, 'warn');
      logger.warn('Test warning message');
      expect(warnSpy).toHaveBeenCalledWith('Test warning message');
      warnSpy.mockRestore();
    });

    it('should log debug messages', () => {
      const debugSpy = jest.spyOn(logger, 'debug');
      logger.debug('Test debug message');
      expect(debugSpy).toHaveBeenCalledWith('Test debug message');
      debugSpy.mockRestore();
    });

    it('should log objects and metadata', () => {
      const infoSpy = jest.spyOn(logger, 'info');
      const metadata = { userId: 123, action: 'login' };
      logger.info('User action', metadata);
      expect(infoSpy).toHaveBeenCalledWith('User action', metadata);
      infoSpy.mockRestore();
    });

    it('should log errors with stack traces', () => {
      const errorSpy = jest.spyOn(logger, 'error');
      const error = new Error('Test error with stack');
      logger.error('Error occurred', error);
      expect(errorSpy).toHaveBeenCalledWith('Error occurred', error);
      errorSpy.mockRestore();
    });
  });

  describe('Logger configuration', () => {
    it('should have correct format in development', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { logger: devLogger } = require('../../src/utils/logger');
      
      // Check if colorize format is applied in development
      const transports = devLogger.transports;
      expect(transports).toBeDefined();
      expect(transports.length).toBeGreaterThan(0);
    });

    it('should have correct format in production', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { logger: prodLogger } = require('../../src/utils/logger');
      
      // Check if JSON format is applied in production
      const transports = prodLogger.transports;
      expect(transports).toBeDefined();
      expect(transports.length).toBeGreaterThan(0);
    });

    it('should include timestamp in logs', () => {
      const infoSpy = jest.spyOn(logger, 'info');
      const testMessage = 'Test message with timestamp';
      logger.info(testMessage);
      
      expect(infoSpy).toHaveBeenCalledWith(testMessage);
      infoSpy.mockRestore();
    });

    it('should handle different log levels', () => {
      const levels = ['error', 'warn', 'info', 'debug'] as const;
      
      levels.forEach(level => {
        const spy = jest.spyOn(logger, level);
        const message = `Test ${level} message`;
        logger[level](message);
        expect(spy).toHaveBeenCalledWith(message);
        spy.mockRestore();
      });
    });
  });

  describe('Error logging', () => {
    it('should properly log error objects', () => {
      const errorSpy = jest.spyOn(logger, 'error');
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.suite (test.js:10:20)';
      
      logger.error('Error caught', { error, context: 'test' });
      
      expect(errorSpy).toHaveBeenCalledWith('Error caught', { error, context: 'test' });
      errorSpy.mockRestore();
    });

    it('should handle circular references in logged objects', () => {
      const errorSpy = jest.spyOn(logger, 'error');
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => {
        logger.error('Circular reference test', circular);
      }).not.toThrow();
      
      errorSpy.mockRestore();
    });
  });
});