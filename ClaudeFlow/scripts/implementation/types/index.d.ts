// Authentication System Type Definitions
// Version: 1.0.0

// ============================================
// Core Types
// ============================================

/**
 * Result type for operation outcomes
 * @template T The type of successful data
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/**
 * Standard error codes used throughout the system
 */
export const ERROR_CODES: {
  readonly VALIDATION_FAILED: 'VALIDATION_FAILED';
  readonly NOT_FOUND: 'NOT_FOUND';
  readonly DUPLICATE_ENTRY: 'DUPLICATE_ENTRY';
  readonly OPERATION_FAILED: 'OPERATION_FAILED';
  readonly AUTH_FAILED: 'AUTH_FAILED';
  readonly PERMISSION_DENIED: 'PERMISSION_DENIED';
  readonly RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED';
};

// ============================================
// Password Service Types
// ============================================

/**
 * Password policy configuration
 */
export interface PasswordPolicy {
  /** Minimum password length */
  minLength: number;
  /** Maximum password length */
  maxLength: number;
  /** Require at least one uppercase letter */
  requireUppercase: boolean;
  /** Require at least one lowercase letter */
  requireLowercase: boolean;
  /** Require at least one number */
  requireNumbers: boolean;
  /** Require at least one special character */
  requireSpecialChars: boolean;
  /** Minimum password strength score (0-100) */
  minStrength: number;
  /** Custom validation patterns (optional) */
  customPatterns?: RegExp[];
  /** Patterns to exclude (optional) */
  excludePatterns?: RegExp[];
  /** Maximum consecutive repeating characters (optional) */
  maxRepeatingChars?: number;
  /** Minimum number of different characters (optional) */
  minDifferentChars?: number;
}

/**
 * Pre-defined password policy presets
 */
export type PasswordPreset = 'minimal' | 'standard' | 'strict' | 'paranoid';

/**
 * Password service for hashing and validation
 */
export declare class PasswordService {
  constructor(policyOrPreset?: PasswordPolicy | PasswordPreset);
  
  /**
   * Hash a password
   * @param password The password to hash
   * @returns Hashed password or error
   */
  hash(password: string): Promise<ValidationResult<string>>;
  
  /**
   * Verify a password against a hash
   * @param password The password to verify
   * @param hash The hash to verify against
   * @returns Verification result
   */
  verify(password: string, hash: string): Promise<ValidationResult<boolean>>;
  
  /**
   * Validate a password against the policy
   * @param password The password to validate
   * @returns Validation result
   */
  validate(password: string): ValidationResult<true>;
  
  /**
   * Calculate password strength
   * @param password The password to analyze
   * @returns Strength score (0-100)
   */
  calculateStrength(password: string): number;
  
  /**
   * Update the password policy
   * @param policy Partial policy to merge with existing
   */
  updatePolicy(policy: Partial<PasswordPolicy>): void;
  
  /**
   * Get the current password policy
   * @returns Current policy (read-only)
   */
  getPolicy(): Readonly<PasswordPolicy>;
}

// ============================================
// User Service Types
// ============================================

/**
 * User entity
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User email (normalized) */
  email: string;
  /** Username */
  username: string;
  /** Hashed password */
  passwordHash: string;
  /** User profile information */
  profile: UserProfile;
  /** User settings */
  settings: UserSettings;
  /** User metadata */
  metadata: UserMetadata;
}

/**
 * User profile information
 */
export interface UserProfile {
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Display name (auto-generated) */
  displayName?: string;
  /** Avatar URL (optional) */
  avatar?: string;
  /** Bio text (optional) */
  bio?: string;
}

/**
 * User settings
 */
export interface UserSettings {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'auto';
  /** Language code */
  language: string;
  /** Timezone */
  timezone: string;
  /** Notification preferences */
  notifications: NotificationSettings;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Email notifications enabled */
  email: boolean;
  /** Push notifications enabled */
  push: boolean;
  /** SMS notifications enabled */
  sms: boolean;
}

/**
 * User metadata
 */
