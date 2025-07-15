import { Request, Response, NextFunction } from 'express'
import { AppError, ErrorCode } from '../models/errors'
import { ErrorResponse } from '../models/types'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err)

  let statusCode = 500
  let errorCode = ErrorCode.SYSTEM001
  let message = err.message || 'Internal server error'

  if (err instanceof AppError) {
    statusCode = err.statusCode
    errorCode = err.code
    message = err.message
  }

  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
    },
  }

  res.status(statusCode).json(errorResponse)
}