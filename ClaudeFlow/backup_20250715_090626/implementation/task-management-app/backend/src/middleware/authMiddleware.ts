import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError, ErrorCode } from '../models/errors'
import { JWTPayload } from '../models/types'

interface AuthRequest extends Request {
  user?: JWTPayload
}

export class AuthMiddleware {
  constructor(private jwtSecret: string) {}

  verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      const token = authHeader.substring(7)
      
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload
        req.user = decoded
        next()
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new AppError(ErrorCode.AUTH003, 401)
        }
        throw new AppError(ErrorCode.AUTH002, 401)
      }
    } catch (error) {
      next(error)
    }
  }
}