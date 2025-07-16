import express from 'express';
import { createAuthMiddleware, TokenRevocationChecker } from './authMiddleware.improved';
import { createConsoleLogger, LogLevel } from './logger';
import { InMemoryTokenCache, RedisTokenCache, LRUTokenCache } from './tokenCache';
import { InMemoryMetricsCollector, PrometheusMetricsCollector } from './metricsCollector';

// Example 1: Basic authentication with default settings
export function basicAuthExample() {
  const app = express();
  
  // Uses JWT_SECRET from environment
  const authMiddleware = createAuthMiddleware();
  
  // Protected route
  app.get('/api/profile', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });
  
  return app;
}

// Example 2: Authentication with custom configuration
export function customConfigExample() {
  const app = express();
  
  const authMiddleware = createAuthMiddleware({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    algorithms: ['HS256', 'HS384'],
    maxTokenLength: 2000,
    clockTolerance: 5, // 5 seconds tolerance
    logger: createConsoleLogger({
      level: LogLevel.DEBUG,
      prefix: '[AUTH]',
      timestamp: true,
      json: false
    })
  });
  
  app.get('/api/data', authMiddleware, (req, res) => {
    res.json({ message: 'Authenticated!', user: req.user });
  });
  
  return app;
}

// Example 3: Role-based access control
export function roleBasedAccessExample() {
  const app = express();
  
  // Admin only middleware
  const adminAuth = createAuthMiddleware({
    requiredRoles: ['admin'],
    logger: createConsoleLogger({ level: LogLevel.INFO })
  });
  
  // User or admin middleware
  const userAuth = createAuthMiddleware({
    requiredRoles: ['user', 'admin'],
    logger: createConsoleLogger({ level: LogLevel.INFO })
  });
  
  // Admin only endpoint
  app.get('/api/admin/users', adminAuth, (req, res) => {
    res.json({ message: 'Admin access granted' });
  });
  
  // User accessible endpoint
  app.get('/api/profile', userAuth, (req, res) => {
    res.json({ user: req.user });
  });
  
  return app;
}

// Example 4: Permission-based access control
export function permissionBasedAccessExample() {
  const app = express();
  
  // Requires both read and write permissions
  const readWriteAuth = createAuthMiddleware({
    requiredPermissions: ['read', 'write'],
    logger: createConsoleLogger()
  });
  
  // Requires only read permission
  const readOnlyAuth = createAuthMiddleware({
    requiredPermissions: ['read'],
    logger: createConsoleLogger()
  });
  
  app.get('/api/documents', readOnlyAuth, (req, res) => {
    res.json({ documents: [] });
  });
  
  app.post('/api/documents', readWriteAuth, (req, res) => {
    res.json({ message: 'Document created' });
  });
  
  return app;
}

// Example 5: Custom token extraction
export function customTokenExtractionExample() {
  const app = express();
  
  // Extract token from custom header or query parameter
  const customTokenExtractor = (req: express.Request): string | null => {
    // Try custom header first
    const customHeader = req.headers['x-auth-token'] as string;
    if (customHeader) return customHeader;
    
    // Try query parameter
    const queryToken = req.query.token as string;
    if (queryToken) return queryToken;
    
    // Fall back to standard Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return null;
  };
  
  const authMiddleware = createAuthMiddleware({
    tokenExtractor: customTokenExtractor,
    logger: createConsoleLogger()
  });
  
  app.get('/api/data', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });
  
  return app;
}

// Example 6: With caching for performance
export function cachedAuthExample() {
  const app = express();
  
  // In-memory cache
  const tokenCache = new InMemoryTokenCache(60000); // Cleanup every minute
  
  const authMiddleware = createAuthMiddleware({
    tokenCache,
    logger: createConsoleLogger({ level: LogLevel.INFO })
  });
  
  app.get('/api/cached', authMiddleware, (req, res) => {
    res.json({ message: 'Response from cached auth' });
  });
  
  // Clean up on shutdown
  process.on('SIGTERM', () => {
    tokenCache.destroy();
  });
  
  return app;
}

// Example 7: With Redis cache
export function redisAuthExample(redisClient: any) {
  const app = express();
  
  const tokenCache = new RedisTokenCache(redisClient);
  
  const authMiddleware = createAuthMiddleware({
    tokenCache,
    logger: createConsoleLogger()
  });
  
  app.get('/api/redis-cached', authMiddleware, (req, res) => {
    res.json({ message: 'Response with Redis cache' });
  });
  
  return app;
}

// Example 8: With token revocation
export function revocationExample() {
  const app = express();
  
  // Simple in-memory revocation list
  const revokedTokens = new Set<string>();
  
  const revocationChecker: TokenRevocationChecker = {
    isRevoked: async (tokenId: string) => {
      return revokedTokens.has(tokenId);
    }
  };
  
  const authMiddleware = createAuthMiddleware({
    revocationChecker,
    tokenCache: new InMemoryTokenCache(),
    logger: createConsoleLogger()
  });
  
  // Protected endpoint
  app.get('/api/secure', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });
  
  // Logout endpoint - revoke token
  app.post('/api/logout', authMiddleware, (req, res) => {
    const user = req.user;
    if (user?.jti) {
      revokedTokens.add(user.jti);
    }
    res.json({ message: 'Logged out successfully' });
  });
  
  return app;
}

