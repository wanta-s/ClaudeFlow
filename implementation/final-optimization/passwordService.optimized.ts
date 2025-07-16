import * as bcrypt from 'bcrypt';

// Type definitions
export interface PasswordServiceConfig {
  saltRounds: number;
  minLength: number;
  maxLength: number;
  requireUpperCase: boolean;
  requireLowerCase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type SecurityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface IPasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
  validateStrength(password: string): ValidationResult;
  getConfig(): Readonly<PasswordServiceConfig>;
}

// Constants
const SECURITY_PRESETS: Record<SecurityLevel, PasswordServiceConfig> = {
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
};

const DEFAULT_SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Error messages
const ERRORS = {
  INVALID_INPUT: 'Invalid input',
  EMPTY_PASSWORD: 'Password cannot be empty',
  TOO_SHORT: (min: number) => `Minimum length is ${min}`,
  TOO_LONG: (max: number) => `Maximum length is ${max}`,
  MISSING_UPPERCASE: 'At least one uppercase letter required',
  MISSING_LOWERCASE: 'At least one lowercase letter required',
  MISSING_NUMBER: 'At least one number required',
  MISSING_SPECIAL: (chars: string) => `At least one special character required (${chars})`,
  INVALID_HASH: 'Invalid hash format',
  HASH_FAILED: 'Password hashing failed',
  VERIFY_FAILED: 'Password verification failed'
} as const;

// Validation rules
const VALIDATION_RULES = {
  uppercase: { pattern: /[A-Z]/, error: ERRORS.MISSING_UPPERCASE },
  lowercase: { pattern: /[a-z]/, error: ERRORS.MISSING_LOWERCASE },
  numbers: { pattern: /[0-9]/, error: ERRORS.MISSING_NUMBER }
} as const;

/**
 * Optimized password service with improved performance and type safety
 */
export class PasswordService implements IPasswordService {
  private readonly config: Readonly<PasswordServiceConfig>;
  private readonly specialCharsRegex: RegExp;

  constructor(config: PasswordServiceConfig = SECURITY_PRESETS.MEDIUM) {
    this.config = Object.freeze({ ...config });
    const chars = config.specialChars || DEFAULT_SPECIAL_CHARS;
    this.specialCharsRegex = new RegExp(`[${chars.replace(/[\[\]\\^-]/g, '\\$&')}]`);
  }

  async hash(password: string): Promise<string> {
    this.validateInput(password);
    
    if (password.length > this.config.maxLength) {
      throw new Error(ERRORS.TOO_LONG(this.config.maxLength));
    }

    try {
      return await bcrypt.hash(password, this.config.saltRounds);
    } catch (error) {
      throw new Error(`${ERRORS.HASH_FAILED}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verify(password: string, hash: string): Promise<boolean> {
    this.validateInput(password);
    this.validateHash(hash);

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`${ERRORS.VERIFY_FAILED}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateStrength(password: string): ValidationResult {
    if (!password || typeof password !== 'string') {
      return { isValid: false, errors: [ERRORS.INVALID_INPUT] };
    }

    const errors: string[] = [];

    // Length validation
    if (password.length < this.config.minLength) {
      errors.push(ERRORS.TOO_SHORT(this.config.minLength));
    }
    if (password.length > this.config.maxLength) {
      errors.push(ERRORS.TOO_LONG(this.config.maxLength));
    }

    // Character requirements
    if (this.config.requireUpperCase && !VALIDATION_RULES.uppercase.pattern.test(password)) {
      errors.push(VALIDATION_RULES.uppercase.error);
    }
    if (this.config.requireLowerCase && !VALIDATION_RULES.lowercase.pattern.test(password)) {
      errors.push(VALIDATION_RULES.lowercase.error);
    }
    if (this.config.requireNumbers && !VALIDATION_RULES.numbers.pattern.test(password)) {
      errors.push(VALIDATION_RULES.numbers.error);
    }
    if (this.config.requireSpecialChars && !this.specialCharsRegex.test(password)) {
      const chars = this.config.specialChars || DEFAULT_SPECIAL_CHARS;
      errors.push(ERRORS.MISSING_SPECIAL(chars));
    }

    return { isValid: errors.length === 0, errors };
  }

  getConfig(): Readonly<PasswordServiceConfig> {
    return this.config;
  }

  // Factory methods
  static create(config?: Partial<PasswordServiceConfig>): PasswordService {
    return new PasswordService({ ...SECURITY_PRESETS.MEDIUM, ...config });
  }

  static createWithLevel(level: SecurityLevel): PasswordService {
    return new PasswordService(SECURITY_PRESETS[level]);
  }

  // Private helper methods
  private validateInput(password: string): void {
    if (!password || typeof password !== 'string') {
      throw new Error(ERRORS.INVALID_INPUT);
    }
    if (password.length === 0) {
      throw new Error(ERRORS.EMPTY_PASSWORD);
    }
  }

  private validateHash(hash: string): void {
    if (!hash || typeof hash !== 'string') {
      throw new Error(ERRORS.INVALID_INPUT);
    }
    if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
      throw new Error(ERRORS.INVALID_HASH);
    }
  }
}

// Singleton instances for common use cases
export const passwordService = {
  low: PasswordService.createWithLevel('LOW'),
  medium: PasswordService.createWithLevel('MEDIUM'),
  high: PasswordService.createWithLevel('HIGH')
};