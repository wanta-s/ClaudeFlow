# Authentication System API Documentation

## Overview

This authentication system provides a complete solution for user management, password handling, and session management. It features:

- **Type-safe operations** with Result types
- **Performance optimized** with caching and indexing
- **Security focused** with bcrypt hashing and JWT tokens
- **Flexible configuration** with presets and policies
- **Clean API** with factory functions

## Quick Start

```typescript
import { 
  createPasswordService, 
  createUserService, 
  createAuthService 
} from './auth-system';

// 1. Initialize services
const passwordService = createPasswordService('standard');
const userService = createUserService(passwordService);
const authService = createAuthService(userService, {
  jwtSecret: process.env.JWT_SECRET!
});

// 2. Create a user
const userResult = await userService.createUser({
  email: 'user@example.com',
  username: 'johndoe',
  password: 'SecurePass123!',
  profile: {
    firstName: 'John',
    lastName: 'Doe'
  }
});

if (userResult.success) {
  console.log('User created:', userResult.data.id);
}

// 3. Login
const loginResult = await authService.login(
  'user@example.com',
  'SecurePass123!',
  'device-123'
);

if (loginResult.success) {
  console.log('Access token:', loginResult.data.accessToken);
}
```

## Password Service API

### Constructor

```typescript
const passwordService = createPasswordService(policyOrPreset?: PasswordPolicy | PasswordPreset);
```

#### Presets

- `'minimal'` - Basic requirements (6+ chars, strength 30+)
- `'standard'` - Balanced security (8+ chars, mixed case + numbers, strength 50+)
- `'strict'` - High security (12+ chars, all character types, strength 70+)
- `'paranoid'` - Maximum security (16+ chars, pattern restrictions, strength 90+)

#### Custom Policy

```typescript
const passwordService = createPasswordService({
  minLength: 10,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minStrength: 60,
  maxRepeatingChars: 2,
  minDifferentChars: 8,
  excludePatterns: [/password/i, /123456/]
});
```

### Methods

#### `hash(password: string): Promise<ValidationResult<string>>`

Hash a password using bcrypt.

```typescript
const hashResult = await passwordService.hash('MyPassword123!');
if (hashResult.success) {
  // Store hashResult.data in database
}
```

#### `verify(password: string, hash: string): Promise<ValidationResult<boolean>>`

Verify a password against a hash.

```typescript
const verifyResult = await passwordService.verify('MyPassword123!', storedHash);
if (verifyResult.success && verifyResult.data) {
  // Password is correct
}
```

#### `validate(password: string): ValidationResult<true>`

Validate a password against the policy.

```typescript
const validation = passwordService.validate('weak');
if (!validation.success) {
  console.error(validation.error.message);
}
```

#### `calculateStrength(password: string): number`

Calculate password strength (0-100).

```typescript
const strength = passwordService.calculateStrength('MyPassword123!');
console.log(`Password strength: ${strength}/100`);
```

## User Service API

### Constructor

```typescript
const userService = createUserService(passwordService: PasswordService);
```

### Methods

#### `createUser(input: CreateUserInput): Promise<ValidationResult<User>>`

Create a new user account.

```typescript
const result = await userService.createUser({
  email: 'user@example.com',
  username: 'johndoe',
  password: 'SecurePass123!',
  profile: {
    firstName: 'John',
    lastName: 'Doe'
  },
  settings: {
    theme: 'dark',
    language: 'en',
    timezone: 'America/New_York'
  }
});
```

#### `updateUser(id: string, input: UpdateUserInput): Promise<ValidationResult<User>>`

Update user information.

```typescript
const result = await userService.updateUser(userId, {
  profile: {
    bio: 'Software developer'
  },
  settings: {
    theme: 'light'
  }
});
```

#### `authenticate(emailOrUsername: string, password: string): Promise<ValidationResult<User>>`

Authenticate a user by email or username.

