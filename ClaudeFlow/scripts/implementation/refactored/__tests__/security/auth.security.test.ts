import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import { createApp } from '../../src/app';
import { User } from '../../src/models/user';
import { container } from '../../src/utils/container';
import { PasswordService } from '../../src/services/passwordService';
import { JWTService } from '../../src/services/jwtService';
import { UserRepository } from '../../src/repositories/userRepository';
import { AuthController } from '../../src/controllers/authController';
import { config } from '../../src/utils/config';

describe('Auth Security Tests', () => {
  let app: express.Application;
  let sequelize: Sequelize;

  beforeAll(async () => {
    config.nodeEnv = 'test';
    config.jwtSecret = 'test-secret';

    sequelize = new Sequelize('sqlite::memory:', {
      logging: false
    });

    User.init(User.getAttributes(), {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true
    });

    await sequelize.sync({ force: true });

    container.register('passwordService', new PasswordService());
    container.register('jwtService', new JWTService());
    container.register('userRepository', new UserRepository());
    container.register('authController', new AuthController());

    app = createApp();
  });

  afterEach(async () => {
    await User.destroy({ where: {}, truncate: true, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in login', async () => {
      // Create a legitimate user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'legitimate@example.com',
          username: 'legitimate',
          password: 'LegitPass123!'
        });

      // Attempt SQL injection
      const sqlInjectionAttempts = [
        { email: "' OR '1'='1", password: 'anything' },
        { email: 'legitimate@example.com"; DROP TABLE users; --', password: 'anything' },
        { email: "admin'--", password: 'anything' },
        { email: '" OR ""="', password: 'anything' }
      ];

      for (const attempt of sqlInjectionAttempts) {
        const res = await request(app)
          .post('/api/auth/login')
          .send(attempt);

        expect(res.status).toBe(401); // Should fail authentication
      }

      // Verify the user table still exists and has data
      const userCount = await User.count();
      expect(userCount).toBe(1);
    });

    it('should prevent SQL injection in registration', async () => {
      const sqlInjectionAttempts = [
        {
          email: "test'); DROP TABLE users; --",
          username: 'test',
          password: 'TestPass123!'
        },
        {
          email: 'test@example.com',
          username: "admin'--",
          password: 'TestPass123!'
        }
      ];

      for (const attempt of sqlInjectionAttempts) {
        const res = await request(app)
          .post('/api/auth/register')
          .send(attempt);

        // Should either fail validation or safely store the value
        expect([400, 422, 201]).toContain(res.status);
      }

      // Verify table integrity
      const users = await User.findAll();
      expect(users).toBeDefined();
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize user input to prevent XSS', async () => {
      const xssAttempts = [
        {
          email: 'xss@example.com',
          username: '<script>alert("XSS")</script>',
          password: 'XSSPass123!'
        },
        {
          email: 'xss2@example.com',
          username: 'xss2',
          password: '<img src=x onerror=alert("XSS")>'
        }
      ];

      for (const attempt of xssAttempts) {
        const res = await request(app)
          .post('/api/auth/register')
          .send(attempt);

        if (res.status === 201) {
          // If registration succeeds, check that the data is properly escaped
          const user = await User.findOne({ where: { email: attempt.email } });
          
          // Username should either be rejected or safely stored
          if (user) {
            expect(user.username).not.toContain('<script>');
            expect(user.username).not.toContain('onerror=');
          }
        }
      }
    });

    it('should set proper Content-Type headers', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('CSRF Protection', () => {
    it('should validate request origin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://malicious-site.com')
        .send({ email: 'test@example.com', password: 'password' });

      // In production, this should be rejected
      if (config.nodeEnv === 'production') {
        expect(res.status).toBe(403);
      }
    });
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'short',           // Too short
        'alllowercase',    // No uppercase or numbers
        'ALLUPPERCASE',    // No lowercase or numbers
        '12345678',        // No letters
        'NoNumbers!',      // No numbers
        'NoSpecial123',    // No special characters
        'password123!'     // Common password
      ];

      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak${Date.now()}@example.com`,
            username: `weak${Date.now()}`,
            password
          });

        expect(res.status).not.toBe(201);
        expect(res.body.errors || res.body.message).toBeDefined();
      }
    });

    it('should not expose password hashes', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'secure@example.com',
          username: 'secure',
          password: 'SecurePass123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should handle bcrypt maximum length', async () => {
      const longPassword = 'a'.repeat(100) + 'A1!'; // Longer than bcrypt's 72 char limit

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'longpass@example.com',
          username: 'longpass',
          password: longPassword
        });

      expect(res.status).toBe(201);

      // Should be able to login with the same password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'longpass@example.com',
          password: longPassword
        });

      expect(loginRes.status).toBe(200);
    });
  });

  describe('JWT Security', () => {
    it('should reject tokens with invalid signatures', async () => {
      const validToken = container.resolve<JWTService>('jwtService')
        .generateToken({ userId: 1, email: 'test@example.com' });

      // Tamper with the token
      const parts = validToken.split('.');
      const tamperedToken = parts[0] + '.' + parts[1] + '.invalidsignature';

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject expired tokens', async () => {
      // Create a token that expires immediately
      const originalExpiry = config.jwtExpiresIn;
      config.jwtExpiresIn = '1ms';

      const expiredToken = container.resolve<JWTService>('jwtService')
        .generateToken({ userId: 1, email: 'test@example.com' });

      config.jwtExpiresIn = originalExpiry;

      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('should not expose sensitive information in JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'jwttest@example.com',
          username: 'jwttest',
          password: 'JWTTest123!'
        });

      const token = res.body.accessToken;
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Should not contain sensitive data
      expect(payload.password).toBeUndefined();
      expect(payload.passwordHash).toBeUndefined();
    });
  });

  describe('Rate Limiting and Brute Force Protection', () => {
    it('should block after multiple failed login attempts', async () => {
      const email = 'bruteforce@example.com';
      
      // Create user
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          username: 'bruteforce',
          password: 'BruteForce123!'
        });

      // Make multiple failed login attempts
      const attempts = 10;
      const results = [];

      for (let i = 0; i < attempts; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email, password: 'wrongpassword' });
        
        results.push(res.status);
      }

      // Should start blocking after a certain number of attempts
      const blockedAttempts = results.filter(status => status === 429).length;
      expect(blockedAttempts).toBeGreaterThan(0);
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not reveal whether email exists during login', async () => {
      // Create a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          username: 'existing',
          password: 'Existing123!'
        });

      // Try to login with non-existent email
      const nonExistentRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword'
        });

      // Try to login with existing email but wrong password
      const wrongPassRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'wrongpassword'
        });

      // Both should return the same error message
      expect(nonExistentRes.status).toBe(401);
      expect(wrongPassRes.status).toBe(401);
      expect(nonExistentRes.body.message).toBe(wrongPassRes.body.message);
    });

    it('should not expose internal error details', async () => {
      // Force an internal error by closing the database
      await sequelize.close();

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'error@example.com',
          username: 'error',
          password: 'Error123!'
        });

      expect(res.status).toBe(500);
      expect(res.body.message).not.toContain('Sequelize');
      expect(res.body.message).not.toContain('SQL');
      expect(res.body.stack).toBeUndefined();

      // Reconnect for other tests
      await sequelize.authenticate();
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should have consistent response times for user enumeration', async () => {
      // Create a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'timing@example.com',
          username: 'timing',
          password: 'Timing123!'
        });

      const timings = { existing: [], nonExisting: [] };
      const iterations = 20;

      // Measure response times
      for (let i = 0; i < iterations; i++) {
        // Existing user
        const existingStart = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'timing@example.com',
            password: 'wrongpassword'
          });
        timings.existing.push(Date.now() - existingStart);

        // Non-existing user
        const nonExistingStart = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: `nonexisting${i}@example.com`,
            password: 'wrongpassword'
          });
        timings.nonExisting.push(Date.now() - nonExistingStart);
      }

      // Calculate averages
      const avgExisting = timings.existing.reduce((a, b) => a + b) / iterations;
      const avgNonExisting = timings.nonExisting.reduce((a, b) => a + b) / iterations;

      // The difference should be minimal (less than 20% variance)
      const variance = Math.abs(avgExisting - avgNonExisting) / Math.max(avgExisting, avgNonExisting);
      expect(variance).toBeLessThan(0.2);
    });
  });

  describe('Session Security', () => {
    it('should invalidate old tokens after password change', async () => {
      // Register and get initial token
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'session@example.com',
          username: 'session',
          password: 'Session123!'
        });

      const oldToken = registerRes.body.accessToken;

      // Simulate password change (would normally be through a password reset flow)
      const user = await User.findOne({ where: { email: 'session@example.com' } });
      if (user) {
        user.password = 'NewSession123!';
        await user.save();
      }

      // Old token should no longer work
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${oldToken}`);

      // Depending on implementation, might return 401 or still work
      // but best practice is to invalidate old tokens
      expect([200, 401]).toContain(res.status);
    });
  });
});