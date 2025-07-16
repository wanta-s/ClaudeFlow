import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

interface AuthError {
  code: string;
  message: string;
  statusCode: number;
}

type AuthResult = { success: true; data: JWTPayload } | { success: false; error: AuthError };

const AUTH_ERRORS = {
  MISSING_TOKEN: {
    code: 'AUTH_001',
    message: 'Authorization token is missing',
    statusCode: 401
  },
  INVALID_FORMAT: {
    code: 'AUTH_002',
    message: 'Invalid token format',
    statusCode: 401
  },
  TOKEN_EXPIRED: {
    code: 'AUTH_003',
    message: 'Token has expired',
    statusCode: 401
  },
  INVALID_SIGNATURE: {
    code: 'AUTH_004',
    message: 'Invalid token signature',
    statusCode: 401
  },
  DECODE_ERROR: {
    code: 'AUTH_005',
    message: 'Failed to decode token',
    statusCode: 401
  }
} as const;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

async function verifyToken(token: string): Promise<AuthResult> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return { success: true, data: decoded };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return { success: false, error: AUTH_ERRORS.TOKEN_EXPIRED };
    }
    if (error.name === 'JsonWebTokenError') {
      return { success: false, error: AUTH_ERRORS.INVALID_SIGNATURE };
    }
    return { success: false, error: AUTH_ERRORS.DECODE_ERROR };
  }
}

function setAuthenticatedUser(req: AuthenticatedRequest, payload: JWTPayload): void {
  req.user = {
    id: payload.sub,
    email: payload.email
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json(AUTH_ERRORS.MISSING_TOKEN);
    return;
  }
  
  const result = await verifyToken(token);
  if (!result.success) {
    res.status(result.error.statusCode).json(result.error);
    return;
  }
  
  setAuthenticatedUser(req as AuthenticatedRequest, result.data);
  next();
}

export type { AuthenticatedRequest };