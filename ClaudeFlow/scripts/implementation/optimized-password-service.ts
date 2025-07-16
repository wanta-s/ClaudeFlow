import * as bcrypt from 'bcrypt';

// ===== Type Definitions =====

/**
 * Configuration options for PasswordService
 * @interface PasswordServiceConfig
 */
export interface PasswordServiceConfig {
  /** Number of salt rounds for bcrypt (default: 10) */
  saltRounds?: number;
  /** Minimum password length (default: 8) */
  minLength?: number;
  /** Require at least one special character (default: false) */
  requireSpecialChar?: boolean;
  /** Require at least one number (default: false) */
  requireNumber?: boolean;
  /** Require at least one uppercase letter (default: false) */
  requireUppercase?: boolean;
}

/**
 * Immutable security level configuration
 * @interface SecurityLevel
 */
export interface SecurityLevel {
  readonly saltRounds: number;
  readonly minLength: number;
  readonly requireSpecialChar?: boolean;
  readonly requireNumber?: boolean;
  readonly requireUppercase?: boolean;
}

/**
 * Predefined security levels
 * @type
 */
export type SecurityLevelKey = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Validation error result
 * @type
 */
export type ValidationError = string | null;

/**
 * Result type for operations that can fail
 * @template T - Success value type
 * @template E - Error type
 */
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Password validation result with details
 * @interface ValidationResult
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hash operation options
 * @interface HashOptions
 */
export interface HashOptions {
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Custom salt rounds (overrides config) */
  saltRounds?: number;
}

/**
 * Verify operation options
 * @interface VerifyOptions
 */
export interface VerifyOptions {
  /** Skip hash format validation (default: false) */
  skipValidation?: boolean;
}

// ===== Constants =====

