/**
 * Application entry point
 */
import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { initUser } from './models/User';
import { createAuthRouter } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';
import { setupContainer, initializeDatabase } from './container/setup';
import { container } from './container/Container';
import { config } from './config';
import { Logger } from './utils/logger';

/**
 * Create and configure Express application
 * @returns {Application} Express application
 */
function createApp(): Application {
  const app = express();
  const logger = container.get<Logger>('logger');

  // Security middleware
  app.use(helmet());
  app.use(cors(config.security.cors));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request processed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    });
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.env
    });
  });

  // API routes
  app.use('/api/auth', createAuthRouter());

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: 'Resource not found',
        code: 'NOT_FOUND',
        statusCode: 404,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the application
 */
async function start(): Promise<void> {
  try {
    // Setup DI container
    setupContainer();
    
    const logger = container.get<Logger>('logger');
    logger.info('Starting application', { env: config.server.env });

    // Initialize database
    await initializeDatabase();
    
    // Initialize models
    const database = container.get<Sequelize>('database');
    initUser(database);

    // Create and start server
    const app = createApp();
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info('Server started', {
        port: config.server.port,
        host: config.server.host,
        env: config.server.env
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      try {
        const database = container.get<Sequelize>('database');
        await database.close();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
start();

// Export for testing
export { createApp };