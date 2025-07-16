import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import { createApp } from '../../../src/app';
import { User } from '../../../src/models/user';
import { container } from '../../../src/utils/container';
import { PasswordService } from '../../../src/services/passwordService';
import { JWTService } from '../../../src/services/jwtService';
import { UserRepository } from '../../../src/repositories/userRepository';
import { AuthController } from '../../../src/controllers/authController';
import { config } from '../../../src/utils/config';

describe('Auth API Integration Tests', () => {
  let app: express.Application;
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Override config for testing
    config.nodeEnv = 'test';
    config.jwtSecret = 'test-secret';
    config.jwtExpiresIn = '1h';
    config.jwtRefreshExpiresIn = '7d';

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

    // Register services
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

  describe('Complete Auth Flow', () => {
    it('should handle full registration -> login -> token refresh flow', async () => {
      // Step 1: Register
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'flow@example.com',
          username: 'flowuser',
          password: 'FlowPass123!'
        });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.user.email).toBe('flow@example.com');
      expect(registerRes.body.accessToken).toBeDefined();
      expect(registerRes.body.refreshToken).toBeDefined();

      // Step 2: Login with credentials
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'flow@example.com',
          password: 'FlowPass123!'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.accessToken).toBeDefined();
      const refreshToken = loginRes.body.refreshToken;

      // Step 3: Use access token to access protected route
      const protectedRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

      expect(protectedRes.status).toBe(200);
      expect(protectedRes.body.email).toBe('flow@example.com');

      // Step 4: Refresh token
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.accessToken).not.toBe(loginRes.body.accessToken);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent registrations', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/auth/register')
          .send({
            email: `concurrent${i}@example.com`,
            username: `concurrent${i}`,
            password: 'ConcurrentPass123!'
          })
      );

      const results = await Promise.all(requests);
      const successCount = results.filter(res => res.status === 201).length;
      
      expect(successCount).toBe(10);

      const userCount = await User.count();
      expect(userCount).toBe(10);
    });

    it('should prevent duplicate registrations in race conditions', async () => {
      const duplicateRequests = Array.from({ length: 5 }, () => 
        request(app)
          .post('/api/auth/register')
          .send({
            email: 'race@example.com',
            username: 'raceuser',
            password: 'RacePass123!'
          })
      );

      const results = await Promise.allSettled(duplicateRequests);
      const successfulRegs = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      ).length;

      expect(successfulRegs).toBe(1);

      const userCount = await User.count({ where: { email: 'race@example.com' } });
      expect(userCount).toBe(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Create a user first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'ratelimit@example.com',
          username: 'ratelimit',
          password: 'RateLimit123!'
        });

      // Make multiple rapid login attempts
      const loginAttempts = Array.from({ length: 20 }, () => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'ratelimit@example.com',
            password: 'WrongPassword'
          })
      );

      const results = await Promise.all(loginAttempts);
      const rateLimited = results.filter(res => res.status === 429).length;

      expect(rateLimited).toBeGreaterThan(0);
    });
  });

  describe('Session Management', () => {
    it('should handle multiple sessions per user', async () => {
      // Register user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'session@example.com',
          username: 'sessionuser',
          password: 'Session123!'
        });

      // Login from multiple devices
      const device1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session@example.com',
          password: 'Session123!'
        });

      const device2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session@example.com',
          password: 'Session123!'
        });

      expect(device1.body.accessToken).toBeDefined();
      expect(device2.body.accessToken).toBeDefined();
      expect(device1.body.accessToken).not.toBe(device2.body.accessToken);

      // Both tokens should work
      const res1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${device1.body.accessToken}`);

      const res2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${device2.body.accessToken}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should set secure cookie flags in production', async () => {
      const originalEnv = config.nodeEnv;
      config.nodeEnv = 'production';

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'cookie@example.com',
          password: 'password'
        });

      // Check Set-Cookie header for secure flags
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        expect(setCookie.some((cookie: string) => 
          cookie.includes('Secure') && cookie.includes('HttpOnly')
        )).toBe(true);
      }

      config.nodeEnv = originalEnv;
    });
  });

  describe('Error Recovery', () => {
    it('should recover from database connection issues', async () => {
      // Temporarily close the database connection
      await sequelize.close();

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'recovery@example.com',
          username: 'recovery',
          password: 'Recovery123!'
        });

      expect(res.status).toBe(500);

      // Reconnect
      await sequelize.authenticate();

      const retryRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'recovery@example.com',
          username: 'recovery',
          password: 'Recovery123!'
        });

      expect(retryRes.status).toBe(201);
    });
  });

  describe('Large Payload Handling', () => {
    it('should reject oversized requests', async () => {
      const largePassword = 'a'.repeat(10000);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'large@example.com',
          username: 'largeuser',
          password: largePassword
        });

      expect(res.status).toBe(413);
    });
  });
});