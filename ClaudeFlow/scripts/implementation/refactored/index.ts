// Main refactored entry point
export { PasswordService } from './passwordService';
export { LoginService } from './loginService';
export { authMiddleware } from './authMiddleware';
export { RateLimiter } from './rateLimiter';

// Re-export types
export type { Config as PasswordConfig } from './passwordService';
export type { LoginRequest, LoginResponse, User, IUserRepository, ITokenService, IRateLimiter } from './loginService';
export type { AuthenticatedRequest } from './authMiddleware';