# PasswordService API Documentation

## Overview

The `PasswordService` is a TypeScript class that provides secure password hashing and verification using bcrypt. It supports configurable validation rules, predefined security levels, and robust error handling with retry mechanisms.

## Installation

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

## Quick Start

```typescript
import { PasswordService } from './password-service';

// Basic usage
const service = new PasswordService();
const hash = await service.hash('myPassword123');
const isValid = await service.verify('myPassword123', hash);

// High security preset
const secureService = PasswordService.withLevel('HIGH');
```

## API Reference

### Class: PasswordService

#### Constructor

```typescript
new PasswordService(config?: PasswordServiceConfig)
```

Creates a new PasswordService instance with optional configuration.

**Parameters:**
- `config` (optional): Configuration object

**Example:**
```typescript
const service = new PasswordService({
  minLength: 12,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  saltRounds: 14
});
```

#### Static Methods

##### `withLevel(level: SecurityLevelKey): PasswordService`

Creates a PasswordService with predefined security settings.

**Parameters:**
- `level`: 'LOW' | 'MEDIUM' | 'HIGH'

**Security Levels:**
- **LOW**: 6+ chars, 10 salt rounds
- **MEDIUM**: 8+ chars, number required, 12 salt rounds  
- **HIGH**: 12+ chars, uppercase + number + special required, 14 salt rounds

**Example:**
```typescript
const highSecurity = PasswordService.withLevel('HIGH');
```

##### `getSecurityLevels(): typeof SECURITY_LEVELS`

Returns available security level configurations.

#### Instance Methods

##### `hash(password: string, options?: HashOptions): Promise<string>`

Hashes a password using bcrypt with validation and retry logic.

**Parameters:**
- `password`: Plain text password
- `options` (optional):
  - `retries`: Number of retry attempts (default: 3)
  - `saltRounds`: Override default salt rounds

**Returns:** Promise resolving to hashed password

**Throws:** Error if validation fails or hashing fails after retries

**Example:**
```typescript
try {
  const hash = await service.hash('MyP@ssw0rd123');
  console.log(hash);
} catch (error) {
  console.error('Hash failed:', error.message);
}
```

##### `tryHash(password: string, options?: HashOptions): Promise<Result<string>>`

Safe version of hash that returns a Result type instead of throwing.

**Returns:** Promise resolving to Result with success/error

**Example:**
```typescript
const result = await service.tryHash('MyP@ssw0rd123');
if (result.success) {
  console.log('Hash:', result.value);
} else {
  console.error('Error:', result.error.message);
}
```

##### `verify(password: string, hash: string, options?: VerifyOptions): Promise<boolean>`

Verifies a password against a bcrypt hash.

**Parameters:**
- `password`: Plain text password
- `hash`: Bcrypt hash to verify against
- `options` (optional):
  - `skipValidation`: Skip hash format validation (default: false)

**Returns:** Promise resolving to boolean

**Throws:** Error if inputs are invalid

**Example:**
```typescript
const isValid = await service.verify('MyP@ssw0rd123', hash);
if (isValid) {
  console.log('Password correct!');
}
```

##### `tryVerify(password: string, hash: string, options?: VerifyOptions): Promise<Result<boolean>>`

Safe version of verify that returns a Result type.

**Example:**
```typescript
const result = await service.tryVerify('MyP@ssw0rd123', hash);
if (result.success && result.value) {
  console.log('Password valid!');
}
```

##### `validate(password: string): ValidationResult`

Validates a password against configured rules without hashing.

**Returns:** Object with `isValid` boolean and `errors` array

**Example:**
```typescript
const validation = service.validate('weak');
if (!validation.isValid) {
  console.log('Password errors:', validation.errors);
}
```

##### `getConfig(): Required<PasswordServiceConfig>`

Returns a copy of the current configuration.

**Example:**
```typescript
const config = service.getConfig();
console.log('Min length:', config.minLength);
```

## Types

### PasswordServiceConfig

```typescript
interface PasswordServiceConfig {
  saltRounds?: number;        // Bcrypt salt rounds (default: 10)
  minLength?: number;         // Minimum length (default: 8)
  requireSpecialChar?: boolean; // Require special char (default: false)
  requireNumber?: boolean;     // Require number (default: false)
  requireUppercase?: boolean;  // Require uppercase (default: false)
}
```

### SecurityLevel

```typescript
interface SecurityLevel {
  readonly saltRounds: number;
  readonly minLength: number;
  readonly requireSpecialChar?: boolean;
  readonly requireNumber?: boolean;
  readonly requireUppercase?: boolean;
}
```

### Result<T, E>

```typescript
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };
```

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### HashOptions

```typescript
interface HashOptions {
  retries?: number;    // Retry attempts (default: 3)
  saltRounds?: number; // Override config salt rounds
}
```

### VerifyOptions

```typescript
interface VerifyOptions {
  skipValidation?: boolean; // Skip hash format check (default: false)
}
```

## Error Messages

The service uses consistent error messages:

- `"Password cannot be empty"` - Empty or whitespace-only password
- `"Password must be at least N characters"` - Too short
- `"Password must contain uppercase"` - Missing uppercase
- `"Password must contain number"` - Missing number
- `"Password must contain special character"` - Missing special char
- `"Invalid input"` - Invalid verify inputs
- `"Invalid hash format"` - Malformed bcrypt hash
- `"Failed after N attempts"` - Hash retry exhausted
- `"Verification failed: [details]"` - Verify error

