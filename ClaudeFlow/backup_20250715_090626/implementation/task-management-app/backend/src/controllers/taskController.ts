import { Request, Response, NextFunction } from 'express'
import { TaskService } from '../services/taskService'
import {
  taskCreateSchema,
  taskUpdateSchema,
  taskQuerySchema,
} from '../models/validation'
import { AppError, ErrorCode } from '../models/errors'

interface AuthRequest extends Request {
  user?: { userId: string; email: string }
}

export class TaskController {
  constructor(private taskService: TaskService) {}

  getTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      // Validate query parameters
      const { error, value } = taskQuerySchema.validate(req.query)
      if (error) {
        throw new AppError(ErrorCode.VALIDATION001, 400, error.details[0].message)
      }

      const result = await this.taskService.getTasks(req.user.userId, value)

      res.json({
        tasks: result.data,
        pagination: result.pagination,
      })
    } catch (error) {
      next(error)
    }
  }

  getTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      const task = await this.taskService.getTaskById(
        req.params.id,
        req.user.userId
      )

      res.json(task)
    } catch (error) {
      next(error)
    }
  }

  createTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      // Validate request body
      const { error, value } = taskCreateSchema.validate(req.body)
      if (error) {
        throw new AppError(ErrorCode.VALIDATION001, 400, error.details[0].message)
      }

      const task = await this.taskService.createTask(value, req.user.userId)

      res.status(201).json(task)
    } catch (error) {
      next(error)
    }
  }

  updateTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      // Validate request body
      const { error, value } = taskUpdateSchema.validate(req.body)
      if (error) {
        throw new AppError(ErrorCode.VALIDATION001, 400, error.details[0].message)
      }

      const task = await this.taskService.updateTask(
        req.params.id,
        value,
        req.user.userId
      )

      res.json(task)
    } catch (error) {
      next(error)
    }
  }

  deleteTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      await this.taskService.deleteTask(req.params.id, req.user.userId)

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}