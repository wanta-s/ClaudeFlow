import request from 'supertest';
import { Sequelize } from 'sequelize';
import { app } from '../../src/app';
import { User } from '../../src/models/user';
import { sequelize } from '../../src/utils/database';
import { JwtService } from '../../src/services/jwtService';
import { config } from '../../src/utils/config';

describe('Auth API Integration Tests', () => {
  let testSequelize: Sequelize;
  let jwtService: JwtService;

  beforeAll(async () => {
    // Use test database
    testSequelize = new Sequelize('sqlite::memory:', { logging: false });
    
    // Initialize models
    User.initModel(testSequelize);
    
    // Sync database
    await testSequelize.sync({ force: true });
    
    // Initialize JWT service
    jwtService = new JwtService(config);
  });

  afterAll(async () => {
    await testSequelize.close();
  });

  beforeEach(async () => {
    // Clear all users before each test
    await User.destroy({ where: {}, truncate: true });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toMatchObject({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      });
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.headers['set-cookie']).toBeDefined();
      
      // Verify user was created in database
      const user = await User.findOne({ where: { email: 'test@example.com' } });
      expect(user).toBeTruthy();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('valid email');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('at least 8 characters');
    });

    it('should return 409 for duplicate email', async () => {
      // Create first user
      await User.create({
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Existing',
        lastName: 'User'
      });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password456!',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should return 401 for inactive user', async () => {
      // Create inactive user
      await User.create({
        email: 'inactive@example.com',
        password: 'Password123!',
        firstName: 'Inactive',
        lastName: 'User',
        isActive: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Account is disabled');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let user: User;
    let validRefreshToken: string;

    beforeEach(async () => {
      // Create test user
      user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      });

      // Generate valid refresh token
      validRefreshToken = jwtService.generateRefreshToken({
        userId: user.id,
        tokenVersion: user.tokenVersion
      });
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid refresh token');
    });

    it('should return 401 for expired refresh token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        config.jwt.secret,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: expiredToken
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('expired');
    });

    it('should return 401 for mismatched token version', async () => {
      // Increment user's token version
      await user.incrementTokenVersion();

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid refresh token');
    });
  });

  describe('Protected Routes', () => {
    let user: User;
    let accessToken: string;

    beforeEach(async () => {
      // Create test user
      user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      });

      // Generate access token
      accessToken = jwtService.generateAccessToken({
        userId: user.id,
        email: user.email
      });
    });

    describe('GET /api/auth/profile', () => {
      it('should get user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          id: user.id,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        });
        expect(response.body).not.toHaveProperty('password');
      });

      it('should return 401 without token', async () => {
        const response = await request(app)
          .get('/api/auth/profile');

        expect(response.status).toBe(401);
        expect(response.body.error.message).toContain('No token provided');
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer invalid.token');

        expect(response.status).toBe(401);
        expect(response.body.error.message).toContain('Invalid access token');
      });

      it('should return 401 with expired token', async () => {
        const expiredToken = jwt.sign(
          { userId: user.id, email: user.email },
          config.jwt.secret,
          { expiresIn: '-1h' }
        );

        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
        expect(response.body.error.message).toContain('expired');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Logged out successfully');
        
        // Verify token version was incremented
        const updatedUser = await User.findByPk(user.id);
        expect(updatedUser!.tokenVersion).toBe(1);
        
        // Verify refresh token cookie was cleared
        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies[0]).toContain('refreshToken=;');
        expect(cookies[0]).toContain('Max-Age=0');
      });

      it('should return 401 without token', async () => {
        const response = await request(app)
          .post('/api/auth/logout');

        expect(response.status).toBe(401);
        expect(response.body.error.message).toContain('No token provided');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Make multiple rapid requests
      const requests = Array(101).fill(null).map(() => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong'
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });
});