import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should reject request without token', async () => {
    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      code: 'AUTH_001',
      message: 'Authorization token is missing',
      statusCode: 401
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject invalid token format', async () => {
    mockReq.headers = {
      authorization: 'InvalidFormat'
    };

    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should accept valid token', async () => {
    const payload = {
      sub: 'user123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const token = jwt.sign(payload, JWT_SECRET);

    mockReq.headers = {
      authorization: `Bearer ${token}`
    };

    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as any).user).toEqual({
      id: 'user123',
      email: 'test@example.com'
    });
  });

  it('should reject expired token', async () => {
    const payload = {
      sub: 'user123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600
    };
    const token = jwt.sign(payload, JWT_SECRET);

    mockReq.headers = {
      authorization: `Bearer ${token}`
    };

    await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      code: 'AUTH_003',
      message: 'Token has expired',
      statusCode: 401
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});