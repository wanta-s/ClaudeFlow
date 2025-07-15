import api from './api'

interface LoginData {
  email: string
  password: string
}

interface RegisterData extends LoginData {
  name: string
}

interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
  }
  token: string
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async getMe() {
    const response = await api.get('/users/me')
    return response.data
  },

  async updateMe(data: { name?: string; email?: string }) {
    const response = await api.put('/users/me', data)
    return response.data
  },
}