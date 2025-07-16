import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { validateRegistration, validateLogin, handleValidationErrors } from '../../src/middleware/validation';
import { ValidationError } from '../../src/utils/errors';

// Mock express-validator
jest.mock('express-validator');

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateRegistration', () => {
    it('should create validation chain for registration', () => {
      expect(validateRegistration).toBeDefined();
      expect(Array.isArray(validateRegistration)).toBe(true);
      expect(validateRegistration).toHaveLength(5); // 4 fields + handleValidationErrors
    });

    // Note: Testing the actual validation rules would require integration tests
    // as express-validator returns middleware functions that need to be executed
  });

  describe('validateLogin', () => {
    it('should create validation chain for login', () => {
      expect(validateLogin).toBeDefined();
      expect(Array.isArray(validateLogin)).toBe(true);
      expect(validateLogin).toHaveLength(3); // 2 fields + handleValidationErrors
    });
  });

  describe('handleValidationErrors', () => {
    it('should call next() when no validation errors', () => {
      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(true),
        array: jest.fn().mockReturnValue([])
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should pass ValidationError to next() when validation errors exist', () => {
      const errors = [
        { msg: 'Invalid email', param: 'email', location: 'body' },
        { msg: 'Password too short', param: 'password', location: 'body' }
      ];

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(errors)
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
    });

    it('should format error messages correctly', () => {
      const errors = [
        { msg: 'Email is required', param: 'email', location: 'body' },
        { msg: 'Invalid password format', param: 'password', location: 'body' },
        { msg: 'First name too short', param: 'firstName', location: 'body' }
      ];

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(errors)
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Validation failed: Email is required, Invalid password format, First name too short');
    });

    it('should handle single validation error', () => {
      const errors = [
        { msg: 'Invalid email format', param: 'email', location: 'body' }
      ];

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(errors)
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Validation failed: Invalid email format');
    });

    it('should handle empty error array edge case', () => {
      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue([])
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Validation failed');
    });

    it('should handle errors with custom messages', () => {
      const errors = [
        { msg: 'custom.email.required', param: 'email', location: 'body' },
        { msg: 'custom.password.weak', param: 'password', location: 'body' }
      ];

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(errors)
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Validation failed: custom.email.required, custom.password.weak');
    });

    it('should handle errors from different locations', () => {
      const errors = [
        { msg: 'Invalid header', param: 'authorization', location: 'headers' },
        { msg: 'Invalid query param', param: 'page', location: 'query' },
        { msg: 'Invalid body param', param: 'email', location: 'body' }
      ];

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(errors)
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain('Invalid header');
      expect(error.message).toContain('Invalid query param');
      expect(error.message).toContain('Invalid body param');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle request with no body', () => {
      mockReq.body = undefined;

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue([
          { msg: 'Email is required', param: 'email', location: 'body' }
        ])
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle validation with nested errors', () => {
      const errors = [
        { msg: 'Invalid format', param: 'user.email', location: 'body' },
        { msg: 'Required field', param: 'user.profile.name', location: 'body' }
      ];

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(errors)
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.message).toBe('Validation failed: Invalid format, Required field');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(500);
      const errors = [
        { msg: longMessage, param: 'field', location: 'body' }
      ];

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(errors)
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain(longMessage);
    });

    it('should handle special characters in error messages', () => {
      const errors = [
        { msg: 'Error with "quotes" and \'apostrophes\'', param: 'field1', location: 'body' },
        { msg: 'Error with <tags> & symbols', param: 'field2', location: 'body' }
      ];

      const mockValidationResult = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(errors)
      };
      (validationResult as unknown as jest.Mock).mockReturnValue(mockValidationResult);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain('Error with "quotes" and \'apostrophes\'');
      expect(error.message).toContain('Error with <tags> & symbols');
    });
  });
});