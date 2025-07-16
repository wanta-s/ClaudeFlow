# Login API Documentation

## Overview
Secure, optimized login API with rate limiting, comprehensive validation, and type-safe error handling.

## API Endpoint

### POST /api/auth/login

Authenticates a user and returns an authentication token.

#### Request

```typescript
interface LoginRequest {
  username: string;  // 3-50 characters, alphanumeric + ._-
  password: string;  // 8-128 characters
  remember?: boolean; // Optional, extends token expiry
}
```

#### Headers
```
Content-Type: application/json
```

#### Response

##### Success (200 OK)
```typescript
interface LoginResponse {
  token: string;        // JWT token
  expiresAt: Date;      // Token expiration timestamp
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}
```

##### Error Responses

###### 400 Bad Request - Validation Error
```json
{
  "error": {
    "code": "AUTH004",
    "message": "Validation failed",
    "details": [
      {
        "field": "username",
        "message": "Username must be at least 3 characters",
        "code": "TOO_SHORT"
      }
    ]
  }
}
```

###### 401 Unauthorized - Invalid Credentials
```json
{
  "error": {
    "code": "AUTH001",
    "message": "Invalid username or password"
  }
}
```

###### 403 Forbidden - Account Locked
```json
{
  "error": {
    "code": "AUTH002",
    "message": "Account is locked. Please contact support."
  }
}
```

###### 429 Too Many Requests - Rate Limited
```json
{
  "error": {
    "code": "AUTH003",
    "message": "Too many login attempts. Please try again later.",
    "details": {
      "retryAfter": 900  // seconds until retry allowed
    }
  }
}
```

###### 500 Internal Server Error
```json
{
  "error": {
    "code": "AUTH500",
    "message": "An unexpected error occurred"
  }
}
```

## Security Features

### Rate Limiting
- **Max Attempts**: 5 per minute
- **Lockout Duration**: 15 minutes after max attempts
- **Window**: 60 seconds sliding window
- **Reset**: Successful login resets the counter

### Password Security
- **Hashing**: scrypt with random salt
- **Min Length**: 8 characters
- **Max Length**: 128 characters
- **No password in logs or error messages**

### Token Security
- **Type**: JWT with HS256 signing
- **Expiry**: 24 hours (default), 30 days with remember=true
- **Payload**: User ID, username, role, expiration
- **Storage**: Client-side only (no server-side sessions)

## Validation Rules

### Username
- **Required**: Yes
- **Type**: String
- **Length**: 3-50 characters
- **Pattern**: Alphanumeric, dots, underscores, hyphens
- **Case**: Case-insensitive for authentication

### Password
- **Required**: Yes
- **Type**: String
- **Length**: 8-128 characters
- **No pattern restrictions** (allow any characters)

## Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| AUTH001 | Invalid credentials | 401 |
| AUTH002 | Account locked | 403 |
| AUTH003 | Rate limit exceeded | 429 |
| AUTH004 | Validation failed | 400 |
| AUTH500 | Internal server error | 500 |

## Performance Considerations

1. **Database Queries**: Single indexed query on username
2. **Password Verification**: Async scrypt hashing (~100ms)
3. **Rate Limiting**: In-memory cache with O(1) lookups
4. **Response Time**: Target < 200ms for typical requests

## Integration Notes

### CORS
```
Access-Control-Allow-Origin: https://yourapp.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Content Security Policy
```
Content-Security-Policy: default-src 'self'
```

### Rate Limit Headers
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1609459200
```

## Monitoring & Logging

### Success Metrics
- Login success rate
- Average response time
- Token generation time

### Security Metrics
- Failed login attempts
- Rate limit triggers
- Account lockouts
- Unusual login patterns

### Log Events
- Failed login attempts (without passwords)
- Successful logins
- Rate limit violations
- Account lockouts
- System errors