import { app, prisma } from './app'
import { config } from './config'

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 Server is running on port ${config.port}`)
      console.log(`🌍 Environment: ${config.nodeEnv}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

startServer()