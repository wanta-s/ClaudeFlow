import bcrypt from 'bcrypt';
import { 
  ValidationResult, 
  CacheableValidator,
  createRegexValidator,
  withCache,
  createResult,
  isError,
  ERROR_CODES,
  createError
} from './utils';
import { PasswordPreset, presets, applyPreset } from './presets';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minStrength: number;
  customPatterns?: RegExp[];
  excludePatterns?: RegExp[];
  maxRepeatingChars?: number;
  minDifferentChars?: number;
}

// Optimized character set checks
const CHAR_SETS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  numbers: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>]/
} as const;

// Pre-compiled validators for performance
const validators = {
  hasUppercase: createRegexValidator(CHAR_SETS.uppercase, 'Password must contain uppercase letter'),
  hasLowercase: createRegexValidator(CHAR_SETS.lowercase, 'Password must contain lowercase letter'),
  hasNumbers: createRegexValidator(CHAR_SETS.numbers, 'Password must contain number'),
  hasSpecial: createRegexValidator(CHAR_SETS.special, 'Password must contain special character')
};

// Cached validators
const cachedValidators = {
  hasUppercase: withCache(validators.hasUppercase),
  hasLowercase: withCache(validators.hasLowercase),
  hasNumbers: withCache(validators.hasNumbers),
  hasSpecial: withCache(validators.hasSpecial)
};

export class PasswordService {
  private readonly SALT_ROUNDS = 10;
  private policy: PasswordPolicy;
  private strengthCache = new Map<string, number>();

  constructor(policyOrPreset: PasswordPolicy | PasswordPreset = 'standard') {
    this.policy = typeof policyOrPreset === 'string' 
      ? applyPreset(policyOrPreset)
      : policyOrPreset;
  }

  async hash(password: string): Promise<ValidationResult<string>> {
    const validation = this.validate(password);
    if (isError(validation)) return validation;
    
    try {
      const hash = await bcrypt.hash(password, this.SALT_ROUNDS);
      return createResult(hash);
    } catch (error) {
      return createError('OPERATION_FAILED', 'Failed to hash password');
    }
  }

  async verify(password: string, hash: string): Promise<ValidationResult<boolean>> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return createResult(isValid);
    } catch (error) {
      return createError('OPERATION_FAILED', 'Failed to verify password');
    }
  }

  validate(password: string): ValidationResult<true> {
    // Length checks
    if (password.length < this.policy.minLength) {
      return createError('VALIDATION_FAILED', `Password must be at least ${this.policy.minLength} characters`);
    }
    if (password.length > this.policy.maxLength) {
      return createError('VALIDATION_FAILED', `Password must not exceed ${this.policy.maxLength} characters`);
    }

    // Character requirements - using cached validators
    const checks = [
      { enabled: this.policy.requireUppercase, validator: cachedValidators.hasUppercase },
      { enabled: this.policy.requireLowercase, validator: cachedValidators.hasLowercase },
      { enabled: this.policy.requireNumbers, validator: cachedValidators.hasNumbers },
      { enabled: this.policy.requireSpecialChars, validator: cachedValidators.hasSpecial }
    ];

    for (const { enabled, validator } of checks) {
      if (enabled) {
        const result = validator(password);
        if (isError(result)) return result;
      }
    }

    // Additional pattern checks
    if (this.policy.excludePatterns) {
      for (const pattern of this.policy.excludePatterns) {
        if (pattern.test(password)) {
          return createError('VALIDATION_FAILED', 'Password contains forbidden pattern');
        }
      }
    }

    // Complexity checks
    if (this.policy.maxRepeatingChars) {
      const repeatPattern = new RegExp(`(.)\\1{${this.policy.maxRepeatingChars},}`);
      if (repeatPattern.test(password)) {
        return createError('VALIDATION_FAILED', `Password contains more than ${this.policy.maxRepeatingChars} repeating characters`);
      }
    }

    if (this.policy.minDifferentChars) {
      const uniqueChars = new Set(password).size;
      if (uniqueChars < this.policy.minDifferentChars) {
        return createError('VALIDATION_FAILED', `Password must contain at least ${this.policy.minDifferentChars} different characters`);
      }
    }

    // Strength check
    const strength = this.calculateStrength(password);
    if (strength < this.policy.minStrength) {
      return createError('VALIDATION_FAILED', `Password strength (${strength}) is below minimum required (${this.policy.minStrength})`);
    }

    return createResult(true);
  }

  calculateStrength(password: string): number {
    // Check cache first
    const cached = this.strengthCache.get(password);
    if (cached !== undefined) return cached;

    let score = 0;
    const length = password.length;

    // Length score (0-25 points)
    score += Math.min(25, length * 2);

    // Character variety score (0-30 points)
    const charTypes = [
      CHAR_SETS.uppercase.test(password),
      CHAR_SETS.lowercase.test(password),
      CHAR_SETS.numbers.test(password),
      CHAR_SETS.special.test(password)
    ].filter(Boolean).length;
    score += charTypes * 7.5;

    // Complexity score (0-25 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(25, (uniqueChars / length) * 30);

    // Pattern penalty (0-20 points deduction)
    const patterns = [
      /(.)\1{2,}/, // Repeating characters
      /^[a-z]+$/, // Only lowercase
      /^[A-Z]+$/, // Only uppercase
      /^[0-9]+$/, // Only numbers
      /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/i // Sequential
    ];
    
    const penaltyCount = patterns.filter(p => p.test(password)).length;
    score -= penaltyCount * 4;

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    
    // Cache result
    this.strengthCache.set(password, finalScore);
    
    return finalScore;
  }

  updatePolicy(policy: Partial<PasswordPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    this.strengthCache.clear(); // Clear cache when policy changes
  }

  getPolicy(): Readonly<PasswordPolicy> {
    return { ...this.policy };
  }
}

// Export convenient factory function
export function createPasswordService(policyOrPreset?: PasswordPolicy | PasswordPreset): PasswordService {
  return new PasswordService(policyOrPreset);
}