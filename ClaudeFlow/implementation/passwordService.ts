import bcrypt from 'bcrypt';

export type SecurityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PasswordConfig {
  saltRounds: number;
  minLength: number;
  requireUpperCase: boolean;
  requireLowerCase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars?: string;
}

export const SecurityLevels = {
  LOW: {
    saltRounds: 8,
    minLength: 6,
    requireUpperCase: true,
    requireLowerCase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  },
  MEDIUM: {
    saltRounds: 10,
    minLength: 8,
    requireUpperCase: true,
    requireLowerCase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  },
  HIGH: {
    saltRounds: 12,
    minLength: 12,
    requireUpperCase: true,
    requireLowerCase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  }
};

export class PasswordService {
  private config: PasswordConfig;

  constructor(config?: PasswordConfig) {
    this.config = config || SecurityLevels.MEDIUM;
  }

  async hash(password: string): Promise<string> {
    if (!password || typeof password !== 'string' || password.trim() === '') {
      throw new Error('Password is required and must be a non-empty string');
    }
    if (password.length > 1000) {
      throw new Error('Password exceeds maximum length of 1000 characters');
    }
    try {
      return await bcrypt.hash(password, this.config.saltRounds);
    } catch (error: any) {
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string' || password.trim() === '' || hash.trim() === '') {
      throw new Error('Password and hash are required and must be non-empty strings');
    }
    if (password.length > 1000) {
      throw new Error('Password exceeds maximum length of 1000 characters');
    }
    if (!hash.match(/^\$2[aby]\$\d{2}\$/)) {
      throw new Error('Invalid hash format');
    }
    try {
      return await bcrypt.compare(password, hash);
    } catch (error: any) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }

  validateStrength(password: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }
    if (typeof password !== 'string') {
      errors.push('Password must be a string');
      return { isValid: false, errors };
    }
    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }
    if (this.config.requireUpperCase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (this.config.requireLowerCase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (this.config.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (this.config.requireSpecialChars) {
      const specialChars = this.config.specialChars || '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const regex = new RegExp(`[${specialChars.replace(/[\[\]\\{}()*+?.,^$|#]/g, '\\$&')}]`);
      if (!regex.test(password)) {
        errors.push('Password must contain at least one special character');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  getConfig(): PasswordConfig {
    return { ...this.config };
  }

  static withSecurityLevel(level: SecurityLevel): PasswordService {
    return new PasswordService(SecurityLevels[level]);
  }

  static withConfig(config: PasswordConfig): PasswordService {
    return new PasswordService(config);
  }
}