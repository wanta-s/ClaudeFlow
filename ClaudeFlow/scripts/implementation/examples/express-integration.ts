import express, { Request, Response, NextFunction } from 'express';
import { 
  createPasswordService, 
  createUserService, 
  createAuthService,
  isError,
  ERROR_CODES,
  TokenPayload
} from '../optimized';

// ============================================
// Express.js Integration Example
// ============================================

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Initialize services
const passwordService = createPasswordService('standard');
const userService = createUserService(passwordService);
const authService = createAuthService(userService, {
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d'
});

// ============================================
// Middleware
// ============================================

/**
 * Authentication middleware - validates JWT token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No token provided',
      code: ERROR_CODES.AUTH_FAILED
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const result = authService.verifyAccessToken(token);

  if (isError(result)) {
    return res.status(401).json({
      error: result.error.message,
      code: result.error.code
    });
  }

  req.user = result.data;
  next();
}

/**
 * Rate limiting middleware
 */
import { createRateLimiter } from '../optimized/utils';

const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

export function rateLimitMiddleware(key: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rateLimitKey = key(req);
    
    if (!loginRateLimiter.check(rateLimitKey)) {
      return res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED
      });
    }
    
    next();
  };
}

// ============================================
// Route Handlers
// ============================================

const app = express();
app.use(express.json());

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, username, password, firstName, lastName } = req.body;

  // Validate required fields
  if (!email || !username || !password || !firstName || !lastName) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: ERROR_CODES.VALIDATION_FAILED
    });
  }

  // Create user
  const result = await userService.createUser({
    email,
    username,
    password,
    profile: {
      firstName,
      lastName
    }
  });

  if (isError(result)) {
    const statusCode = result.error.code === ERROR_CODES.DUPLICATE_ENTRY ? 409 : 400;
    return res.status(statusCode).json({
      error: result.error.message,
      code: result.error.code
    });
  }

  // Auto-login after registration
  const loginResult = await authService.login(
    email,
    password,
    req.headers['x-device-id'] as string || 'web-' + Date.now()
  );

  if (isError(loginResult)) {
    // User created but login failed - still return success
    return res.status(201).json({
      message: 'User created successfully. Please login.',
      userId: result.data.id
    });
  }

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: result.data.id,
      email: result.data.email,
      username: result.data.username,
      profile: result.data.profile
    },
    tokens: loginResult.data
  });
});

/**
 * POST /api/auth/login
 * Login with email/username and password
 */
app.post('/api/auth/login', 
  rateLimitMiddleware(req => req.body.emailOrUsername || req.ip),
  async (req: Request, res: Response) => {
    const { emailOrUsername, password } = req.body;
    const deviceId = req.headers['x-device-id'] as string || 'web-' + Date.now();

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        error: 'Email/username and password are required',
        code: ERROR_CODES.VALIDATION_FAILED
      });
    }

    const result = await authService.login(
      emailOrUsername,
      password,
      deviceId,
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    );

    if (isError(result)) {
      // Reset rate limit on successful login
      if (result.error.code === ERROR_CODES.AUTH_FAILED) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: result.error.code
        });
      }
      
      return res.status(400).json({
        error: result.error.message,
        code: result.error.code
      });
    }

    // Reset rate limit on successful login
    loginRateLimiter.reset(emailOrUsername);

    res.json({
      message: 'Login successful',
      tokens: result.data
    });
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Refresh token is required',
      code: ERROR_CODES.VALIDATION_FAILED
    });
  }

  const result = await authService.refresh(refreshToken);

  if (isError(result)) {
    return res.status(401).json({
      error: result.error.message,
      code: result.error.code
    });
  }

  res.json({
    message: 'Token refreshed successfully',
    tokens: result.data
  });
});

/**
 * POST /api/auth/logout
 * Logout and invalidate tokens
 */
app.post('/api/auth/logout', authMiddleware, async (req: Request, res: Response) => {
  const token = req.headers.authorization!.substring(7);
  
  const result = await authService.logout(token);

  if (isError(result)) {
    return res.status(400).json({
      error: result.error.message,
      code: result.error.code
    });
  }

  res.json({
    message: 'Logout successful'
  });
});

/**
 * GET /api/users/me
 * Get current user profile
 */
app.get('/api/users/me', authMiddleware, (req: Request, res: Response) => {
  const result = userService.getUser(req.user!.userId);

  if (isError(result)) {
    return res.status(404).json({
      error: result.error.message,
      code: result.error.code
    });
  }

  const user = result.data;
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    profile: user.profile,
    settings: user.settings,
    metadata: {
      createdAt: user.metadata.createdAt,
      lastLoginAt: user.metadata.lastLoginAt,
      isVerified: user.metadata.isVerified
    }
  });
});

