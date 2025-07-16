# Improved Authentication Implementation

A production-ready authentication service with improved error handling, dependency injection, and security features.

## Features

- **Improved Architecture**
  - Dependency Injection Container
  - Configuration Management
  - Custom Error Classes
  - Structured Logging

- **Enhanced Security**
  - Input Validation Middleware
  - Rate Limiting
  - Helmet.js Security Headers
  - CORS Configuration
  - Environment-based Secrets

- **Better Error Handling**
  - Global Error Handler
  - Operational vs Programming Errors
  - Detailed Error Responses
  - Request Logging

## Installation

```bash
npm install
cp .env.example .env
```

## Configuration

Edit `.env` file with your configuration:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=sqlite://./database.sqlite
JWT_SECRET=your-secret-key
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run typecheck
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token

### Health Check

- `GET /health` - Application health status

## Project Structure

```
src/
├── config/           # Configuration management
├── container/        # DI container setup
├── errors/          # Custom error classes
├── middleware/      # Express middlewares
├── models/          # Database models
├── repositories/    # Data access layer
├── routes/          # API routes
├── services/        # Business logic
└── utils/           # Utilities
```

## Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Authentication failed
- `AUTHORIZATION_ERROR` - Access denied
- `NOT_FOUND` - Resource not found
- `CONFLICT_ERROR` - Resource already exists
- `RATE_LIMIT_ERROR` - Too many requests
- `DATABASE_ERROR` - Database operation failed

## Security Best Practices

1. **Environment Variables**: Never commit `.env` file
2. **JWT Secret**: Use strong, random secret in production
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Adjust limits based on your needs
5. **Input Validation**: All inputs are validated
6. **Error Messages**: Production errors don't leak sensitive info

## License

MIT