export interface UserMetadata {
  /** Account creation date */
  createdAt: Date;
  /** Last update date */
  updatedAt: Date;
  /** Last login date (optional) */
  lastLoginAt?: Date;
  /** Total login count */
  loginCount: number;
  /** Account active status */
  isActive: boolean;
  /** Email verification status */
  isVerified: boolean;
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  /** User email */
  email: string;
  /** Username */
  username: string;
  /** Password (will be hashed) */
  password: string;
  /** Profile information */
  profile: Omit<UserProfile, 'displayName'>;
  /** Optional settings */
  settings?: Partial<UserSettings>;
}

/**
 * Input for updating a user
 */
export interface UpdateUserInput {
  /** New email (optional) */
  email?: string;
  /** New username (optional) */
  username?: string;
  /** Profile updates (optional) */
  profile?: Partial<UserProfile>;
  /** Settings updates (optional) */
  settings?: Partial<UserSettings>;
}

/**
 * User service for user management
 */
export declare class UserService {
  constructor(passwordService: PasswordService);
  
  /**
   * Create a new user
   * @param input User creation data
   * @returns Created user or error
   */
  createUser(input: CreateUserInput): Promise<ValidationResult<User>>;
  
  /**
   * Update an existing user
   * @param id User ID
   * @param input Update data
   * @returns Updated user or error
   */
  updateUser(id: string, input: UpdateUserInput): Promise<ValidationResult<User>>;
  
  /**
   * Authenticate a user
   * @param emailOrUsername Email or username
   * @param password Password
   * @returns Authenticated user or error
   */
  authenticate(emailOrUsername: string, password: string): Promise<ValidationResult<User>>;
  
  /**
   * Get a user by ID
   * @param id User ID
   * @returns User or error
   */
  getUser(id: string): ValidationResult<User>;
  
  /**
   * Delete a user
   * @param id User ID
   * @returns Success status or error
   */
  deleteUser(id: string): ValidationResult<boolean>;
  
  /**
   * List users with pagination
   * @param options Pagination options
   * @returns Array of users
   */
  listUsers(options?: { limit?: number; offset?: number }): User[];
  
  /**
   * Get total user count
   * @returns Number of users
   */
  getUserCount(): number;
  
  /**
   * Get active user count
   * @returns Number of active users
   */
  getActiveUserCount(): number;
}

// ============================================
// Auth Service Types
// ============================================

/**
 * Authentication tokens
 */
export interface AuthTokens {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
  /** Access token expiry in seconds */
  expiresIn: number;
}

/**
 * JWT token payload
 */
export interface TokenPayload {
  /** User ID */
  userId: string;
  /** User email */
  email: string;
  /** Username */
  username: string;
  /** Token type */
  type: 'access' | 'refresh';
  /** Issued at (Unix timestamp) */
  iat?: number;
  /** Expires at (Unix timestamp) */
  exp?: number;
}

/**
 * Session information
 */
export interface SessionInfo {
  /** User ID */
  userId: string;
  /** Device identifier */
  deviceId: string;
  /** Session creation date */
  createdAt: Date;
  /** Last access date */
  lastAccessedAt: Date;
  /** Session expiry date */
  expiresAt: Date;
  /** User agent string (optional) */
  userAgent?: string;
  /** IP address (optional) */
  ipAddress?: string;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** JWT signing secret */
  jwtSecret: string;
  /** Access token expiry (default: '15m') */
  accessTokenExpiry?: string;
  /** Refresh token expiry (default: '7d') */
  refreshTokenExpiry?: string;
  /** Maximum sessions per user (default: 5) */
  maxSessions?: number;
  /** Session timeout in milliseconds (default: 30 minutes) */
  sessionTimeout?: number;
}

/**
 * Authentication service
 */
export declare class AuthService {
  constructor(userService: UserService, config: AuthConfig);
  