## Special Characters

The following characters are considered special:
```
!@#$%^&*(),.?":{}|<>
```

## Usage Examples

### Basic Password Hashing

```typescript
const service = new PasswordService();

// Hash a password
const hash = await service.hash('userPassword123');

// Store hash in database
await db.users.update({ passwordHash: hash });

// Later, verify password
const isValid = await service.verify('userPassword123', hash);
```

### Custom Validation Rules

```typescript
const service = new PasswordService({
  minLength: 10,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true
});

// Validate before hashing
const validation = service.validate('weak');
if (!validation.isValid) {
  return { error: validation.errors.join(', ') };
}

const hash = await service.hash('Strong@Pass123');
```

### Using Security Presets

```typescript
// Development environment
const devService = PasswordService.withLevel('LOW');

// Production environment
const prodService = PasswordService.withLevel('HIGH');

// Environment-based
const service = PasswordService.withLevel(
  process.env.NODE_ENV === 'production' ? 'HIGH' : 'LOW'
);
```

### Error Handling with Result Type

```typescript
// Traditional try-catch
try {
  const hash = await service.hash(password);
  return { success: true, hash };
} catch (error) {
  return { success: false, error: error.message };
}

// Using Result type
const result = await service.tryHash(password);
if (result.success) {
  return { hash: result.value };
} else {
  return { error: result.error.message };
}
```

### Password Reset Flow

```typescript
async function resetPassword(userId: string, newPassword: string) {
  const service = PasswordService.withLevel('MEDIUM');
  
  // Validate new password
  const validation = service.validate(newPassword);
  if (!validation.isValid) {
    throw new Error(`Invalid password: ${validation.errors[0]}`);
  }
  
  // Hash with extra retries for reliability
  const hash = await service.hash(newPassword, { retries: 5 });
  
  // Update user
  await db.users.update(userId, { 
    passwordHash: hash,
    passwordChangedAt: new Date()
  });
}
```

### Integration with Express

```typescript
import express from 'express';
import { PasswordService } from './password-service';

const app = express();
const passwordService = PasswordService.withLevel('HIGH');

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  
  // Validate password
  const validation = passwordService.validate(password);
  if (!validation.isValid) {
    return res.status(400).json({ 
      error: 'Invalid password',
      details: validation.errors 
    });
  }
  
  // Hash password
  const result = await passwordService.tryHash(password);
  if (!result.success) {
    return res.status(500).json({ 
      error: 'Failed to process password' 
    });
  }
  
  // Create user
  const user = await createUser(email, result.value);
  res.status(201).json({ id: user.id });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const isValid = await passwordService.verify(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateToken(user.id);
  res.json({ token });
});
```

## Best Practices

1. **Use Security Presets**: Start with predefined levels rather than custom config
2. **Validate Early**: Use `validate()` before hashing to provide immediate feedback
3. **Handle Errors**: Use `tryHash()` and `tryVerify()` for better error handling
4. **Environment Config**: Use different security levels for dev/staging/production
5. **Retry Logic**: Increase retries for critical operations
6. **Password Normalization**: Service automatically trims and removes control chars
7. **Async Operations**: All operations are async, handle accordingly

## Migration Guide

From basic bcrypt usage:

```typescript
// Before
const hash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hash);

// After
const service = new PasswordService();
const hash = await service.hash(password);
const isValid = await service.verify(password, hash);
```

From custom implementation:

```typescript
// Before
function validatePassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

// After
const service = new PasswordService({
  minLength: 8,
  requireUppercase: true,
  requireNumber: true
});

const validation = service.validate(password);
if (!validation.isValid) {
  // Handle errors
}
```

## Performance Considerations

- **Salt Rounds**: Higher rounds = more secure but slower (10-14 recommended)
- **Validation**: Performed before hashing to fail fast
- **Retries**: Exponential backoff prevents overwhelming the system
- **Memory**: Each instance stores minimal configuration data

## Security Notes

1. **Never log passwords**: Service only logs errors, never password content
2. **Hash storage**: Store only the hash, never the plain password
3. **Timing attacks**: Bcrypt's compare is timing-safe
4. **Salt rounds**: Adjust based on your security needs and server capacity
5. **Input normalization**: Removes only whitespace, preserves Unicode

## Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { PasswordService } from './password-service';

vi.mock('bcrypt');

describe('PasswordService', () => {
  it('should hash password with validation', async () => {
    const service = new PasswordService({ minLength: 10 });
    const mockedBcrypt = vi.mocked(bcrypt);
    
    mockedBcrypt.hash.mockResolvedValue('hashed');
    
    const hash = await service.hash('validPass123');
    expect(hash).toBe('hashed');
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('validPass123', 10);
  });
});
```

## Changelog

### Version 2.0.0
- Added Result type for safe error handling
- Added tryHash and tryVerify methods
- Improved TypeScript types and documentation
- Added validation method for pre-check
- Enhanced retry mechanism with exponential backoff

### Version 1.0.0
- Initial release with basic hash/verify
- Configurable validation rules
- Security level presets
- Retry logic for reliability