```typescript
const result = await userService.authenticate('johndoe', 'SecurePass123!');
if (result.success) {
  // User authenticated successfully
}
```

#### `getUser(id: string): ValidationResult<User>`

Get a user by ID.

```typescript
const result = userService.getUser(userId);
if (result.success) {
  console.log(result.data.profile.displayName);
}
```

#### `deleteUser(id: string): ValidationResult<boolean>`

Delete a user account.

```typescript
const result = userService.deleteUser(userId);
```

#### `listUsers(options?: { limit?: number; offset?: number }): User[]`

List users with pagination.

```typescript
const users = userService.listUsers({ limit: 20, offset: 0 });
```

## Auth Service API

### Constructor

```typescript
const authService = createAuthService(userService: UserService, config: AuthConfig);
```

### Configuration

```typescript
{
  jwtSecret: string;              // Required: JWT signing secret
  accessTokenExpiry?: string;     // Default: '15m'
  refreshTokenExpiry?: string;    // Default: '7d'
  maxSessions?: number;           // Default: 5
  sessionTimeout?: number;        // Default: 30 minutes (in ms)
}
```

### Methods

#### `login(emailOrUsername: string, password: string, deviceId: string, metadata?: LoginMetadata): Promise<ValidationResult<AuthTokens>>`

Login a user and create a session.

```typescript
const result = await authService.login(
  'user@example.com',
  'SecurePass123!',
  'device-123',
  {
    userAgent: 'Mozilla/5.0...',
    ipAddress: '192.168.1.1'
  }
);

if (result.success) {
  // result.data.accessToken - JWT access token
  // result.data.refreshToken - JWT refresh token
  // result.data.expiresIn - Expiry in seconds
}
```

#### `refresh(refreshToken: string): Promise<ValidationResult<AuthTokens>>`

Refresh authentication tokens.

```typescript
const result = await authService.refresh(oldRefreshToken);
if (result.success) {
  // New tokens in result.data
}
```

#### `logout(accessToken: string): Promise<ValidationResult<boolean>>`

Logout a user and invalidate tokens.

```typescript
const result = await authService.logout(accessToken);
```

#### `verifyAccessToken(token: string): ValidationResult<TokenPayload>`

Verify and decode an access token.

```typescript
const result = authService.verifyAccessToken(accessToken);
if (result.success) {
  console.log('User ID:', result.data.userId);
}
```

#### `getSessions(userId: string): SessionInfo[]`

Get all active sessions for a user.

```typescript
const sessions = authService.getSessions(userId);
sessions.forEach(session => {
  console.log(`Device: ${session.deviceId}, Last active: ${session.lastAccessedAt}`);
});
```

#### `revokeSession(userId: string, deviceId: string): ValidationResult<boolean>`

Revoke a specific session.

```typescript
const result = authService.revokeSession(userId, 'device-123');
```

## Error Handling

All operations return a `ValidationResult<T>` type:

```typescript
type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

### Error Codes

- `VALIDATION_FAILED` - Input validation error
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Unique constraint violation
- `OPERATION_FAILED` - General operation failure
- `AUTH_FAILED` - Authentication failure
- `PERMISSION_DENIED` - Authorization failure
- `RATE_LIMIT_EXCEEDED` - Too many requests

### Error Handling Example

```typescript
import { isError, ERROR_CODES } from './utils';

const result = await userService.createUser(input);

if (isError(result)) {
  switch (result.error.code) {
    case ERROR_CODES.DUPLICATE_ENTRY:
      console.error('Email or username already exists');
      break;
    case ERROR_CODES.VALIDATION_FAILED:
      console.error('Invalid input:', result.error.message);
      break;
    default:
      console.error('Error:', result.error.message);
  }
} else {
  console.log('User created:', result.data.id);
}
```

## Data Types

### User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  profile: UserProfile;
  settings: UserSettings;
  metadata: UserMetadata;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
}

interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

interface UserMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
  isActive: boolean;
  isVerified: boolean;
}
```

