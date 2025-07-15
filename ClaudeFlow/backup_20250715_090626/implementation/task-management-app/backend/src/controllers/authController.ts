import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UserService } from '../services/userService'
import { userRegistrationSchema, userLoginSchema } from '../models/validation'
import { AppError, ErrorCode } from '../models/errors'
import { JWTPayload } from '../models/types'

export class AuthController {
  constructor(
    private userService: UserService,
    private jwtSecret: string,
    private jwtExpiresIn: string = '7d'
  ) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const { error, value } = userRegistrationSchema.validate(req.body)
      if (error) {
        throw new AppError(ErrorCode.VALIDATION001, 400, error.details[0].message)
      }

      // Create user
      const user = await this.userService.createUser(value)

      // Generate token
      const token = this.generateToken({ userId: user.id, email: user.email })

      res.status(201).json({
        user,
        token,
      })
    } catch (error) {
      next(error)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const { error, value } = userLoginSchema.validate(req.body)
      if (error) {
        throw new AppError(ErrorCode.VALIDATION001, 400, error.details[0].message)
      }

      // Find user
      const user = await this.userService.findByEmail(value.email)
      if (!user) {
        throw new AppError(ErrorCode.AUTH001, 401)
      }

      // Validate password
      const isValid = await this.userService.validatePassword(
        value.password,
        user.passwordHash
      )
      if (!isValid) {
        throw new AppError(ErrorCode.AUTH001, 401)
      }

      // Generate token
      const token = this.generateToken({ userId: user.id, email: user.email })

      // Remove password from response
      const { passwordHash, ...userWithoutPassword } = user

      res.json({
        user: userWithoutPassword,
        token,
      })
    } catch (error) {
      next(error)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In a real implementation, you might want to invalidate the token
      // For now, we'll just return a success response
      res.json({ message: 'ログアウトしました' })
    } catch (error) {
      next(error)
    }
  }

  private generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    })
  }
}