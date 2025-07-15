export interface JWTPayload {
  userId: string
  email: string
}

export interface AuthRequest extends Express.Request {
  user?: JWTPayload
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface TaskFilters {
  status?: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  search?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    timestamp: string
  }
}