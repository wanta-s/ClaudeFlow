import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'

import { config } from './config'
import { errorHandler } from './middleware/errorMiddleware'
import { AuthMiddleware } from './middleware/authMiddleware'

// Repositories
import { UserRepository } from './repositories/userRepository'
import { TaskRepository } from './repositories/taskRepository'

// Services
import { UserService } from './services/userService'
import { TaskService } from './services/taskService'

// Controllers
import { AuthController } from './controllers/authController'
import { UserController } from './controllers/userController'
import { TaskController } from './controllers/taskController'

// Initialize Prisma Client
const prisma = new PrismaClient()

// Initialize repositories
const userRepository = new UserRepository(prisma)
const taskRepository = new TaskRepository(prisma)

// Initialize services
const userService = new UserService(userRepository, config.bcrypt.saltRounds)
const taskService = new TaskService(taskRepository)

// Initialize controllers
const authController = new AuthController(
  userService,
  config.jwt.secret,
  config.jwt.expiresIn
)
const userController = new UserController(userService)
const taskController = new TaskController(taskService)

// Initialize middleware
const authMiddleware = new AuthMiddleware(config.jwt.secret)

// Create Express app
const app = express()

// Global middleware
app.use(helmet())
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'リクエストが多すぎます。しばらくしてからもう一度お試しください。',
})
app.use('/api', limiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth routes
app.post('/api/auth/register', authController.register)
app.post('/api/auth/login', authController.login)
app.post('/api/auth/logout', authMiddleware.verifyToken, authController.logout)

// User routes
app.get('/api/users/me', authMiddleware.verifyToken, userController.getMe)
app.put('/api/users/me', authMiddleware.verifyToken, userController.updateMe)

// Task routes
app.get('/api/tasks', authMiddleware.verifyToken, taskController.getTasks)
app.post('/api/tasks', authMiddleware.verifyToken, taskController.createTask)
app.get('/api/tasks/:id', authMiddleware.verifyToken, taskController.getTask)
app.put('/api/tasks/:id', authMiddleware.verifyToken, taskController.updateTask)
app.delete('/api/tasks/:id', authMiddleware.verifyToken, taskController.deleteTask)

// Error handling
app.use(errorHandler)

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server')
  await prisma.$disconnect()
  process.exit(0)
})

export { app, prisma }