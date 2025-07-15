import { PrismaClient, Task, TaskStatus, TaskPriority, Prisma } from '@prisma/client'
import { TaskFilters, PaginatedResponse } from '../models/types'

export class TaskRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    userId: string
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    dueDate?: Date
  }): Promise<Task> {
    return this.prisma.task.create({
      data,
    })
  }

  async findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({
      where: { id },
    })
  }

  async findAll(
    userId: string,
    filters: TaskFilters & { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Task>> {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    const where: Prisma.TaskWhereInput = {
      userId,
      ...(filters.status && { status: filters.status.toUpperCase() as TaskStatus }),
      ...(filters.priority && { priority: filters.priority.toUpperCase() as TaskPriority }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { dueDate: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.task.count({ where }),
    ])

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async update(
    id: string,
    data: Partial<{
      title: string
      description: string
      status: TaskStatus
      priority: TaskPriority
      dueDate: Date | null
    }>
  ): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({
      where: { id },
    })
  }

  async belongsToUser(taskId: string, userId: string): Promise<boolean> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    })
    return !!task
  }
}