// Example 9: With metrics collection
export function metricsExample() {
  const app = express();
  
  const metricsCollector = new InMemoryMetricsCollector();
  
  const authMiddleware = createAuthMiddleware({
    metricsCollector,
    logger: createConsoleLogger()
  });
  
  // Protected endpoint
  app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });
  
  // Metrics endpoint
  app.get('/metrics/auth', (req, res) => {
    const metrics = metricsCollector.getMetrics(60); // Last hour
    res.json(metrics);
  });
  
  return app;
}

// Example 10: Custom validation and callbacks
export function customValidationExample() {
  const app = express();
  
  // Track active sessions
  const activeSessions = new Map<string, Date>();
  
  const authMiddleware = createAuthMiddleware({
    // Custom user validation
    userValidator: async (user) => {
      // Check if user is active in database
      // const isActive = await db.users.isActive(user.id);
      // return isActive;
      
      // For demo, check a simple condition
      return user.email?.includes('@company.com') ?? false;
    },
    
    // Callback after successful auth
    onAuthenticated: async (user, req) => {
      // Track session
      activeSessions.set(user.id, new Date());
      
      // Log access
      console.log(`User ${user.id} accessed ${req.path}`);
      
      // Could also update last active timestamp in database
      // await db.users.updateLastActive(user.id);
    },
    
    logger: createConsoleLogger()
  });
  
  app.get('/api/company-only', authMiddleware, (req, res) => {
    res.json({ message: 'Company access granted' });
  });
  
  return app;
}

// Example 11: Error formatting
export function customErrorFormattingExample() {
  const app = express();
  
  const authMiddleware = createAuthMiddleware({
    errorFormatter: (error) => ({
      status: 'error',
      code: error.type,
      message: error.message,
      timestamp: new Date().toISOString()
    }),
    logger: createConsoleLogger()
  });
  
  app.get('/api/custom-errors', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });
  
  return app;
}

// Example 12: Multiple middleware instances
export function multipleMiddlewareExample() {
  const app = express();
  
  const logger = createConsoleLogger();
  const cache = new LRUTokenCache(1000); // LRU cache with 1000 entries
  
  // Public read access
  const publicAuth = createAuthMiddleware({
    logger,
    tokenCache: cache
  });
  
  // Admin write access
  const adminAuth = createAuthMiddleware({
    requiredRoles: ['admin'],
    requiredPermissions: ['write'],
    logger,
    tokenCache: cache
  });
  
  // Moderator access
  const moderatorAuth = createAuthMiddleware({
    requiredRoles: ['moderator', 'admin'],
    logger,
    tokenCache: cache
  });
  
  // Different endpoints with different auth requirements
  app.get('/api/posts', publicAuth, (req, res) => {
    res.json({ posts: [] });
  });
  
  app.post('/api/posts', adminAuth, (req, res) => {
    res.json({ message: 'Post created' });
  });
  
  app.delete('/api/posts/:id', moderatorAuth, (req, res) => {
    res.json({ message: 'Post deleted' });
  });
  
  return app;
}

// Example 13: Full production setup
export function productionSetupExample() {
  const app = express();
  
  // Production logger (could be Winston, Pino, etc.)
  const logger = createConsoleLogger({
    level: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
    json: true // JSON logs for production
  });
  
  // Redis cache for distributed systems
  // const redisClient = createRedisClient();
  // const tokenCache = new RedisTokenCache(redisClient);
  
  // For demo, use LRU cache
  const tokenCache = new LRUTokenCache(10000);
  
  // Revocation checker (could check database)
  const revocationChecker: TokenRevocationChecker = {
    isRevoked: async (tokenId: string) => {
      // Check database or Redis
      // return await db.revokedTokens.exists(tokenId);
      return false; // Demo
    }
  };
  
  // Metrics (could be Prometheus)
  const metricsCollector = new InMemoryMetricsCollector();
  
  // Create middleware
  const authMiddleware = createAuthMiddleware({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    maxTokenLength: 2000,
    clockTolerance: 10,
    logger,
    tokenCache,
    revocationChecker,
    metricsCollector,
    userValidator: async (user) => {
      // Validate user is still active
      return true; // Would check database in production
    },
    onAuthenticated: async (user, req) => {
      // Update last activity
      logger.info('User authenticated', {
        userId: user.id,
        path: req.path,
        method: req.method
      });
    }
  });
  
  // Health check (no auth)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Protected API routes
  app.use('/api', authMiddleware);
  
  app.get('/api/profile', (req, res) => {
    res.json({ user: req.user });
  });
  
  return app;
}