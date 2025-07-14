import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// JWT認証ミドルウェア
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token is required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ 
        error: 'JWT secret is not configured',
        code: 'JWT_SECRET_MISSING'
      });
    }

    // JWTトークンを検証
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'User account is disabled',
        code: 'USER_DISABLED'
      });
    }

    // リクエストオブジェクトにユーザー情報を追加
    req.user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    console.error('JWT authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// 権限チェックミドルウェア
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'USER_NOT_AUTHENTICATED'
      });
    }

    if (user.role !== requiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient privileges',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    next();
  };
};

// 複数の権限をチェックするミドルウェア
export const requireAnyRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'USER_NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient privileges',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
    }

    next();
  };
};

// リソースオーナーチェックミドルウェア
export const requireResourceOwner = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const resourceId = req.params[resourceIdParam];
      
      if (!user) {
        return res.status(401).json({ 
          error: 'User not authenticated',
          code: 'USER_NOT_AUTHENTICATED'
        });
      }

      // 管理者は全てのリソースにアクセス可能
      if (user.role === 'admin') {
        return next();
      }

      // リソースの所有者確認（例：タスクの場合）
      const resource = await prisma.task.findUnique({
        where: { id: resourceId },
        select: { userId: true }
      });

      if (!resource) {
        return res.status(404).json({ 
          error: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (resource.userId !== user.id) {
        return res.status(403).json({ 
          error: 'Access denied to this resource',
          code: 'ACCESS_DENIED'
        });
      }

      next();

    } catch (error) {
      console.error('Resource owner check error:', error);
      return res.status(500).json({ 
        error: 'Authorization check failed',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

// JWTトークン生成ヘルパー
export const generateTokens = (user: { id: string; email: string; role: string }) => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  
  if (!jwtSecret || !refreshSecret) {
    throw new Error('JWT secrets are not configured');
  }

  const accessToken = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    jwtSecret,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: 'task-management-app',
      audience: 'task-management-users'
    }
  );

  const refreshToken = jwt.sign(
    { 
      userId: user.id, 
      type: 'refresh' 
    },
    refreshSecret,
    { 
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      issuer: 'task-management-app',
      audience: 'task-management-users'
    }
  );

  return { accessToken, refreshToken };
};

// リフレッシュトークン検証
export const verifyRefreshToken = (token: string) => {
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  
  if (!refreshSecret) {
    throw new Error('Refresh token secret is not configured');
  }

  try {
    const decoded = jwt.verify(token, refreshSecret) as { userId: string; type: string };
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Express Request型拡張
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
      };
    }
  }
}