/**
 * PATCH /api/users/me
 * Update current user profile
 */
app.patch('/api/users/me', authMiddleware, async (req: Request, res: Response) => {
  const updates = req.body;
  
  // Remove sensitive fields that shouldn't be updated via this endpoint
  delete updates.password;
  delete updates.passwordHash;
  delete updates.metadata;
  delete updates.id;

  const result = await userService.updateUser(req.user!.userId, updates);

  if (isError(result)) {
    const statusCode = result.error.code === ERROR_CODES.DUPLICATE_ENTRY ? 409 : 400;
    return res.status(statusCode).json({
      error: result.error.message,
      code: result.error.code
    });
  }

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: result.data.id,
      email: result.data.email,
      username: result.data.username,
      profile: result.data.profile,
      settings: result.data.settings
    }
  });
});

/**
 * GET /api/users/me/sessions
 * Get user's active sessions
 */
app.get('/api/users/me/sessions', authMiddleware, (req: Request, res: Response) => {
  const sessions = authService.getSessions(req.user!.userId);

  res.json({
    sessions: sessions.map(session => ({
      deviceId: session.deviceId,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent,
      current: session.deviceId === req.headers['x-device-id']
    }))
  });
});

/**
 * DELETE /api/users/me/sessions/:deviceId
 * Revoke a specific session
 */
app.delete('/api/users/me/sessions/:deviceId', authMiddleware, async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  const result = authService.revokeSession(req.user!.userId, deviceId);

  if (isError(result)) {
    return res.status(404).json({
      error: result.error.message,
      code: result.error.code
    });
  }

  res.json({
    message: 'Session revoked successfully'
  });
});

/**
 * POST /api/users/me/password
 * Change password
 */
app.post('/api/users/me/password', authMiddleware, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Current password and new password are required',
      code: ERROR_CODES.VALIDATION_FAILED
    });
  }

  // Verify current password
  const userResult = userService.getUser(req.user!.userId);
  if (isError(userResult)) {
    return res.status(404).json({
      error: userResult.error.message,
      code: userResult.error.code
    });
  }

  const verifyResult = await passwordService.verify(currentPassword, userResult.data.passwordHash);
  if (isError(verifyResult) || !verifyResult.data) {
    return res.status(401).json({
      error: 'Current password is incorrect',
      code: ERROR_CODES.AUTH_FAILED
    });
  }

  // Validate new password
  const validateResult = passwordService.validate(newPassword);
  if (isError(validateResult)) {
    return res.status(400).json({
      error: validateResult.error.message,
      code: validateResult.error.code
    });
  }

  // Hash new password
  const hashResult = await passwordService.hash(newPassword);
  if (isError(hashResult)) {
    return res.status(500).json({
      error: 'Failed to update password',
      code: ERROR_CODES.OPERATION_FAILED
    });
  }

  // Update user (in real app, update passwordHash in database)
  // This is a simplified example
  res.json({
    message: 'Password updated successfully'
  });
});

/**
 * GET /api/auth/password-policy
 * Get current password policy
 */
app.get('/api/auth/password-policy', (req: Request, res: Response) => {
  const policy = passwordService.getPolicy();
  
  res.json({
    policy: {
      minLength: policy.minLength,
      maxLength: policy.maxLength,
      requireUppercase: policy.requireUppercase,
      requireLowercase: policy.requireLowercase,
      requireNumbers: policy.requireNumbers,
      requireSpecialChars: policy.requireSpecialChars,
      minStrength: policy.minStrength
    }
  });
});

/**
 * POST /api/auth/check-password
 * Check password strength without creating account
 */
app.post('/api/auth/check-password', (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      error: 'Password is required',
      code: ERROR_CODES.VALIDATION_FAILED
    });
  }

  const validation = passwordService.validate(password);
  const strength = passwordService.calculateStrength(password);

  res.json({
    valid: !isError(validation),
    strength,
    error: isError(validation) ? validation.error.message : null
  });
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    code: ERROR_CODES.OPERATION_FAILED
  });
});

// ============================================
// Server startup
// ============================================

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    console.log(`Auth API server running on port ${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log('  POST   /api/auth/register');
    console.log('  POST   /api/auth/login');
    console.log('  POST   /api/auth/refresh');
    console.log('  POST   /api/auth/logout');
    console.log('  GET    /api/auth/password-policy');
    console.log('  POST   /api/auth/check-password');
    console.log('  GET    /api/users/me');
    console.log('  PATCH  /api/users/me');
    console.log('  POST   /api/users/me/password');
    console.log('  GET    /api/users/me/sessions');
    console.log('  DELETE /api/users/me/sessions/:deviceId');
  });
}

export default app;