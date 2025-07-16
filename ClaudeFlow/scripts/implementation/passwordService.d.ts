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

export declare class PasswordService {
  static readonly LEVELS: Record<SecurityLevelKey, SecurityLevel>;
  
  constructor(config?: PasswordServiceConfig);
  
  static withLevel(level: SecurityLevelKey): PasswordService;
  
  hash(password: string, retries?: number): Promise<string>;
  
  verify(password: string, hash: string): Promise<boolean>;
  
  getConfig(): Required<PasswordServiceConfig>;
}