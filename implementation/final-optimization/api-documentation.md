# Password Service API Documentation

## Overview

The Password Service provides secure password hashing and validation functionality using bcrypt. It supports configurable security levels and comprehensive password strength validation.

## Installation

```bash
npm install bcrypt
npm install @types/bcrypt --save-dev
```

## Quick Start

```typescript
import { passwordService } from './passwordService';

// Use pre-configured instances
const hashedPassword = await passwordService.high.hash('mySecurePassword123!');
const isValid = await passwordService.high.verify('mySecurePassword123!', hashedPassword);
```

## API Reference

### Classes

#### `PasswordService`

Main service class for password operations.

##### Constructor

```typescript
constructor(config: PasswordServiceConfig = SECURITY_PRESETS.MEDIUM)
```

##### Methods

###### `hash(password: string): Promise<string>`

Hashes a password using bcrypt.

**Parameters:**
- `password` (string): Plain text password to hash

**Returns:** Promise<string> - Hashed password

**Throws:**
- `Error` - If password is invalid or hashing fails

###### `verify(password: string, hash: string): Promise<boolean>`

Verifies a password against a hash.

**Parameters:**
- `password` (string): Plain text password to verify
- `hash` (string): Bcrypt hash to compare against

**Returns:** Promise<boolean> - True if password matches

**Throws:**
- `Error` - If inputs are invalid or verification fails

###### `validateStrength(password: string): ValidationResult`

Validates password strength against configured rules.

**Parameters:**
- `password` (string): Password to validate

**Returns:** ValidationResult
```typescript
{
  isValid: boolean;
  errors: string[];
}
```

###### `getConfig(): Readonly<PasswordServiceConfig>`

Returns the current configuration.

**Returns:** Readonly<PasswordServiceConfig>

##### Factory Methods

###### `static create(config?: Partial<PasswordServiceConfig>): PasswordService`

Creates a new instance with custom configuration.

###### `static createWithLevel(level: SecurityLevel): PasswordService`

Creates a new instance with a predefined security level.

### Interfaces

#### `PasswordServiceConfig`

```typescript
interface PasswordServiceConfig {
  saltRounds: number;           // Bcrypt salt rounds (8-14)
  minLength: number;            // Minimum password length
  maxLength: number;            // Maximum password length
  requireUpperCase: boolean;    // Require uppercase letters
  requireLowerCase: boolean;    // Require lowercase letters
  requireNumbers: boolean;      // Require numeric characters
  requireSpecialChars: boolean; // Require special characters
  specialChars?: string;        // Custom special characters
}
```

#### `ValidationResult`

```typescript
interface ValidationResult {
  isValid: boolean;   // Whether password meets all requirements
  errors: string[];   // List of validation errors
}
```

### Type Definitions

#### `SecurityLevel`

```typescript
type SecurityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
```

### Pre-configured Instances

The module exports pre-configured instances for common use cases:

```typescript
export const passwordService = {
  low: PasswordService.createWithLevel('LOW'),
  medium: PasswordService.createWithLevel('MEDIUM'),
  high: PasswordService.createWithLevel('HIGH')
};
```

### Security Presets

| Level | Salt Rounds | Min Length | Requirements |
|-------|------------|------------|--------------|
| LOW | 8 | 6 | Lowercase only |
| MEDIUM | 10 | 8 | Upper, Lower, Numbers |
| HIGH | 12 | 12 | Upper, Lower, Numbers, Special |

## Error Handling

All errors include descriptive messages:

- `Invalid input` - Input validation failed
- `Password cannot be empty` - Empty password provided
- `Minimum length is X` - Password too short
- `Maximum length is X` - Password too long
- `At least one uppercase letter required`
- `At least one lowercase letter required`
- `At least one number required`
- `At least one special character required (chars)`
- `Invalid hash format` - Hash format validation failed
- `Password hashing failed` - Bcrypt operation failed
- `Password verification failed` - Verification operation failed

## Performance Considerations

1. **Salt Rounds**: Higher values increase security but decrease performance
   - LOW (8): ~40ms per hash
   - MEDIUM (10): ~160ms per hash
   - HIGH (12): ~640ms per hash

2. **Validation**: Strength validation is synchronous and fast (<1ms)

3. **Memory**: Service instances are lightweight (~1KB per instance)

## Security Best Practices

1. Always use HTTPS when transmitting passwords
2. Never log or store plain text passwords
3. Use HIGH security level for admin/privileged accounts
4. Implement rate limiting for authentication endpoints
5. Consider implementing password history checks
6. Add account lockout mechanisms after failed attempts

## Migration Guide

### From v1 to v2

```typescript
// Old
const service = new PasswordService({ saltRounds: 10, minLength: 8 });

// New
const service = PasswordService.create({ saltRounds: 10, minLength: 8 });
// or
const service = passwordService.medium;
```

## Browser Compatibility

This service requires Node.js and is not suitable for browser environments due to bcrypt's native dependencies. For browser-based password hashing, consider using WebCrypto API or a pure JavaScript implementation.