### AuthTokens

```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}
```

### SessionInfo

```typescript
interface SessionInfo {
  userId: string;
  deviceId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}
```

## Performance Features

1. **Password Strength Caching** - Strength calculations are cached
2. **Validator Caching** - Regex validations are cached
3. **Indexed User Storage** - O(1) lookups by ID, email, or username
4. **Session Cleanup** - Automatic cleanup of expired sessions
5. **Token Blacklist Pruning** - Old tokens automatically removed

## Security Features

1. **Bcrypt Hashing** - Industry standard password hashing
2. **JWT Tokens** - Stateless authentication with refresh tokens
3. **Session Management** - Device-based sessions with limits
4. **Token Blacklisting** - Revoked tokens are blocked
5. **Rate Limiting Support** - Built-in rate limiter utility
6. **Input Validation** - Comprehensive validation for all inputs

## Best Practices

1. **Environment Variables**
   ```typescript
   const authService = createAuthService(userService, {
     jwtSecret: process.env.JWT_SECRET!,
     accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m'
   });
   ```

2. **Error Handling**
   ```typescript
   try {
     const result = await userService.createUser(input);
     if (isError(result)) {
       // Handle specific error
       return res.status(400).json({ error: result.error.message });
     }
     // Success
     return res.json({ user: result.data });
   } catch (error) {
     // Handle unexpected errors
     return res.status(500).json({ error: 'Internal server error' });
   }
   ```

3. **Middleware Example**
   ```typescript
   async function authMiddleware(req: Request, res: Response, next: NextFunction) {
     const token = req.headers.authorization?.split(' ')[1];
     
     if (!token) {
       return res.status(401).json({ error: 'No token provided' });
     }
     
     const result = authService.verifyAccessToken(token);
     
     if (isError(result)) {
       return res.status(401).json({ error: 'Invalid token' });
     }
     
     req.user = result.data;
     next();
   }
   ```

4. **Password Policy Selection**
   ```typescript
   // For general applications
   const passwordService = createPasswordService('standard');
   
   // For high-security applications
   const passwordService = createPasswordService('strict');
   
   // For internal tools
   const passwordService = createPasswordService('minimal');
   ```

## Migration Guide

If migrating from an existing authentication system:

1. **Password Migration**
   ```typescript
   // During login, rehash passwords with new system
   const loginResult = await oldSystem.authenticate(email, password);
   if (loginResult.success) {
     // Rehash with new system
     const hashResult = await passwordService.hash(password);
     if (hashResult.success) {
       // Update user with new hash
       await database.updatePasswordHash(userId, hashResult.data);
     }
   }
   ```

2. **Session Migration**
   ```typescript
   // Convert old sessions to new format
   const oldSessions = await oldSystem.getSessions(userId);
   for (const oldSession of oldSessions) {
     // Create new session format
     // Migrate relevant data
   }
   ```

## Testing

Example test cases:

```typescript
describe('AuthenticationSystem', () => {
  let passwordService: PasswordService;
  let userService: UserService;
  let authService: AuthService;
  
  beforeEach(() => {
    passwordService = createPasswordService('standard');
    userService = createUserService(passwordService);
    authService = createAuthService(userService, {
      jwtSecret: 'test-secret'
    });
  });
  
  test('complete authentication flow', async () => {
    // Create user
    const createResult = await userService.createUser({
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPass123!',
      profile: { firstName: 'Test', lastName: 'User' }
    });
    
    expect(createResult.success).toBe(true);
    
    // Login
    const loginResult = await authService.login(
      'test@example.com',
      'TestPass123!',
      'test-device'
    );
    
    expect(loginResult.success).toBe(true);
    expect(loginResult.data.accessToken).toBeDefined();
    
    // Verify token
    const verifyResult = authService.verifyAccessToken(
      loginResult.data.accessToken
    );
    
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.data.email).toBe('test@example.com');
  });
});
```