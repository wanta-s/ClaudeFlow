// Result type for better error handling
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Error codes
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  OPERATION_FAILED: 'OPERATION_FAILED',
  AUTH_FAILED: 'AUTH_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

// Result creators
export function createResult<T>(data: T): ValidationResult<T> {
  return { success: true, data };
}

export function createError(code: string, message: string): ValidationResult<any> {
  return { success: false, error: { code, message } };
}

// Type guards
export function isError<T>(result: ValidationResult<T>): result is { success: false; error: { code: string; message: string } } {
  return !result.success;
}

export function isSuccess<T>(result: ValidationResult<T>): result is { success: true; data: T } {
  return result.success;
}

// Validator types
export type Validator<T> = (value: T) => ValidationResult<true>;
export type AsyncValidator<T> = (value: T) => Promise<ValidationResult<true>>;

// Regex validator factory
export function createRegexValidator(pattern: RegExp, errorMessage: string): Validator<string> {
  return (value: string) => {
    return pattern.test(value) 
      ? createResult(true)
      : createError(ERROR_CODES.VALIDATION_FAILED, errorMessage);
  };
}

// Cache decorator for validators
export interface CacheableValidator<T> extends Validator<T> {
  clearCache(): void;
}

export function withCache<T>(validator: Validator<T>): CacheableValidator<T> {
  const cache = new Map<T, ValidationResult<true>>();
  
  const cachedValidator = (value: T): ValidationResult<true> => {
    const cached = cache.get(value);
    if (cached) return cached;
    
    const result = validator(value);
    if (isSuccess(result)) {
      cache.set(value, result);
    }
    return result;
  };

  cachedValidator.clearCache = () => cache.clear();
  
  return cachedValidator;
}

// Async operation helpers
export async function tryAsync<T>(
  operation: () => Promise<T>,
  errorCode: string = ERROR_CODES.OPERATION_FAILED,
  errorMessage?: string
): Promise<ValidationResult<T>> {
  try {
    const result = await operation();
    return createResult(result);
  } catch (error) {
    const message = errorMessage || (error instanceof Error ? error.message : 'Operation failed');
    return createError(errorCode, message);
  }
}

// Batch validation
export async function validateAll<T>(
  validators: Array<() => ValidationResult<T> | Promise<ValidationResult<T>>>
): Promise<ValidationResult<T[]>> {
  const results = await Promise.all(validators.map(v => v()));
  const errors = results.filter(isError);
  
  if (errors.length > 0) {
    return errors[0]; // Return first error
  }
  
  return createResult(results.map(r => (r as { success: true; data: T }).data));
}

// Rate limiting
export interface RateLimiter {
  check(key: string): boolean;
  reset(key: string): void;
}

export function createRateLimiter(maxAttempts: number, windowMs: number): RateLimiter {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  
  return {
    check(key: string): boolean {
      const now = Date.now();
      const record = attempts.get(key);
      
      if (!record || record.resetAt < now) {
        attempts.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      
      if (record.count >= maxAttempts) {
        return false;
      }
      
      record.count++;
      return true;
    },
    
    reset(key: string): void {
      attempts.delete(key);
    }
  };
}

// String normalization
export function normalizeString(str: string): string {
  return str.trim().toLowerCase();
}

// Email normalization
export function normalizeEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return normalizeString(email);
  
  // Remove dots and everything after + in local part (Gmail style)
  const cleanLocal = localPart.replace(/\./g, '').split('+')[0];
  return `${cleanLocal}@${domain}`.toLowerCase();
}

// Performance timer
export interface Timer {
  stop(): number;
}

export function startTimer(): Timer {
  const start = process.hrtime.bigint();
  
  return {
    stop(): number {
      const end = process.hrtime.bigint();
      return Number((end - start) / 1000000n); // Convert to milliseconds
    }
  };
}

// Retry mechanism
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
  } = {}
): Promise<ValidationResult<T>> {
  const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      return createResult(result);
    } catch (error) {
      if (attempt === maxAttempts) {
        const message = error instanceof Error ? error.message : 'Operation failed after retries';
        return createError(ERROR_CODES.OPERATION_FAILED, message);
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, attempt - 1)));
    }
  }
  
  return createError(ERROR_CODES.OPERATION_FAILED, 'Operation failed');
}

// Debounce decorator
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(func(...args));
      }, delay);
    });
  }) as T;
}

// Object sanitization
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowedKeys: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  
  for (const key of allowedKeys) {
    if (key in obj) {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

// Type assertion helpers
export function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  return value;
}

export function assertNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number') {
    throw new Error(`${fieldName} must be a number`);
  }
  return value;
}

export function assertObject<T extends object>(value: unknown, fieldName: string): T {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${fieldName} must be an object`);
  }
  return value as T;
}