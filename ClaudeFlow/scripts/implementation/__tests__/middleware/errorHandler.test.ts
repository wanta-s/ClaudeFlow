import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { AppError, ValidationError, NotFoundError, UnauthorizedError, ConflictError } from '../../src/utils/errors';
import { logger } from '../../src/utils/logger';

// Mock logger
jest.mock('../../src/utils/logger');

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'test-agent';
        return undefined;
      })
    };

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRes = {
      status: statusMock,
      headersSent: false
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Operational Errors', () => {
    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input data');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Invalid input data',
          status: 400
        }
      });
      expect(logger.error).toHaveBeenCalledWith('Validation error', expect.any(Object));
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('Resource not found');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Resource not found',
          status: 404
        }
      });
    });

    it('should handle UnauthorizedError correctly', () => {
      const error = new UnauthorizedError('Access denied');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Access denied',
          status: 401
        }
      });
    });

    it('should handle ConflictError correctly', () => {
      const error = new ConflictError('Resource conflict');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Resource conflict',
          status: 409
        }
      });
    });

    it('should handle generic AppError correctly', () => {
      const error = new AppError('Custom error', 418);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(418);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Custom error',
          status: 418
        }
      });
    });
  });

  describe('Non-Operational Errors', () => {
    it('should handle non-operational AppError', () => {
      const error = new AppError('System error', 500, false);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
      expect(logger.error).toHaveBeenCalledWith('Non-operational error', expect.any(Object));
    });

    it('should handle generic Error', () => {
      const error = new Error('Unexpected error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    });

    it('should handle error without message', () => {
      const error = new Error();

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    });

    it('should handle non-Error objects', () => {
      const error = { custom: 'error object' };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    });

    it('should handle string errors', () => {
      const error = 'String error';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    });

    it('should handle null errors', () => {
      const error = null;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    });
  });

  describe('Development vs Production', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.suite (test.js:10:20)';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          status: 500,
          stack: error.stack
        }
      });
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.suite (test.js:10:20)';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    });

    it('should show actual error message for operational errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new ValidationError('Bad request data');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Bad request data',
          status: 400
        }
      });
    });
  });

  describe('Headers Already Sent', () => {
    it('should pass to next if headers already sent', () => {
      mockRes.headersSent = true;
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log operational errors with context', () => {
      const error = new ValidationError('Invalid data');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Validation error', {
        error: {
          message: 'Invalid data',
          stack: expect.any(String),
          name: 'ValidationError'
        },
        request: {
          method: 'GET',
          url: '/api/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        }
      });
    });

    it('should log non-operational errors', () => {
      const error = new Error('System failure');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Non-operational error', expect.objectContaining({
        error: expect.objectContaining({
          message: 'System failure'
        })
      }));
    });

    it('should handle missing request properties gracefully', () => {
      mockReq = {};
      const error = new ValidationError('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Validation error', {
        error: expect.any(Object),
        request: {
          method: undefined,
          url: undefined,
          ip: undefined,
          userAgent: undefined
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors with circular references', () => {
      const error: any = new Error('Circular error');
      error.circular = error;

      expect(() => {
        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new ValidationError(longMessage);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: longMessage,
          status: 400
        }
      });
    });

    it('should handle errors with non-standard status codes', () => {
      const error = new AppError('Custom error', 999);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(999);
    });

    it('should default to 500 for invalid status codes', () => {
      const error = new AppError('Invalid status', NaN);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});