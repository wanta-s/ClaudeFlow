import request from 'supertest';
import { Sequelize } from 'sequelize';
import { createApp } from '../../src/app';
import { User } from '../../src/models/user';
import { container } from '../../src/utils/container';
import { PasswordService } from '../../src/services/passwordService';
import { JWTService } from '../../src/services/jwtService';
import { UserRepository } from '../../src/repositories/userRepository';
import { AuthController } from '../../src/controllers/authController';
import { config } from '../../src/utils/config';

describe('Auth E2E Tests', () => {
  let app: any;
  let sequelize: Sequelize;
  let testUsers: any[] = [];

  beforeAll(async () => {
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

    container.register('passwordService', new PasswordService());
    container.register('jwtService', new JWTService());
    container.register('userRepository', new UserRepository());
    container.register('authController', new AuthController());

    app = createApp();
  });

  afterEach(async () => {
    await User.destroy({ where: {}, truncate: true, force: true });
    testUsers = [];
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Complete User Journey', () => {
    it('should support full user lifecycle', async () => {
      const userData = {
        email: 'journey@example.com',
        username: 'journeyuser',
        password: 'Journey123!'
      };

      // Step 1: User Registration
      console.log('Step 1: Registering new user...');
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerRes.body).toMatchObject({
        user: {
          email: userData.email,
          username: userData.username
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String)
      });

      const { accessToken, refreshToken } = registerRes.body;

      // Step 2: Access Protected Resource
      console.log('Step 2: Accessing protected resource...');
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body.email).toBe(userData.email);

      // Step 3: Logout (invalidate token)
      console.log('Step 3: Logging out...');
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 4: Try to access with old token (should fail)
      console.log('Step 4: Verifying logout...');
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      // Step 5: Login again
      console.log('Step 5: Logging in again...');
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const newAccessToken = loginRes.body.accessToken;

      // Step 6: Refresh token
      console.log('Step 6: Refreshing token...');
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.accessToken).not.toBe(newAccessToken);

      // Step 7: Update profile
      console.log('Step 7: Updating profile...');
      const updateRes = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
        .send({ username: 'updateduser' })
        .expect(200);

      expect(updateRes.body.username).toBe('updateduser');

      // Step 8: Delete account
      console.log('Step 8: Deleting account...');
      await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
        .expect(200);

      // Step 9: Verify account is deleted
      console.log('Step 9: Verifying deletion...');
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(401);
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle multiple users interacting', async () => {
      // Create multiple users
      const users = [
        { email: 'user1@example.com', username: 'user1', password: 'User1Pass!' },
        { email: 'user2@example.com', username: 'user2', password: 'User2Pass!' },
        { email: 'user3@example.com', username: 'user3', password: 'User3Pass!' }
      ];

      const tokens: Record<string, string> = {};

      // Register all users
      for (const user of users) {
        const res = await request(app)
          .post('/api/auth/register')
          .send(user)
          .expect(201);

        tokens[user.email] = res.body.accessToken;
      }

      // All users access their profiles concurrently
      const profileRequests = users.map(user =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tokens[user.email]}`)
      );

      const profiles = await Promise.all(profileRequests);

      profiles.forEach((res, index) => {
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(users[index].email);
      });

      // Users try to access each other's resources (should fail)
      const unauthorizedRes = await request(app)
        .get('/api/users/user2')
        .set('Authorization', `Bearer ${tokens['user1@example.com']}`)
        .expect(403);
    });
  });

  describe('Real-World Error Scenarios', () => {
    it('should handle network interruptions gracefully', async () => {
      const userData = {
        email: 'network@example.com',
        username: 'networkuser',
        password: 'Network123!'
      };

      // Start registration
      const registerPromise = request(app)
        .post('/api/auth/register')
        .send(userData);

      // Simulate another registration attempt (duplicate)
      const duplicatePromise = request(app)
        .post('/api/auth/register')
        .send(userData);

      const results = await Promise.allSettled([registerPromise, duplicatePromise]);
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter(r => r.status === 'fulfilled' && r.value.status === 409);

      expect(successful.length).toBe(1);
      expect(failed.length).toBe(1);
    });

    it('should recover from database connection issues', async () => {
      const userData = {
        email: 'recovery@example.com',
        username: 'recoveryuser',
        password: 'Recovery123!'
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Simulate database connection drop
      await sequelize.close();

      // Try to login (should fail)
      const failedLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password });

      expect(failedLogin.status).toBe(500);

      // Reconnect database
      await sequelize.authenticate();

      // Login should work now
      const successfulLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(successfulLogin.body.accessToken).toBeDefined();
    });
  });

  describe('Mobile App Scenarios', () => {
    it('should handle mobile app authentication flow', async () => {
      const deviceId = 'mobile-device-123';
      const userData = {
        email: 'mobile@example.com',
        username: 'mobileuser',
        password: 'Mobile123!'
      };

      // Register from mobile device
      const registerRes = await request(app)
        .post('/api/auth/register')
        .set('X-Device-ID', deviceId)
        .set('User-Agent', 'MobileApp/1.0 (iOS 14.0)')
        .send(userData)
        .expect(201);

      const { refreshToken } = registerRes.body;

      // Store refresh token on device (simulated)
      const storedRefreshToken = refreshToken;

      // App closed and reopened - use refresh token
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('X-Device-ID', deviceId)
        .send({ refreshToken: storedRefreshToken })
        .expect(200);

      expect(refreshRes.body.accessToken).toBeDefined();

      // Background refresh (app in background)
      await new Promise(resolve => setTimeout(resolve, 100));

      const backgroundRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('X-Device-ID', deviceId)
        .send({ refreshToken: storedRefreshToken })
        .expect(200);

      expect(backgroundRefresh.body.accessToken).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should handle multiple device sessions', async () => {
      const userData = {
        email: 'multidevice@example.com',
        username: 'multidevice',
        password: 'MultiDevice123!'
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Login from multiple devices
      const devices = ['desktop', 'mobile', 'tablet'];
      const sessions: Record<string, any> = {};

      for (const device of devices) {
        const loginRes = await request(app)
          .post('/api/auth/login')
          .set('X-Device-ID', device)
          .send({ email: userData.email, password: userData.password })
          .expect(200);

        sessions[device] = {
          accessToken: loginRes.body.accessToken,
          refreshToken: loginRes.body.refreshToken
        };
      }

      // All sessions should be valid
      for (const device of devices) {
        const meRes = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${sessions[device].accessToken}`)
          .expect(200);

        expect(meRes.body.email).toBe(userData.email);
      }

      // Logout from one device
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${sessions.mobile.accessToken}`)
        .expect(200);

      // Other sessions should still work
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessions.desktop.accessToken}`)
        .expect(200);

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessions.tablet.accessToken}`)
        .expect(200);

      // Mobile session should be invalid
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessions.mobile.accessToken}`)
        .expect(401);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent user registrations', async () => {
      const concurrentUsers = 50;
      const registrationPromises = Array.from({ length: concurrentUsers }, (_, i) => 
        request(app)
          .post('/api/auth/register')
          .send({
            email: `load${i}@example.com`,
            username: `load${i}`,
            password: 'LoadTest123!'
          })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(registrationPromises);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      
      expect(successful.length).toBe(concurrentUsers);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all users were created
      const userCount = await User.count();
      expect(userCount).toBe(concurrentUsers);
    });

    it('should maintain performance during sustained load', async () => {
      const testDuration = 5000; // 5 seconds
      const startTime = Date.now();
      let requestCount = 0;
      let successCount = 0;
      let errorCount = 0;

      // Create a base user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sustained@example.com',
          username: 'sustained',
          password: 'Sustained123!'
        });

      while (Date.now() - startTime < testDuration) {
        requestCount++;
        
        try {
          const res = await request(app)
            .post('/api/auth/login')
            .send({
              email: 'sustained@example.com',
              password: 'Sustained123!'
            });

          if (res.status === 200) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      const successRate = (successCount / requestCount) * 100;
      
      console.log(`Sustained load test results:
        Total requests: ${requestCount}
        Successful: ${successCount}
        Failed: ${errorCount}
        Success rate: ${successRate.toFixed(2)}%`);

      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
    });
  });
});