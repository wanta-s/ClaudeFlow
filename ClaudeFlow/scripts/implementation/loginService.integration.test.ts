import express from 'express';
import supertest from 'supertest';
import { LoginService, IUserRepository, ITokenService, User, IRateLimiter } from './loginService';
import { PasswordService } from './passwordService';
import { InMemoryRateLimiter } from './rateLimiter';

// Mock implementations
class MockUserRepository implements IUserRepository {
  private users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return this.users.get(email) || null;
  }

  addUser(user: User): void {
    this.users.set(user.email, user);
  }

  clear(): void {
    this.users.clear();
  }
}

class MockTokenService implements ITokenService {
  private tokenCount = 0;

  async generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    this.tokenCount++;
    return {
      accessToken: `access_${user.id}_${this.tokenCount}`,
      refreshToken: `refresh_${user.id}_${this.tokenCount}`
    };
  }
}

// Create Express app with login endpoint
function createApp(loginService: LoginService): express.Application {
  const app = express();
  app.use(express.json());

  app.post('/api/auth/login', async (req, res) => {
    try {
      const result = await loginService.login(req.body);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          ...result.data
        });
      } else {
        const statusCode = result.error.code === 'VAL_001' ? 400 :
                          result.error.code === 'AUTH_001' ? 401 :
                          result.error.code === 'RATE_001' ? 429 : 500;
        
        res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'サーバーエラーが発生しました'
        }
      });
    }
  });

  return app;
}

// Test helper
const createTestUser = async (email: string, password: string, passwordService: PasswordService): Promise<User> => ({
  id: `user_${email}`,
  email,
  name: 'Test User',
  passwordHash: await passwordService.hash(password),
  createdAt: new Date()
});

describe('Login API Integration Tests', () => {
  let app: express.Application;
  let userRepo: MockUserRepository;
  let passwordService: PasswordService;
  let tokenService: MockTokenService;
  let rateLimiter: IRateLimiter;
  let loginService: LoginService;

  beforeEach(() => {
    userRepo = new MockUserRepository();
    passwordService = new PasswordService();
    tokenService = new MockTokenService();
    rateLimiter = new InMemoryRateLimiter(5, 15);
    loginService = new LoginService(userRepo, passwordService, tokenService, rateLimiter);
    app = createApp(loginService);
  });

  describe('Successful Login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = await createTestUser('test@example.com', 'testPassword123', passwordService);
      userRepo.addUser(user);

      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toMatch(/^access_/);
      expect(response.body.refreshToken).toMatch(/^refresh_/);
      expect(response.body.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString()
      });
    });

    it('should generate different tokens for multiple logins', async () => {
      const user = await createTestUser('test@example.com', 'testPassword123', passwordService);
      userRepo.addUser(user);

      const response1 = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      const response2 = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      expect(response1.body.token).not.toBe(response2.body.token);
      expect(response1.body.refreshToken).not.toBe(response2.body.refreshToken);
    });

    it('should handle special characters in email', async () => {
      const email = 'test+tag@sub.example.com';
      const user = await createTestUser(email, 'testPassword123', passwordService);
      userRepo.addUser(user);

      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email,
          password: 'testPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Authentication Failures', () => {
    it('should reject invalid password', async () => {
      const user = await createTestUser('test@example.com', 'correctPassword', passwordService);
      userRepo.addUser(user);

      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_001');
    });

    it('should reject non-existent user', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'anyPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_001');
      expect(response.body.error.message).toBe('メールアドレスまたはパスワードが正しくありません');
    });
  });

  describe('Validation Errors', () => {
    it('should reject empty email', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: 'validPassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VAL_001');
      expect(response.body.error.details).toContainEqual({
        field: 'email',
        message: 'メールアドレスは必須です'
      });
    });

    it('should reject empty password', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VAL_001');
      expect(response.body.error.details).toContainEqual({
        field: 'password',
        message: 'パスワードは必須です'
      });
    });

    it('should reject invalid email format', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'validPassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toContainEqual({
        field: 'email',
        message: '有効なメールアドレスを入力してください'
      });
    });

    it('should reject password shorter than minimum', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: '1234567'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toContainEqual({
        field: 'password',
        message: 'パスワードは8文字以上必要です'
      });
    });

    it('should reject password longer than maximum', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'a'.repeat(129)
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toContainEqual({
        field: 'password',
        message: 'パスワードは128文字以内で入力してください'
      });
    });

    it('should return multiple validation errors', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toHaveLength(2);
    });
  });

  describe('Rate Limiting', () => {
    it('should block after too many failed attempts', async () => {
      const email = 'ratelimit@example.com';

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await supertest(app)
          .post('/api/auth/login')
          .send({ email, password: 'wrongPassword' });
      }

      // 6th attempt should be blocked
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({ email, password: 'anyPassword' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_001');
      expect(response.body.error.message).toContain('ログイン試行回数の上限に達しました');
    });

    it('should reset rate limit on successful login', async () => {
      const email = 'reset@example.com';
      const user = await createTestUser(email, 'correctPassword', passwordService);
      userRepo.addUser(user);

      // Make 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await supertest(app)
          .post('/api/auth/login')
          .send({ email, password: 'wrongPassword' });
      }

      // Successful login
      const successResponse = await supertest(app)
        .post('/api/auth/login')
        .send({ email, password: 'correctPassword' });

      expect(successResponse.status).toBe(200);

      // Should be able to fail 5 more times
      for (let i = 0; i < 5; i++) {
        await supertest(app)
          .post('/api/auth/login')
          .send({ email, password: 'wrongPassword' });
      }

      // Next attempt should be blocked
      const blockedResponse = await supertest(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrongPassword' });

      expect(blockedResponse.status).toBe(429);
    });
  });

  describe('Content Type Handling', () => {
    it('should handle JSON content type', async () => {
      const user = await createTestUser('test@example.com', 'testPassword123', passwordService);
      userRepo.addUser(user);

      const response = await supertest(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      expect(response.status).toBe(200);
    });

    it('should reject non-JSON body', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('email=test@example.com&password=test');

      expect(response.status).toBe(400);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent login requests', async () => {
      const user = await createTestUser('concurrent@example.com', 'testPassword123', passwordService);
      userRepo.addUser(user);

      const promises = Array(10).fill(null).map(() =>
        supertest(app)
          .post('/api/auth/login')
          .send({
            email: 'concurrent@example.com',
            password: 'testPassword123'
          })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // All tokens should be unique
      const tokens = responses.map(r => r.body.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(10);
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('統合テストの実行にはJestが必要です。以下のコマンドを実行してください:');
  console.log('npm test loginService.integration.test.ts');
}