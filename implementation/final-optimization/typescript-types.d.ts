/**
 * Complete TypeScript type definitions for Password Service
 */

declare module '@company/password-service' {
  /**
   * Password service configuration options
   */
  export interface PasswordServiceConfig {
    /** Number of salt rounds for bcrypt (8-14 recommended) */
    saltRounds: number;
    /** Minimum password length */
    minLength: number;
    /** Maximum password length (prevents DoS) */
    maxLength: number;
    /** Require at least one uppercase letter */
    requireUpperCase: boolean;
    /** Require at least one lowercase letter */
    requireLowerCase: boolean;
    /** Require at least one numeric character */
    requireNumbers: boolean;
    /** Require at least one special character */
    requireSpecialChars: boolean;
    /** Custom special characters (defaults to standard set) */
    specialChars?: string;
  }

  /**
   * Result of password strength validation
   */
  export interface ValidationResult {
    /** Whether password meets all requirements */
    isValid: boolean;
    /** List of validation errors (empty if valid) */
    errors: string[];
  }

  /**
   * Predefined security levels
   */
  export type SecurityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

  /**
   * Password service interface
   */
  export interface IPasswordService {
    /**
     * Hash a plain text password
     * @param password - Plain text password to hash
     * @returns Promise resolving to hashed password
     * @throws {Error} If password is invalid or hashing fails
     */
    hash(password: string): Promise<string>;

    /**
     * Verify a password against a hash
     * @param password - Plain text password to verify
     * @param hash - Hashed password to compare against
     * @returns Promise resolving to true if password matches
     * @throws {Error} If inputs are invalid or verification fails
     */
    verify(password: string, hash: string): Promise<boolean>;

    /**
     * Validate password strength against configured rules
     * @param password - Password to validate
     * @returns Validation result with errors if any
     */
    validateStrength(password: string): ValidationResult;

    /**
     * Get current configuration
     * @returns Current password configuration (read-only)
     */
    getConfig(): Readonly<PasswordServiceConfig>;
  }

  /**
   * Main password service class
   */
  export class PasswordService implements IPasswordService {
    /**
     * Create a new password service instance
     * @param config - Service configuration (defaults to MEDIUM security)
     */
    constructor(config?: PasswordServiceConfig);

    hash(password: string): Promise<string>;
    verify(password: string, hash: string): Promise<boolean>;
    validateStrength(password: string): ValidationResult;
    getConfig(): Readonly<PasswordServiceConfig>;

    /**
     * Create a new instance with custom configuration
     * @param config - Partial configuration to override defaults
     * @returns New PasswordService instance
     */
    static create(config?: Partial<PasswordServiceConfig>): PasswordService;

    /**
     * Create a new instance with predefined security level
     * @param level - Security level to use
     * @returns New PasswordService instance
     */
    static createWithLevel(level: SecurityLevel): PasswordService;
  }

  /**
   * Pre-configured password service instances
   */
  export const passwordService: {
    /** Low security instance (fast, minimal requirements) */
    low: PasswordService;
    /** Medium security instance (balanced) */
    medium: PasswordService;
    /** High security instance (slow, strict requirements) */
    high: PasswordService;
  };

  /**
   * Security level presets
   */
  export const SECURITY_PRESETS: Readonly<Record<SecurityLevel, PasswordServiceConfig>>;

  /**
   * Default special characters used for validation
   */
  export const DEFAULT_SPECIAL_CHARS: string;

  /**
   * Error type enumeration for type-safe error handling
   */
  export enum PasswordErrorType {
    INVALID_INPUT = 'INVALID_INPUT',
    EMPTY_PASSWORD = 'EMPTY_PASSWORD',
    TOO_SHORT = 'TOO_SHORT',
    TOO_LONG = 'TOO_LONG',
    MISSING_UPPERCASE = 'MISSING_UPPERCASE',
    MISSING_LOWERCASE = 'MISSING_LOWERCASE',
    MISSING_NUMBER = 'MISSING_NUMBER',
    MISSING_SPECIAL = 'MISSING_SPECIAL',
    INVALID_HASH = 'INVALID_HASH',
    HASH_FAILED = 'HASH_FAILED',
    VERIFY_FAILED = 'VERIFY_FAILED'
  }

  /**
   * Custom error class for password-related errors
   */
  export class PasswordError extends Error {
    /** Error type for programmatic handling */
    readonly type: PasswordErrorType;
    /** Additional context about the error */
    readonly context?: Record<string, any>;

    constructor(type: PasswordErrorType, message: string, context?: Record<string, any>);
  }
}

/**
 * Augment global types for better integration
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Override default password salt rounds */
      PASSWORD_SALT_ROUNDS?: string;
      /** Override minimum password length */
      PASSWORD_MIN_LENGTH?: string;
      /** Override maximum password length */
      PASSWORD_MAX_LENGTH?: string;
    }
  }
}

/**
 * Module augmentation for Express integration
 */
declare module 'express' {
  interface Request {
    /** Password service instance (if middleware is used) */
    passwordService?: import('@company/password-service').IPasswordService;
  }
}

/**
 * Utility types for common use cases
 */
export type PasswordHash = string & { readonly __brand: unique symbol };
export type PlainPassword = string & { readonly __brand: unique symbol };

/**
 * Type guards
 */
export function isPasswordHash(value: string): value is PasswordHash;
export function isValidPasswordConfig(config: any): config is PasswordServiceConfig;
export function isPasswordError(error: any): error is PasswordError;

/**
 * Middleware types for framework integration
 */
export interface PasswordMiddlewareOptions {
  /** Security level to use for validation */
  level?: SecurityLevel;
  /** Custom configuration */
  config?: Partial<PasswordServiceConfig>;
  /** Whether to validate on specific routes only */
  routes?: string[] | RegExp[];
}

/**
 * Express middleware
 */
export function passwordMiddleware(options?: PasswordMiddlewareOptions): any;

/**
 * Validation decorators for class-validator
 */
export function IsStrongPassword(level?: SecurityLevel): PropertyDecorator;
export function MatchesPasswordPolicy(config?: Partial<PasswordServiceConfig>): PropertyDecorator;