// validators.ts - Validation utilities for Login API
import { LoginRequest, ValidationResult, ValidationDetail } from './types';

// Validation rules
const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9._-]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
  },
} as const;

export function validateLoginRequest(request: LoginRequest): ValidationResult {
  const errors: ValidationDetail[] = [];

  // Username validation
  const usernameError = validateUsername(request.username);
  if (usernameError) {
    errors.push(usernameError);
  }

  // Password validation
  const passwordError = validatePassword(request.password);
  if (passwordError) {
    errors.push(passwordError);
  }

  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? 'Validation failed' : undefined,
    details: errors.length > 0 ? errors : undefined,
  };
}

function validateUsername(username: string): ValidationDetail | null {
  if (!username || typeof username !== 'string') {
    return {
      field: 'username',
      message: 'Username is required',
      code: 'REQUIRED',
    };
  }

  if (username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
    return {
      field: 'username',
      message: `Username must be at least ${VALIDATION_RULES.USERNAME.MIN_LENGTH} characters`,
      code: 'TOO_SHORT',
    };
  }

  if (username.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
    return {
      field: 'username',
      message: `Username must not exceed ${VALIDATION_RULES.USERNAME.MAX_LENGTH} characters`,
      code: 'TOO_LONG',
    };
  }

  if (!VALIDATION_RULES.USERNAME.PATTERN.test(username)) {
    return {
      field: 'username',
      message: 'Username can only contain letters, numbers, dots, underscores, and hyphens',
      code: 'INVALID_FORMAT',
    };
  }

  return null;
}

function validatePassword(password: string): ValidationDetail | null {
  if (!password || typeof password !== 'string') {
    return {
      field: 'password',
      message: 'Password is required',
      code: 'REQUIRED',
    };
  }

  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return {
      field: 'password',
      message: `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`,
      code: 'TOO_SHORT',
    };
  }

  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return {
      field: 'password',
      message: `Password must not exceed ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`,
      code: 'TOO_LONG',
    };
  }

  return null;
}

// Additional validators for other auth operations
export function validateEmail(email: string): ValidationDetail | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || typeof email !== 'string') {
    return {
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED',
    };
  }

  if (!emailRegex.test(email)) {
    return {
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_FORMAT',
    };
  }

  return null;
}

export function validatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 2;

  // Common patterns to avoid
  if (/(password|123456|qwerty)/i.test(password)) {
    score = Math.max(0, score - 3);
    feedback.push('Avoid common passwords');
  }

  // Feedback based on score
  if (score < 3) feedback.push('Use a mix of uppercase, lowercase, numbers, and symbols');
  if (password.length < 12) feedback.push('Consider using a longer password');

  return { score: Math.min(score, 10), feedback };
}