  /**
   * Login a user
   * @param emailOrUsername Email or username
   * @param password Password
   * @param deviceId Device identifier
   * @param metadata Optional metadata
   * @returns Auth tokens or error
   */
  login(
    emailOrUsername: string, 
    password: string,
    deviceId: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<ValidationResult<AuthTokens>>;
  
  /**
   * Refresh authentication tokens
   * @param refreshToken Refresh token
   * @returns New auth tokens or error
   */
  refresh(refreshToken: string): Promise<ValidationResult<AuthTokens>>;
  
  /**
   * Logout a user
   * @param accessToken Access token
   * @returns Success status or error
   */
  logout(accessToken: string): Promise<ValidationResult<boolean>>;
  
  /**
   * Verify an access token
   * @param token Access token
   * @returns Token payload or error
   */
  verifyAccessToken(token: string): ValidationResult<TokenPayload>;
  
  /**
   * Get user sessions
   * @param userId User ID
   * @returns Array of sessions
   */
  getSessions(userId: string): SessionInfo[];
  
  /**
   * Revoke a specific session
   * @param userId User ID
   * @param deviceId Device ID
   * @returns Success status or error
   */
  revokeSession(userId: string, deviceId: string): ValidationResult<boolean>;
  
  /**
   * Get active session count
   * @returns Number of active sessions
   */
  getActiveSessionCount(): number;
  
  /**
   * Get blacklisted token count
   * @returns Number of blacklisted tokens
   */
  getBlacklistedTokenCount(): number;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a password service instance
 * @param policyOrPreset Policy object or preset name
 * @returns Password service instance
 */
export declare function createPasswordService(
  policyOrPreset?: PasswordPolicy | PasswordPreset
): PasswordService;

/**
 * Create a user service instance
 * @param passwordService Password service instance
 * @returns User service instance
 */
export declare function createUserService(
  passwordService: PasswordService
): UserService;

/**
 * Create an auth service instance
 * @param userService User service instance
 * @param config Auth configuration
 * @returns Auth service instance
 */
export declare function createAuthService(
  userService: UserService, 
  config: AuthConfig
): AuthService;

// ============================================
// Utility Types
// ============================================

/**
 * Validator function type
 */
export type Validator<T> = (value: T) => ValidationResult<true>;

/**
 * Async validator function type
 */
export type AsyncValidator<T> = (value: T) => Promise<ValidationResult<true>>;

/**
 * Cacheable validator with cache control
 */
export interface CacheableValidator<T> extends Validator<T> {
  /** Clear the validation cache */
  clearCache(): void;
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /** Check if request is allowed */
  check(key: string): boolean;
  /** Reset rate limit for key */
  reset(key: string): void;
}

/**
 * Performance timer interface
 */
export interface Timer {
  /** Stop timer and get elapsed milliseconds */
  stop(): number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create a successful result
 * @param data The data to wrap
 * @returns Success result
 */
export declare function createResult<T>(data: T): ValidationResult<T>;

/**
 * Create an error result
 * @param code Error code
 * @param message Error message
 * @returns Error result
 */
export declare function createError(code: string, message: string): ValidationResult<any>;

/**
 * Type guard for error results
 * @param result The result to check
 * @returns True if result is an error
 */
export declare function isError<T>(result: ValidationResult<T>): result is { success: false; error: { code: string; message: string } };

/**
 * Type guard for success results
 * @param result The result to check
 * @returns True if result is successful
 */
export declare function isSuccess<T>(result: ValidationResult<T>): result is { success: true; data: T };

/**
 * Create a regex-based validator
 * @param pattern The regex pattern
 * @param errorMessage Error message on failure
 * @returns Validator function
 */
export declare function createRegexValidator(pattern: RegExp, errorMessage: string): Validator<string>;

/**
 * Add caching to a validator
 * @param validator The validator to cache
 * @returns Cacheable validator
 */
export declare function withCache<T>(validator: Validator<T>): CacheableValidator<T>;

/**
 * Create a rate limiter
 * @param maxAttempts Maximum attempts allowed
 * @param windowMs Time window in milliseconds
 * @returns Rate limiter instance
 */
export declare function createRateLimiter(maxAttempts: number, windowMs: number): RateLimiter;

/**
 * Start a performance timer
 * @returns Timer instance
 */
export declare function startTimer(): Timer;

/**
 * Normalize email address
 * @param email Email to normalize
 * @returns Normalized email
 */
export declare function normalizeEmail(email: string): string;

/**
 * Apply a password preset
 * @param preset Preset name
 * @returns Password policy
 */
export declare function applyPreset(preset: PasswordPreset): PasswordPolicy;