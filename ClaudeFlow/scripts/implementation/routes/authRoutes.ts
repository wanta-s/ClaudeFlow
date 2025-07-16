/**
 * Authentication routes
 */
import { Router } from 'express';
import { container } from '../container/Container';
import { LoginService } from '../loginService';
import { RegisterService } from '../services/RegisterService';
import { authMiddleware } from '../authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRegister, validateLogin, validate } from '../middleware/validation';
import { RateLimitError } from '../errors/AppError';
import rateLimit from 'express-rate-limit';

/**
 * Create authentication router
 * @returns {Router} Express router
 */
export function createAuthRouter(): Router {
  const router = Router();

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts',
    handler: (req, res) => {
      throw new RateLimitError('Too many authentication attempts');
    }
  });

  /**
   * POST /auth/register
   * Register a new user
   */
  router.post(
    '/register',
    authLimiter,
    validate(validateRegister),
    asyncHandler(async (req, res) => {
      const registerService = container.get<RegisterService>('registerService');
      const result = await registerService.register(req.body);
      
      res.status(201).json({
        success: true,
        data: result
      });
    })
  );

  /**
   * POST /auth/login
   * Login user
   */
  router.post(
    '/login',
    authLimiter,
    validate(validateLogin),
    asyncHandler(async (req, res) => {
      const loginService = container.get<LoginService>('loginService');
      const result = await loginService.login(req.body);
      
      res.json({
        success: true,
        data: result.data
      });
    })
  );

  /**
   * GET /auth/me
   * Get current user information
   */
  router.get(
    '/me',
    authMiddleware,
    asyncHandler(async (req: any, res) => {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    })
  );

  /**
   * POST /auth/logout
   * Logout user (client should discard tokens)
   */
  router.post(
    '/logout',
    authMiddleware,
    asyncHandler(async (req: any, res) => {
      // In a real application, you might want to:
      // - Invalidate the refresh token in database
      // - Add the access token to a blacklist
      // For now, we just return success
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    })
  );

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  router.post(
    '/refresh',
    asyncHandler(async (req, res) => {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          }
        });
        return;
      }

      const tokenService = container.get<TokenService>('tokenService');
      
      try {
        // Verify refresh token
        const payload = await tokenService.verifyToken(refreshToken);
        
        // Get user from repository
        const userRepository = container.get<UserRepository>('userRepository');
        const user = await userRepository.findById(payload.sub);
        
        if (!user) {
          res.status(401).json({
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found'
            }
          });
          return;
        }

        // Generate new tokens
        const tokens = await tokenService.generateTokenPair(user);
        
        res.json({
          success: true,
          data: tokens
        });
      } catch (error) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token'
          }
        });
      }
    })
  );

  return router;
}

// Export for backward compatibility
export default createAuthRouter();