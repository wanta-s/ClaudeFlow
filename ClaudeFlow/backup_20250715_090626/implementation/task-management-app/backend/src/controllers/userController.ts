import { Request, Response, NextFunction } from 'express'
import { UserService } from '../services/userService'
import { userUpdateSchema } from '../models/validation'
import { AppError, ErrorCode } from '../models/errors'

interface AuthRequest extends Request {
  user?: { userId: string; email: string }
}

export class UserController {
  constructor(private userService: UserService) {}

  getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      const user = await this.userService.findById(req.user.userId)
      if (!user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  updateMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      // Validate request body
      const { error, value } = userUpdateSchema.validate(req.body)
      if (error) {
        throw new AppError(ErrorCode.VALIDATION001, 400, error.details[0].message)
      }

      const updatedUser = await this.userService.updateUser(
        req.user.userId,
        value
      )

      res.json(updatedUser)
    } catch (error) {
      next(error)
    }
  }
}