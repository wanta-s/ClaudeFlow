import * as bcrypt from 'bcrypt';

/**
 * Password service interface for hashing and validation operations
 */
export interface IPasswordService {
  /**
   * Hash a plain text password
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password
   * @throws Error if password is invalid or hashing fails
   */
  hash(password: string): Promise<string>;
  
  /**
   * Verify a password against a hash
   * @param password - Plain text password to verify
   * @param hash - Hashed password to compare against
   * @returns Promise resolving to true if password matches
   * @throws Error if inputs are invalid or verification fails
   */
  verify(password: string, hash: string): Promise<boolean>;
  
  /**
   * Validate password strength against configured rules
   * @param password - Password to validate
   * @returns Validation result with errors if any
   */
  validateStrength(password: string): PasswordValidationResult;
}

/**
 * Result of password strength validation
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Password service configuration
 */
export interface PasswordConfig {
  /** Number of salt rounds for bcrypt (default: 10) */
  saltRounds: number;
  /** Minimum password length */
  minLength: number;
  /** Maximum password length (prevents DoS) */
  maxLength: number;
  /** Require at least one uppercase letter */
  requireUpperCase: boolean;
  /** Require at least one lowercase letter */
  requireLowerCase: boolean;
  /** Require at least one number */
  requireNumbers: boolean;
  /** Require at least one special character */
  requireSpecialChars: boolean;
  /** Custom special characters (if not set, uses default) */
  specialChars?: string;
}

/**
 * Password error types
 */
export enum PasswordError {
  HASH_FAILED = 'PASSWORD_HASH_FAILED',
  VERIFY_FAILED = 'PASSWORD_VERIFY_FAILED',
  INVALID_INPUT = 'PASSWORD_INVALID_INPUT',
  TOO_SHORT = 'PASSWORD_TOO_SHORT',
  TOO_LONG = 'PASSWORD_TOO_LONG',
  MISSING_UPPERCASE = 'PASSWORD_MISSING_UPPERCASE',
  MISSING_LOWERCASE = 'PASSWORD_MISSING_LOWERCASE',
  MISSING_NUMBER = 'PASSWORD_MISSING_NUMBER',
  MISSING_SPECIAL = 'PASSWORD_MISSING_SPECIAL'
}

/**
 * Predefined security levels
 */
export const SecurityLevels = {
  LOW: {
    saltRounds: 8,
    minLength: 6,
    maxLength: 128,
    requireUpperCase: false,
    requireLowerCase: true,
    requireNumbers: false,
    requireSpecialChars: false
  },
  MEDIUM: {
    saltRounds: 10,
    minLength: 8,
    maxLength: 128,
    requireUpperCase: true,
    requireLowerCase: true,
    requireNumbers: true,
    requireSpecialChars: false
  },
  HIGH: {
    saltRounds: 12,
    minLength: 12,
    maxLength: 128,
    requireUpperCase: true,
    requireLowerCase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  }
} as const;

const defaultConfig: PasswordConfig = SecurityLevels.MEDIUM;

/**
 * Service for password hashing and validation
 * Uses bcrypt for secure password hashing
 */
export class PasswordService implements IPasswordService {
  private readonly defaultSpecialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  constructor(private config: PasswordConfig = defaultConfig) {}
  
  /**
   * Hash a password using bcrypt
   * @param password - Plain text password
   * @returns Hashed password
   * @throws Error with context if hashing fails
   */
  async hash(password: string): Promise<string> {
    // Input validation
    if (!password || typeof password !== 'string') {
      throw new Error(`${PasswordError.INVALID_INPUT}: Password must be a non-empty string`);
    }
    
    if (password.length === 0) {
      throw new Error(`${PasswordError.INVALID_INPUT}: Password cannot be empty`);
    }
    
    if (password.length > this.config.maxLength) {
      throw new Error(`${PasswordError.TOO_LONG}: Password exceeds maximum length of ${this.config.maxLength}`);
    }
    
    try {
      return await bcrypt.hash(password, this.config.saltRounds);
    } catch (error) {
      // Preserve original error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`${PasswordError.HASH_FAILED}: ${errorMessage}`);
    }
  }
  
  /**
   * Verify a password against a hash
   * @param password - Plain text password
   * @param hash - Bcrypt hash to verify against
   * @returns True if password matches
   * @throws Error with context if verification fails
   */
  async verify(password: string, hash: string): Promise<boolean> {
    // Input validation
    if (!password || typeof password !== 'string') {
      throw new Error(`${PasswordError.INVALID_INPUT}: Password must be a non-empty string`);
    }
    
    if (!hash || typeof hash !== 'string') {
      throw new Error(`${PasswordError.INVALID_INPUT}: Hash must be a non-empty string`);
    }
    
    // Basic bcrypt hash format validation
    if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
      throw new Error(`${PasswordError.INVALID_INPUT}: Invalid hash format`);
    }
    
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      // Preserve original error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`${PasswordError.VERIFY_FAILED}: ${errorMessage}`);
    }
  }
  
  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Validation result with detailed errors
   */
  validateStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];
    
    // Input validation
    if (!password || typeof password !== 'string') {
      errors.push(PasswordError.INVALID_INPUT);
      return { isValid: false, errors };
    }
    
    // Length validation
    if (password.length < this.config.minLength) {
      errors.push(`${PasswordError.TOO_SHORT}: Minimum length is ${this.config.minLength}`);
    }
    
    if (password.length > this.config.maxLength) {
      errors.push(`${PasswordError.TOO_LONG}: Maximum length is ${this.config.maxLength}`);
    }
    
    // Character requirements
    if (this.config.requireUpperCase && !/[A-Z]/.test(password)) {
      errors.push(`${PasswordError.MISSING_UPPERCASE}: At least one uppercase letter required`);
    }
    
    if (this.config.requireLowerCase && !/[a-z]/.test(password)) {
      errors.push(`${PasswordError.MISSING_LOWERCASE}: At least one lowercase letter required`);
    }
    
    if (this.config.requireNumbers && !/[0-9]/.test(password)) {
      errors.push(`${PasswordError.MISSING_NUMBER}: At least one number required`);
    }
    
    if (this.config.requireSpecialChars) {
      const specialChars = this.config.specialChars || this.defaultSpecialChars;
      const specialCharsRegex = new RegExp(`[${specialChars.replace(/[\[\]\\^-]/g, '\\$&')}]`);
      
      if (!specialCharsRegex.test(password)) {
        errors.push(`${PasswordError.MISSING_SPECIAL}: At least one special character required (${specialChars})`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get current configuration
   * @returns Current password configuration
   */
  getConfig(): Readonly<PasswordConfig> {
    return { ...this.config };
  }
  
  /**
   * Create a new instance with custom configuration
   * @param config - Custom configuration
   * @returns New PasswordService instance
   */
  static withConfig(config: Partial<PasswordConfig>): PasswordService {
    return new PasswordService({ ...defaultConfig, ...config });
  }
  
  /**
   * Create instance with predefined security level
   * @param level - Security level ('LOW', 'MEDIUM', or 'HIGH')
   * @returns New PasswordService instance
   */
  static withSecurityLevel(level: keyof typeof SecurityLevels): PasswordService {
    return new PasswordService(SecurityLevels[level]);
  }
}