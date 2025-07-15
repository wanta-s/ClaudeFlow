import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

interface TaskState {
  tasks: Task[]
  selectedTask: Task | null
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    status?: string
    priority?: string
    search?: string
  }
}

const initialState: TaskState = {
  tasks: [],
  selectedTask: null,
  loading: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {},
}

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (
      state,
      action: PayloadAction<{
        tasks: Task[]
        pagination: TaskState['pagination']
      }>
    ) => {
      state.tasks = action.payload.tasks
      state.pagination = action.payload.pagination
    },
    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.unshift(action.payload)
      state.pagination.total += 1
    },
    updateTask: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex(
        (task) => task.id === action.payload.id
      )
      if (index !== -1) {
        state.tasks[index] = action.payload
      }
      if (state.selectedTask?.id === action.payload.id) {
        state.selectedTask = action.payload
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter((task) => task.id !== action.payload)
      state.pagination.total -= 1
      if (state.selectedTask?.id === action.payload) {
        state.selectedTask = null
      }
    },
    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setFilters: (state, action: PayloadAction<TaskState['filters']>) => {
      state.filters = action.payload
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload
    },
  },
})

export const {
  setTasks,
  addTask,
  updateTask,
  deleteTask,
  setSelectedTask,
  setLoading,
  setFilters,
  setPage,
} = taskSlice.actions
export default taskSlice.reducer