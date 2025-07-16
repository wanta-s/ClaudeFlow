import * as bcrypt from 'bcrypt';

export interface PasswordServiceConfig {
  saltRounds?: number;
  minLength?: number;
  requireSpecialChar?: boolean;
  requireNumber?: boolean;
  requireUppercase?: boolean;
}

export interface SecurityLevel {
  readonly saltRounds: number;
  readonly minLength: number;
  readonly requireSpecialChar?: boolean;
  readonly requireNumber?: boolean;
  readonly requireUppercase?: boolean;
}

export type SecurityLevelKey = 'LOW' | 'MEDIUM' | 'HIGH';
export type ValidationError = string | null;

const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const PATTERNS = {
  uppercase: /[A-Z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/
} as const;

export class PasswordService {
  private readonly config: Required<PasswordServiceConfig>;
  private readonly rules: ReadonlyArray<(p: string) => ValidationError>;

  static readonly LEVELS: Record<SecurityLevelKey, SecurityLevel> = {
    LOW: { saltRounds: 10, minLength: 6 },
    MEDIUM: { saltRounds: 12, minLength: 8, requireNumber: true },
    HIGH: {
      saltRounds: 14,
      minLength: 12,
      requireSpecialChar: true,
      requireNumber: true,
      requireUppercase: true
    }
  };

  constructor(config: PasswordServiceConfig = {}) {
    this.config = {
      saltRounds: 10,
      minLength: 8,
      requireSpecialChar: false,
      requireNumber: false,
      requireUppercase: false,
      ...config
    };
    this.rules = [
      (p: string) => p.length < this.config.minLength ? `Password must be at least ${this.config.minLength} characters` : null,
      (p: string) => this.config.requireUppercase && !PATTERNS.uppercase.test(p) ? 'Password must contain uppercase' : null,
      (p: string) => this.config.requireNumber && !PATTERNS.number.test(p) ? 'Password must contain number' : null,
      (p: string) => this.config.requireSpecialChar && !PATTERNS.special.test(p) ? 'Password must contain special character' : null
    ];
  }

  static withLevel(level: SecurityLevelKey): PasswordService {
    return new PasswordService(PasswordService.LEVELS[level]);
  }

  async hash(password: string, retries = 3): Promise<string> {
    const clean = password?.replace(/[\t\n\r]/g, '').trim();
    if (!clean) throw new Error('Password cannot be empty');
    
    const error = this.rules.find(r => r(clean))?.(clean);
    if (error) throw new Error(error);
    
    const attempt = async (n: number): Promise<string> => {
      try {
        return await bcrypt.hash(clean, this.config.saltRounds);
      } catch (e) {
        if (n >= retries) throw new Error(`Failed after ${retries} attempts`);
        await new Promise(r => setTimeout(r, 100 << n));
        return attempt(n + 1);
      }
    };
    
    return attempt(0);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const clean = password?.replace(/[\t\n\r]/g, '').trim();
    if (!clean || !hash) throw new Error('Invalid input');
    if (!BCRYPT_PATTERN.test(hash)) throw new Error('Invalid hash format');
    
    try {
      return await bcrypt.compare(clean, hash);
    } catch (e) {
      throw new Error(`Verification failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  getConfig(): Required<PasswordServiceConfig> {
    return { ...this.config };
  }
}