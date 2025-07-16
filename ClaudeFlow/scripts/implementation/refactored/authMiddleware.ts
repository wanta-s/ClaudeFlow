import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Types from patterns
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ success: true, value });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });

export interface AuthenticatedRequest extends Request {
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

// Error constants
const ERRORS = {
  MISSING_TOKEN: { code: 'AUTH_001', message: 'Authorization token is missing', statusCode: 401 },
  INVALID_FORMAT: { code: 'AUTH_002', message: 'Invalid token format', statusCode: 401 },
  TOKEN_EXPIRED: { code: 'AUTH_003', message: 'Token has expired', statusCode: 401 },
  INVALID_TOKEN: { code: 'AUTH_004', message: 'Invalid token', statusCode: 401 }
} as const;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Simplified middleware
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(ERRORS.MISSING_TOKEN.statusCode).json(ERRORS.MISSING_TOKEN);
    return;
  }
  
  const result = await verifyToken(token);
  if (!result.success) {
    const error = result.error as any;
    res.status(error.statusCode || 401).json(error);
    return;
  }
  
  (req as AuthenticatedRequest).user = {
    id: result.value.sub,
    email: result.value.email
  };
  
  next();
}

// Helper functions
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function verifyToken(token: string): Promise<Result<JWTPayload>> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return ok(decoded);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return err(ERRORS.TOKEN_EXPIRED);
    }
    return err(ERRORS.INVALID_TOKEN);
  }
}