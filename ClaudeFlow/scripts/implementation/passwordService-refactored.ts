import * as bcrypt from 'bcrypt';

export interface PasswordServiceConfig {
  saltRounds?: number;
  minLength?: number;
  requireSpecialChar?: boolean;
  requireNumber?: boolean;
  requireUppercase?: boolean;
}

type ValidationRule = (pwd: string) => string | null;

const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const VALIDATION_PATTERNS = {
  uppercase: /[A-Z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/
} as const;

export class PasswordService {
  private config: Required<PasswordServiceConfig>;
  private validationRules: ValidationRule[];

  static readonly SECURITY_LEVELS = {
    LOW: { saltRounds: 10, minLength: 6 },
    MEDIUM: { saltRounds: 12, minLength: 8, requireNumber: true },
    HIGH: {
      saltRounds: 14,
      minLength: 12,
      requireSpecialChar: true,
      requireNumber: true,
      requireUppercase: true
    }
  } as const;

  constructor(config: PasswordServiceConfig = {}) {
    this.config = {
      saltRounds: 10,
      minLength: 8,
      requireSpecialChar: false,
      requireNumber: false,
      requireUppercase: false,
      ...config
    };
    
    this.validationRules = this.buildValidationRules();
  }

  static withSecurityLevel(level: keyof typeof PasswordService.SECURITY_LEVELS): PasswordService {
    return new PasswordService(PasswordService.SECURITY_LEVELS[level]);
  }

  private buildValidationRules(): ValidationRule[] {
    return [
      (pwd: string) => pwd.length < this.config.minLength 
        ? `Password must be at least ${this.config.minLength} characters long` : null,
      (pwd: string) => this.config.requireUppercase && !VALIDATION_PATTERNS.uppercase.test(pwd)
        ? 'Password must contain at least one uppercase letter' : null,
      (pwd: string) => this.config.requireNumber && !VALIDATION_PATTERNS.number.test(pwd)
        ? 'Password must contain at least one number' : null,
      (pwd: string) => this.config.requireSpecialChar && !VALIDATION_PATTERNS.special.test(pwd)
        ? 'Password must contain at least one special character' : null
    ];
  }

  private normalizePassword(password: string): string {
    return password?.replace(/[\t\n\r]/g, '').trim() || '';
  }

  private validatePassword(password: string): string {
    const normalized = this.normalizePassword(password);
    if (!normalized) throw new Error('Password cannot be empty');
    
    for (const rule of this.validationRules) {
      const error = rule(normalized);
      if (error) throw new Error(error);
    }
    
    return normalized;
  }

  async hash(password: string, retries: number = 3): Promise<string> {
    const normalized = this.validatePassword(password);
    
    const retry = async (attempt: number, lastError?: Error): Promise<string> => {
      try {
        const hash = await bcrypt.hash(normalized, this.config.saltRounds);
        if (!hash) throw new Error('Hash generation failed');
        return hash;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        if (attempt >= retries) {
          throw new Error(`Failed after ${retries} attempts: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 100 * (1 << attempt)));
        return retry(attempt + 1, err);
      }
    };
    
    return retry(0);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const normalized = this.normalizePassword(password);
    
    if (!normalized) throw new Error('Password cannot be empty');
    if (!hash) throw new Error('Hash cannot be empty');
    if (!BCRYPT_PATTERN.test(hash)) throw new Error('Invalid hash format');
    
    try {
      return await bcrypt.compare(normalized, hash);
    } catch (error) {
      throw new Error(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getConfig(): Required<PasswordServiceConfig> {
    return { ...this.config };
  }
}