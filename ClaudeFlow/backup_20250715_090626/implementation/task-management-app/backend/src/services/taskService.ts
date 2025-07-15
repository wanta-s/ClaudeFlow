import { Task, TaskStatus, TaskPriority } from '@prisma/client'
import { TaskRepository } from '../repositories/taskRepository'
import { TaskFilters, PaginatedResponse } from '../models/types'
import { AppError, ErrorCode } from '../models/errors'

export class TaskService {
  constructor(private taskRepository: TaskRepository) {}

  async getTasks(
    userId: string,
    filters: TaskFilters & { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Task>> {
    return this.taskRepository.findAll(userId, filters)
  }

  async getTaskById(id: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findById(id)
    
    if (!task) {
      throw new AppError(ErrorCode.TASK002, 404)
    }

    if (task.userId !== userId) {
      throw new AppError(ErrorCode.TASK003, 403)
    }

    return task
  }

  async createTask(
    taskData: {
      title: string
      description?: string
      status?: string
      priority?: string
      dueDate?: string
    },
    userId: string
  ): Promise<Task> {
    const data = {
      userId,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status?.toUpperCase() as TaskStatus | undefined,
      priority: taskData.priority?.toUpperCase() as TaskPriority | undefined,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
    }

    try {
      return await this.taskRepository.create(data)
    } catch (error) {
      throw new AppError(ErrorCode.TASK001, 400)
    }
  }

  async updateTask(
    id: string,
    taskData: {
      title?: string
      description?: string
      status?: string
      priority?: string
      dueDate?: string | null
    },
    userId: string
  ): Promise<Task> {
    // Check if task exists and belongs to user
    const belongsToUser = await this.taskRepository.belongsToUser(id, userId)
    
    if (!belongsToUser) {
      const task = await this.taskRepository.findById(id)
      if (!task) {
        throw new AppError(ErrorCode.TASK002, 404)
      }
      throw new AppError(ErrorCode.TASK003, 403)
    }

    const data: any = {}
    if (taskData.title !== undefined) data.title = taskData.title
    if (taskData.description !== undefined) data.description = taskData.description
    if (taskData.status !== undefined) {
      data.status = taskData.status.toUpperCase() as TaskStatus
    }
    if (taskData.priority !== undefined) {
      data.priority = taskData.priority.toUpperCase() as TaskPriority
    }
    if (taskData.dueDate !== undefined) {
      data.dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null
    }

    return this.taskRepository.update(id, data)
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    // Check if task exists and belongs to user
    const belongsToUser = await this.taskRepository.belongsToUser(id, userId)
    
    if (!belongsToUser) {
      const task = await this.taskRepository.findById(id)
      if (!task) {
        throw new AppError(ErrorCode.TASK002, 404)
      }
      throw new AppError(ErrorCode.TASK003, 403)
    }

    await this.taskRepository.delete(id)
  }
}