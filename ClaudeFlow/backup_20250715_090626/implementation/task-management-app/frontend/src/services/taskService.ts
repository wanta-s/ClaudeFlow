import api from './api'
import { Task } from '../store/slices/taskSlice'

interface TasksResponse {
  tasks: Task[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface CreateTaskData {
  title: string
  description?: string
  status?: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
}

interface UpdateTaskData extends Partial<CreateTaskData> {}

interface TaskFilters {
  status?: string
  priority?: string
  search?: string
  page?: number
  limit?: number
}

export const taskService = {
  async getTasks(filters?: TaskFilters): Promise<TasksResponse> {
    const response = await api.get<TasksResponse>('/tasks', {
      params: filters,
    })
    return response.data
  },

  async getTask(id: string): Promise<Task> {
    const response = await api.get<Task>(`/tasks/${id}`)
    return response.data
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    const response = await api.post<Task>('/tasks', data)
    return response.data
  },

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const response = await api.put<Task>(`/tasks/${id}`, data)
    return response.data
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`)
  },
}