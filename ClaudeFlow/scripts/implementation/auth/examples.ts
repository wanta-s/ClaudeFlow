// examples.ts - Usage examples for the Login API

import { LoginService } from './loginService';
import { InMemoryRateLimiter } from './rateLimiter';
import { Logger } from './types';

// Example 1: Basic Express.js Integration
import express from 'express';

const app = express();
app.use(express.json());

// Mock implementations for example
const mockUserRepository = {
  async findByUsername(username: string) {
    // In production, query your database
    if (username === 'testuser') {
      return {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'salt:hashedpassword',
        role: 'user',
        isLocked: false,
        loginCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  },
  async update(id: string, data: any) {
    // Update user in database
    console.log('Updating user:', id, data);
  },
};

const mockTokenService = {
  async generate(payload: any) {
    return {
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      type: 'Bearer' as const,
    };
  },
  async verify(token: string) {
    // Verify and decode token
    return { userId: '123', username: 'testuser', role: 'user' };
  },
};

const logger: Logger = {
  debug: (msg, ctx) => console.debug(msg, ctx),
  info: (msg, ctx) => console.info(msg, ctx),
  warn: (msg, ctx) => console.warn(msg, ctx),
  error: (msg, ctx) => console.error(msg, ctx),
};

// Initialize login service
const loginService = new LoginService(
  mockUserRepository,
  mockTokenService,
  new InMemoryRateLimiter(),
  logger
);

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const result = await loginService.login(req.body);

  result.match({
    success: (data) => {
      res.json({
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user,
      });
    },
    failure: (error) => {
      const statusMap: Record<string, number> = {
        AUTH001: 401,
        AUTH002: 403,
        AUTH003: 429,
        AUTH004: 400,
        AUTH500: 500,
      };
      
      res.status(statusMap[error.code] || 500).json({ error });
    },
  });
});

// Example 2: Client-side usage with fetch
async function loginUser(username: string, password: string) {
  try {
    const response = await fetch('https://api.example.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data = await response.json();
    
    // Store token
    localStorage.setItem('authToken', data.token);
    
    // Store user info
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Example 3: React Hook Usage
import { useState } from 'react';

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error.code === 'AUTH003') {
          const retryAfter = data.error.details?.retryAfter || 900;
          throw new Error(`Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`);
        }
        throw new Error(data.error.message);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}

// Example 4: Testing the Login Service
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('LoginService', () => {
  let loginService: LoginService;
  let mockUserRepo: any;
  let mockTokenService: any;
  let mockRateLimiter: any;

  beforeEach(() => {
    mockUserRepo = {
      findByUsername: jest.fn(),
      update: jest.fn(),
    };
    mockTokenService = {
      generate: jest.fn(),
    };
    mockRateLimiter = {
      checkLimit: jest.fn().mockResolvedValue(true),
      increment: jest.fn(),
      reset: jest.fn(),
      getRemainingTime: jest.fn(),
    };

    loginService = new LoginService(
      mockUserRepo,
      mockTokenService,
      mockRateLimiter,
      logger
    );
  });

  it('should successfully login with valid credentials', async () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      passwordHash: await hashPassword.hash('password123'),
      isLocked: false,
    };

    mockUserRepo.findByUsername.mockResolvedValue(mockUser);
    mockTokenService.generate.mockResolvedValue({
      value: 'token123',
      expiresAt: new Date(),
    });

    const result = await loginService.login({
      username: 'testuser',
      password: 'password123',
    });

    expect(result.isSuccess).toBe(true);
    expect(mockRateLimiter.reset).toHaveBeenCalledWith('testuser');
  });

  it('should fail with invalid password', async () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      passwordHash: await hashPassword.hash('correctpassword'),
      isLocked: false,
    };

    mockUserRepo.findByUsername.mockResolvedValue(mockUser);

    const result = await loginService.login({
      username: 'testuser',
      password: 'wrongpassword',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()?.code).toBe('AUTH001');
    expect(mockRateLimiter.increment).toHaveBeenCalledWith('testuser');
  });

  it('should enforce rate limiting', async () => {
    mockRateLimiter.checkLimit.mockResolvedValue(false);
    mockRateLimiter.getRemainingTime.mockResolvedValue(300);

    const result = await loginService.login({
      username: 'testuser',
      password: 'password123',
    });

    expect(result.isFailure).toBe(true);
    expect(result.getError()?.code).toBe('AUTH003');
    expect(result.getError()?.details?.retryAfter).toBe(300);
  });
});

// Example 5: Middleware for Protected Routes
export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  mockTokenService.verify(token).then(payload => {
    if (!payload) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = payload;
    next();
  }).catch(err => {
    res.status(500).json({ error: 'Token verification failed' });
  });
}

// Usage: app.get('/api/protected', authenticateToken, (req, res) => {...})

// Example 6: Axios Interceptor for Automatic Token Handling
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.example.com',
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Example 7: Complete Login Form Component (React)
import React, { useState } from 'react';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const { login, loading, error } = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(username, password);
      // Redirect to dashboard or home page
      window.location.href = '/dashboard';
    } catch (err) {
      // Error is already set by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={50}
          pattern="[a-zA-Z0-9._-]+"
          disabled={loading}
        />
      </div>
      
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={128}
          disabled={loading}
        />
      </div>
      
      <div>
        <label>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={loading}
          />
          Remember me for 30 days
        </label>
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}