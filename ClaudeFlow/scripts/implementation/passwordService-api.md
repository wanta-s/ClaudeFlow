# PasswordService API Documentation

## Overview
A secure password hashing and verification service using bcrypt with configurable security levels and validation rules.

## Installation
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

## Quick Start
```typescript
import { PasswordService } from './passwordService';

// Using default configuration
const service = new PasswordService();

// Using security levels
const highSecurity = PasswordService.withLevel('HIGH');

// Hash and verify
const hash = await service.hash('myPassword123');
const isValid = await service.verify('myPassword123', hash);
```

## API Reference

### Classes

#### `PasswordService`
Main service class for password operations.

##### Constructor
```typescript
new PasswordService(config?: PasswordServiceConfig)
```

##### Static Methods
- `withLevel(level: SecurityLevelKey): PasswordService` - Create instance with predefined security level

##### Instance Methods
- `hash(password: string, retries?: number): Promise<string>` - Hash a password
- `verify(password: string, hash: string): Promise<boolean>` - Verify password against hash
- `getConfig(): Required<PasswordServiceConfig>` - Get current configuration

### Interfaces

#### `PasswordServiceConfig`
```typescript
interface PasswordServiceConfig {
  saltRounds?: number;          // Bcrypt salt rounds (default: 10)
  minLength?: number;           // Minimum password length (default: 8)
  requireSpecialChar?: boolean; // Require special characters (default: false)
  requireNumber?: boolean;      // Require numbers (default: false)
  requireUppercase?: boolean;   // Require uppercase letters (default: false)
}
```

#### `SecurityLevel`
```typescript
interface SecurityLevel {
  readonly saltRounds: number;
  readonly minLength: number;
  readonly requireSpecialChar?: boolean;
  readonly requireNumber?: boolean;
  readonly requireUppercase?: boolean;
}
```

### Types

#### `SecurityLevelKey`
```typescript
type SecurityLevelKey = 'LOW' | 'MEDIUM' | 'HIGH';
```

#### `ValidationError`
```typescript
type ValidationError = string | null;
```

### Constants

#### `PasswordService.LEVELS`
Predefined security configurations:

- **LOW**: `{ saltRounds: 10, minLength: 6 }`
- **MEDIUM**: `{ saltRounds: 12, minLength: 8, requireNumber: true }`
- **HIGH**: `{ saltRounds: 14, minLength: 12, requireSpecialChar: true, requireNumber: true, requireUppercase: true }`

## Error Handling

The service throws errors for:
- Empty passwords
- Validation rule failures
- Invalid hash format
- Bcrypt operation failures

All errors include descriptive messages for debugging.

## Security Features

1. **Input Sanitization**: Removes tabs, newlines, and trims whitespace
2. **Bcrypt Hash Validation**: Validates hash format before verification
3. **Configurable Rules**: Flexible password requirements
4. **Retry Mechanism**: Automatic retry with exponential backoff
5. **Immutable Configuration**: Config object cannot be modified after creation

## Performance

- Hash operations: ~100-500ms depending on salt rounds
- Verify operations: ~100-200ms
- Memory efficient with compiled regex patterns
- Exponential backoff prevents resource exhaustion

## Compatibility

- Node.js 14+
- TypeScript 4.0+
- ES2017+ (async/await support required)