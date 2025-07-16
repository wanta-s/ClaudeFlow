import * as bcrypt from 'bcrypt';

// Types from reusable patterns
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ success: true, value });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });

// Simplified configuration
export interface Config {
  readonly saltRounds?: number;
  readonly minLength?: number;
  readonly rules?: string[];
}

// Constants
const PATTERNS = {
  bcrypt: /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/,
  uppercase: /[A-Z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/
} as const;

const ERRORS = {
  EMPTY: 'Password cannot be empty',
  MIN_LENGTH: (n: number) => `Password must be at least ${n} characters`,
  UPPERCASE: 'Password must contain uppercase',
  NUMBER: 'Password must contain number',
  SPECIAL: 'Password must contain special character',
  INVALID_HASH: 'Invalid hash format',
  HASH_FAILED: (reason: string) => `Hash failed: ${reason}`,
  VERIFY_FAILED: (reason: string) => `Verification failed: ${reason}`
} as const;

// Presets from patterns
const PRESETS = {
  LOW: { saltRounds: 10, minLength: 6 },
  MEDIUM: { saltRounds: 12, minLength: 8, rules: ['number'] },
  HIGH: { saltRounds: 14, minLength: 12, rules: ['uppercase', 'number', 'special'] }
} as const;

// Simplified service with performance optimizations
export class PasswordService {
  private readonly config: Required<Config>;
  private readonly validators: Array<(p: string) => string | null>;

  constructor(config: Config = {}) {
    this.config = {
      saltRounds: 10,
      minLength: 8,
      rules: [],
      ...config
    };
    
    // Pre-compile validators for better performance
    this.validators = [
      p => p.length < this.config.minLength ? ERRORS.MIN_LENGTH(this.config.minLength) : null,
      ...this.config.rules.map(rule => this.createRuleValidator(rule))
    ];
  }

  static withLevel(level: keyof typeof PRESETS): PasswordService {
    return new PasswordService(PRESETS[level]);
  }

  async hash(password: string): Promise<Result<string>> {
    const clean = this.normalize(password);
    if (!clean) return err(new Error(ERRORS.EMPTY));
    
    const validationError = this.validators.find(v => v(clean))?.(clean);
    if (validationError) return err(new Error(validationError));
    
    try {
      const hash = await bcrypt.hash(clean, this.config.saltRounds);
      return ok(hash);
    } catch (error) {
      return err(new Error(ERRORS.HASH_FAILED(error instanceof Error ? error.message : 'Unknown')));
    }
  }

  async verify(password: string, hash: string): Promise<Result<boolean>> {
    const clean = this.normalize(password);
    if (!clean || !hash) return err(new Error('Invalid input'));
    if (!PATTERNS.bcrypt.test(hash)) return err(new Error(ERRORS.INVALID_HASH));
    
    try {
      const isValid = await bcrypt.compare(clean, hash);
      return ok(isValid);
    } catch (error) {
      return err(new Error(ERRORS.VERIFY_FAILED(error instanceof Error ? error.message : 'Unknown')));
    }
  }

  getConfig(): Required<Config> {
    return { ...this.config };
  }

  private normalize(input: string): string {
    return input?.replace(/[\t\n\r]/g, '').trim() || '';
  }

  private createRuleValidator(rule: string): (p: string) => string | null {
    switch (rule) {
      case 'uppercase': return p => !PATTERNS.uppercase.test(p) ? ERRORS.UPPERCASE : null;
      case 'number': return p => !PATTERNS.number.test(p) ? ERRORS.NUMBER : null;
      case 'special': return p => !PATTERNS.special.test(p) ? ERRORS.SPECIAL : null;
      default: return () => null;
    }
  }
}