/** Bcrypt hash format validation pattern */
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** Password validation patterns */
const PATTERNS = {
  uppercase: /[A-Z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/
} as const;

/** Default configuration values */
const DEFAULT_CONFIG: Required<PasswordServiceConfig> = {
  saltRounds: 10,
  minLength: 8,
  requireSpecialChar: false,
  requireNumber: false,
  requireUppercase: false
} as const;

/** Predefined security levels */
const SECURITY_LEVELS: Record<SecurityLevelKey, SecurityLevel> = {
  LOW: { 
    saltRounds: 10, 
    minLength: 6 
  },
  MEDIUM: { 
    saltRounds: 12, 
    minLength: 8, 
    requireNumber: true 
  },
  HIGH: {
    saltRounds: 14,
    minLength: 12,
    requireSpecialChar: true,
    requireNumber: true,
    requireUppercase: true
  }
} as const;

/** Error messages */
const ERROR_MESSAGES = {
  EMPTY_PASSWORD: 'Password cannot be empty',
  INVALID_INPUT: 'Invalid input',
  INVALID_HASH: 'Invalid hash format',
  MIN_LENGTH: (n: number) => `Password must be at least ${n} characters`,
  REQUIRE_UPPERCASE: 'Password must contain uppercase',
  REQUIRE_NUMBER: 'Password must contain number',
  REQUIRE_SPECIAL: 'Password must contain special character',
  HASH_FAILED: (attempts: number) => `Failed after ${attempts} attempts`,
  VERIFY_FAILED: (msg: string) => `Verification failed: ${msg}`
} as const;

// ===== Utility Functions =====

/**
 * Creates a successful result
 * @template T
 * @param value - The success value
 * @returns Success result
 */
const ok = <T>(value: T): Result<T, never> => ({ success: true, value });

/**
 * Creates a failed result
 * @template E
 * @param error - The error
 * @returns Error result
 */
const err = <E>(error: E): Result<never, E> => ({ success: false, error });

/**
 * Normalizes password by removing control characters and trimming
 * @param password - Raw password input
 * @returns Normalized password
 */
const normalizePassword = (password: string): string => 
  password?.replace(/[\t\n\r]/g, '').trim() || '';

/**
 * Creates a validation rule function
 * @param condition - Condition to check
 * @param message - Error message if condition fails
 * @returns Validation function
 */
const createRule = (
  condition: (config: Required<PasswordServiceConfig>) => boolean,
  check: (password: string) => boolean,
  message: string
): (password: string, config: Required<PasswordServiceConfig>) => ValidationError => 
  (password, config) => condition(config) && !check(password) ? message : null;

// ===== Main Class =====

/**
 * Password hashing and verification service using bcrypt
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const service = new PasswordService();
 * const hash = await service.hash('myPassword123');
 * const isValid = await service.verify('myPassword123', hash);
 * 
 * // With custom configuration
 * const secureService = new PasswordService({
 *   minLength: 12,
 *   requireUppercase: true,
 *   requireNumber: true,
 *   requireSpecialChar: true
 * });
 * 
 * // Using security presets
 * const highSecurity = PasswordService.withLevel('HIGH');
 * ```
 */
export class PasswordService {
  private readonly config: Required<PasswordServiceConfig>;
  private readonly validators: ReadonlyArray<(p: string) => ValidationError>;

  /**
   * Creates a new PasswordService instance
   * @param config - Optional configuration overrides
   */
  constructor(config: PasswordServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validators = this.createValidators();
  }

  /**
   * Creates a PasswordService with a predefined security level
   * @param level - Security level key
   * @returns New PasswordService instance
   * 
   * @example
   * ```typescript
   * const service = PasswordService.withLevel('HIGH');
   * ```
   */
  static withLevel(level: SecurityLevelKey): PasswordService {
    return new PasswordService(SECURITY_LEVELS[level]);
  }

  /**
   * Hashes a password using bcrypt
   * @param password - Plain text password
   * @param options - Optional hash options
   * @returns Promise resolving to hashed password
   * @throws Error if password is invalid or hashing fails
   * 
   * @example
   * ```typescript
   * const hash = await service.hash('myPassword123');
   * // With custom options
   * const hash = await service.hash('myPassword123', { retries: 5 });
   * ```
   */
  async hash(password: string, options?: HashOptions): Promise<string> {
    const { retries = 3, saltRounds = this.config.saltRounds } = options || {};
    
    const normalized = normalizePassword(password);
    if (!normalized) {
      throw new Error(ERROR_MESSAGES.EMPTY_PASSWORD);
    }
    
    const validation = this.validate(normalized);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }
    
    return this.hashWithRetry(normalized, saltRounds, retries);
  }

  /**
   * Hashes a password and returns a Result type
   * @param password - Plain text password
   * @param options - Optional hash options
   * @returns Promise resolving to Result with hashed password or error
   * 
   * @example
   * ```typescript
   * const result = await service.tryHash('myPassword123');
   * if (result.success) {
   *   console.log('Hash:', result.value);
   * } else {
   *   console.error('Error:', result.error.message);
   * }
   * ```
   */
  async tryHash(password: string, options?: HashOptions): Promise<Result<string>> {
    try {
      const hash = await this.hash(password, options);
      return ok(hash);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Verifies a password against a hash
   * @param password - Plain text password
   * @param hash - Bcrypt hash
   * @param options - Optional verify options
   * @returns Promise resolving to boolean
   * @throws Error if inputs are invalid
   * 
   * @example
   * ```typescript
   * const isValid = await service.verify('myPassword123', hash);
   * ```
   */
  async verify(password: string, hash: string, options?: VerifyOptions): Promise<boolean> {
    const { skipValidation = false } = options || {};
    
    const normalized = normalizePassword(password);
    if (!normalized || !hash) {
      throw new Error(ERROR_MESSAGES.INVALID_INPUT);
    }
    
    if (!skipValidation && !BCRYPT_PATTERN.test(hash)) {
      throw new Error(ERROR_MESSAGES.INVALID_HASH);
    }
    
    try {
      return await bcrypt.compare(normalized, hash);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(ERROR_MESSAGES.VERIFY_FAILED(message));
    }
  }

  /**
   * Verifies a password and returns a Result type
   * @param password - Plain text password
   * @param hash - Bcrypt hash
   * @param options - Optional verify options
   * @returns Promise resolving to Result with boolean or error
   * 
   * @example
   * ```typescript
   * const result = await service.tryVerify('myPassword123', hash);
   * if (result.success) {
   *   console.log('Valid:', result.value);
   * } else {
   *   console.error('Error:', result.error.message);
   * }
   * ```
   */
  async tryVerify(
    password: string, 
    hash: string, 
    options?: VerifyOptions
  ): Promise<Result<boolean>> {
    try {
      const isValid = await this.verify(password, hash, options);
      return ok(isValid);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validates a password against configured rules
   * @param password - Password to validate
   * @returns Validation result with any errors
   * 
   * @example
   * ```typescript
   * const validation = service.validate('weak');
   * if (!validation.isValid) {
   *   console.log('Errors:', validation.errors);
   * }
   * ```
   */
  validate(password: string): ValidationResult {
    const errors = this.validators
      .map(validator => validator(password))
      .filter((error): error is string => error !== null);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets a copy of the current configuration
   * @returns Current configuration
   * 
   * @example
   * ```typescript
   * const config = service.getConfig();
   * console.log('Min length:', config.minLength);
   * ```
   */
  getConfig(): Required<PasswordServiceConfig> {
    return { ...this.config };
  }

  /**
   * Gets available security levels
   * @returns Security levels object
   * 
   * @example
   * ```typescript
   * const levels = PasswordService.getSecurityLevels();
   * console.log(levels.HIGH);
   * ```
   */
  static getSecurityLevels(): typeof SECURITY_LEVELS {
    return SECURITY_LEVELS;
  }

  // ===== Private Methods =====

  /**
   * Creates validation rules based on configuration
   */
  private createValidators(): ReadonlyArray<(p: string) => ValidationError> {
    return [
      (p: string) => p.length < this.config.minLength 
        ? ERROR_MESSAGES.MIN_LENGTH(this.config.minLength) 
        : null,
      createRule(
        c => c.requireUppercase,
        p => PATTERNS.uppercase.test(p),
        ERROR_MESSAGES.REQUIRE_UPPERCASE
      )(this.config),
      createRule(
        c => c.requireNumber,
        p => PATTERNS.number.test(p),
        ERROR_MESSAGES.REQUIRE_NUMBER
      )(this.config),
      createRule(
        c => c.requireSpecialChar,
        p => PATTERNS.special.test(p),
        ERROR_MESSAGES.REQUIRE_SPECIAL
      )(this.config)
    ].map(rule => (p: string) => rule(p));
  }

  /**
   * Hashes password with retry logic
   */
  private async hashWithRetry(
    password: string, 
    saltRounds: number, 
    maxRetries: number
  ): Promise<string> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(100 * (1 << (attempt - 1)));
        }
        
        return await bcrypt.hash(password, saltRounds);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    throw new Error(ERROR_MESSAGES.HASH_FAILED(maxRetries));
  }

  /**
   * Delays execution for exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===== Export All Types =====
export type {
  Result,
  ValidationResult,
  HashOptions,
  VerifyOptions
};

export {
  SECURITY_LEVELS,
  ERROR_MESSAGES,
  PATTERNS,
  DEFAULT_CONFIG
};