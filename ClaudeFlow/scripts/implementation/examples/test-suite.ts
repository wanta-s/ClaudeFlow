import { 
  createPasswordService, 
  createUserService, 
  createAuthService,
  isError,
  ERROR_CODES,
  PasswordService,
  UserService,
  AuthService
} from '../optimized';

// ============================================
// Test Suite Example
// ============================================

describe('Authentication System', () => {
  let passwordService: PasswordService;
  let userService: UserService;
  let authService: AuthService;

  beforeEach(() => {
    passwordService = createPasswordService('standard');
    userService = createUserService(passwordService);
    authService = createAuthService(userService, {
      jwtSecret: 'test-secret-key'
    });
  });

  describe('PasswordService', () => {
    describe('validation', () => {
      test('should validate strong passwords', () => {
        const result = passwordService.validate('StrongPass123!');
        expect(result.success).toBe(true);
      });

      test('should reject weak passwords', () => {
        const result = passwordService.validate('weak');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ERROR_CODES.VALIDATION_FAILED);
      });

      test('should enforce minimum length', () => {
        const result = passwordService.validate('Aa1!');
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('at least 8 characters');
      });

      test('should enforce character requirements', () => {
        const testCases = [
          { password: 'lowercase123!', missing: 'uppercase' },
          { password: 'UPPERCASE123!', missing: 'lowercase' },
          { password: 'NoNumbers!', missing: 'number' },
        ];

        testCases.forEach(({ password, missing }) => {
          const result = passwordService.validate(password);
          expect(result.success).toBe(false);
          expect(result.error?.message).toContain(missing);
        });
      });
    });

    describe('strength calculation', () => {
      test('should calculate password strength correctly', () => {
        const testCases = [
          { password: 'weak', minStrength: 0, maxStrength: 30 },
          { password: 'Password1', minStrength: 30, maxStrength: 60 },
          { password: 'StrongPass123!', minStrength: 60, maxStrength: 90 },
          { password: 'VeryStr0ng!P@ssw0rd#2023', minStrength: 80, maxStrength: 100 },
        ];

        testCases.forEach(({ password, minStrength, maxStrength }) => {
          const strength = passwordService.calculateStrength(password);
          expect(strength).toBeGreaterThanOrEqual(minStrength);
          expect(strength).toBeLessThanOrEqual(maxStrength);
        });
      });

      test('should penalize repeating characters', () => {
        const normal = passwordService.calculateStrength('Abc123!@#');
        const repeating = passwordService.calculateStrength('AAAbbb123!!!');
        expect(repeating).toBeLessThan(normal);
      });
    });

    describe('hashing', () => {
      test('should hash valid passwords', async () => {
        const result = await passwordService.hash('ValidPass123!');
        expect(result.success).toBe(true);
        expect(result.data).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format
      });

      test('should reject invalid passwords when hashing', async () => {
        const result = await passwordService.hash('weak');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ERROR_CODES.VALIDATION_FAILED);
      });

      test('should verify correct passwords', async () => {
        const password = 'CorrectPass123!';
        const hashResult = await passwordService.hash(password);
        expect(hashResult.success).toBe(true);

        const verifyResult = await passwordService.verify(password, hashResult.data!);
        expect(verifyResult.success).toBe(true);
        expect(verifyResult.data).toBe(true);
      });

      test('should reject incorrect passwords', async () => {
        const hashResult = await passwordService.hash('CorrectPass123!');
        expect(hashResult.success).toBe(true);

        const verifyResult = await passwordService.verify('WrongPass123!', hashResult.data!);
        expect(verifyResult.success).toBe(true);
        expect(verifyResult.data).toBe(false);
      });
    });

    describe('policy updates', () => {
      test('should update policy dynamically', () => {
        passwordService.updatePolicy({ minLength: 12 });
        
        const shortResult = passwordService.validate('Short123!');
        expect(shortResult.success).toBe(false);
        
        const longResult = passwordService.validate('LongPassword123!');
        expect(longResult.success).toBe(true);
      });
    });
  });

  describe('UserService', () => {
    describe('user creation', () => {
      test('should create user with valid data', async () => {
        const result = await userService.createUser({
          email: 'test@example.com',
          username: 'testuser',
          password: 'ValidPass123!',
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        });

        expect(result.success).toBe(true);
        expect(result.data?.email).toBe('test@example.com');
        expect(result.data?.profile.displayName).toBe('Test User');
      });

      test('should normalize email addresses', async () => {
        const result = await userService.createUser({
          email: 'TEST@EXAMPLE.COM',
          username: 'testuser2',
          password: 'ValidPass123!',
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        });

        expect(result.success).toBe(true);
        expect(result.data?.email).toBe('test@example.com');
      });

      test('should reject duplicate emails', async () => {
        const userData = {
          email: 'duplicate@example.com',
          username: 'user1',
          password: 'ValidPass123!',
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        };

        const first = await userService.createUser(userData);
        expect(first.success).toBe(true);

        const second = await userService.createUser({
          ...userData,
          username: 'user2'
        });
        expect(second.success).toBe(false);
        expect(second.error?.code).toBe(ERROR_CODES.DUPLICATE_ENTRY);
      });

      test('should reject duplicate usernames', async () => {
        const first = await userService.createUser({
          email: 'user1@example.com',
          username: 'duplicateuser',
          password: 'ValidPass123!',
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        });
        expect(first.success).toBe(true);

        const second = await userService.createUser({
          email: 'user2@example.com',
          username: 'duplicateuser',
          password: 'ValidPass123!',
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        });
        expect(second.success).toBe(false);
        expect(second.error?.code).toBe(ERROR_CODES.DUPLICATE_ENTRY);
      });

      test('should validate username format', async () => {
        const result = await userService.createUser({
          email: 'test@example.com',
          username: 'invalid username!',
          password: 'ValidPass123!',
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Username must be');
      });
    });

    describe('user updates', () => {
      let userId: string;

      beforeEach(async () => {
        const result = await userService.createUser({
          email: 'update@example.com',
          username: 'updateuser',
          password: 'ValidPass123!',
          profile: {
            firstName: 'Update',
            lastName: 'User'
          }
        });
        userId = result.data!.id;
      });

      test('should update user profile', async () => {
        const result = await userService.updateUser(userId, {
          profile: {
            bio: 'Updated bio',
            avatar: 'https://example.com/avatar.jpg'
          }
        });

        expect(result.success).toBe(true);
        expect(result.data?.profile.bio).toBe('Updated bio');
        expect(result.data?.profile.avatar).toBe('https://example.com/avatar.jpg');
      });

      test('should update user settings', async () => {
        const result = await userService.updateUser(userId, {
          settings: {
            theme: 'dark',
            notifications: {
              email: false
            }
          }
        });

        expect(result.success).toBe(true);
        expect(result.data?.settings.theme).toBe('dark');
        expect(result.data?.settings.notifications.email).toBe(false);
      });

      test('should update display name when name changes', async () => {
        const result = await userService.updateUser(userId, {
          profile: {
            firstName: 'New',
            lastName: 'Name'
          }
        });

        expect(result.success).toBe(true);
        expect(result.data?.profile.displayName).toBe('New Name');
      });
    });

    describe('authentication', () => {
      beforeEach(async () => {
        await userService.createUser({
          email: 'auth@example.com',
          username: 'authuser',
          password: 'AuthPass123!',
          profile: {
            firstName: 'Auth',
            lastName: 'User'
          }
        });
      });

      test('should authenticate with email', async () => {
        const result = await userService.authenticate('auth@example.com', 'AuthPass123!');
        expect(result.success).toBe(true);
        expect(result.data?.email).toBe('auth@example.com');
      });

      test('should authenticate with username', async () => {
        const result = await userService.authenticate('authuser', 'AuthPass123!');
        expect(result.success).toBe(true);
        expect(result.data?.username).toBe('authuser');
      });

      test('should reject wrong password', async () => {
        const result = await userService.authenticate('authuser', 'WrongPass123!');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ERROR_CODES.AUTH_FAILED);
      });

      test('should reject non-existent user', async () => {
        const result = await userService.authenticate('nonexistent', 'AnyPass123!');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ERROR_CODES.AUTH_FAILED);
      });

      test('should update login metadata', async () => {
        const beforeAuth = userService.getUser(
          (await userService.authenticate('authuser', 'AuthPass123!')).data!.id
        ).data!;

        const initialLoginCount = beforeAuth.metadata.loginCount;

        await userService.authenticate('authuser', 'AuthPass123!');

        const afterAuth = userService.getUser(beforeAuth.id).data!;
        expect(afterAuth.metadata.loginCount).toBe(initialLoginCount + 1);
        expect(afterAuth.metadata.lastLoginAt).toBeDefined();
      });
    });
  });

  describe('AuthService', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await userService.createUser({
        email: 'jwt@example.com',
        username: 'jwtuser',
        password: 'JWTPass123!',
        profile: {
          firstName: 'JWT',
          lastName: 'User'
        }
      });
      userId = result.data!.id;
    });

    describe('login', () => {
      test('should issue tokens on successful login', async () => {
        const result = await authService.login(
          'jwt@example.com',
          'JWTPass123!',
          'test-device'
        );

        expect(result.success).toBe(true);
        expect(result.data?.accessToken).toBeDefined();
        expect(result.data?.refreshToken).toBeDefined();
        expect(result.data?.expiresIn).toBe(900); // 15 minutes
      });

      test('should create session on login', async () => {
        await authService.login('jwt@example.com', 'JWTPass123!', 'test-device');
        
        const sessions = authService.getSessions(userId);
        expect(sessions).toHaveLength(1);
        expect(sessions[0].deviceId).toBe('test-device');
      });

      test('should enforce session limit', async () => {
        // Create max sessions
        for (let i = 0; i < 5; i++) {
          await authService.login('jwt@example.com', 'JWTPass123!', `device-${i}`);
        }

        let sessions = authService.getSessions(userId);
        expect(sessions).toHaveLength(5);

        // One more should remove the oldest
        await authService.login('jwt@example.com', 'JWTPass123!', 'device-new');
        
        sessions = authService.getSessions(userId);
        expect(sessions).toHaveLength(5);
        expect(sessions.find(s => s.deviceId === 'device-0')).toBeUndefined();
        expect(sessions.find(s => s.deviceId === 'device-new')).toBeDefined();
      });
    });

    describe('token verification', () => {
      let accessToken: string;

      beforeEach(async () => {
        const result = await authService.login(
          'jwt@example.com',
          'JWTPass123!',
          'test-device'
        );
        accessToken = result.data!.accessToken;
      });

      test('should verify valid access token', () => {
        const result = authService.verifyAccessToken(accessToken);
        expect(result.success).toBe(true);
        expect(result.data?.userId).toBe(userId);
        expect(result.data?.type).toBe('access');
      });

      test('should reject invalid token', () => {
        const result = authService.verifyAccessToken('invalid.token.here');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ERROR_CODES.AUTH_FAILED);
      });

      test('should reject refresh token as access token', async () => {
        const loginResult = await authService.login(
          'jwt@example.com',
          'JWTPass123!',
          'test-device-2'
        );
        
        const result = authService.verifyAccessToken(loginResult.data!.refreshToken);
        expect(result.success).toBe(false);
      });
    });

    describe('token refresh', () => {
      let refreshToken: string;

      beforeEach(async () => {
        const result = await authService.login(
          'jwt@example.com',
          'JWTPass123!',
          'test-device'
        );
        refreshToken = result.data!.refreshToken;
      });

      test('should refresh tokens with valid refresh token', async () => {
        const result = await authService.refresh(refreshToken);
        expect(result.success).toBe(true);
        expect(result.data?.accessToken).toBeDefined();
        expect(result.data?.refreshToken).toBeDefined();
      });

      test('should blacklist old refresh token', async () => {
        await authService.refresh(refreshToken);
        
        // Try to use old token again
        const result = await authService.refresh(refreshToken);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ERROR_CODES.AUTH_FAILED);
      });
    });

    describe('logout', () => {
      let accessToken: string;

      beforeEach(async () => {
        const result = await authService.login(
          'jwt@example.com',
          'JWTPass123!',
          'test-device'
        );
        accessToken = result.data!.accessToken;
      });

      test('should invalidate token on logout', async () => {
        const logoutResult = await authService.logout(accessToken);
        expect(logoutResult.success).toBe(true);

        const verifyResult = authService.verifyAccessToken(accessToken);
        expect(verifyResult.success).toBe(false);
      });

      test('should remove sessions on logout', async () => {
        await authService.logout(accessToken);
        
        const sessions = authService.getSessions(userId);
        expect(sessions).toHaveLength(0);
      });
    });

    describe('session management', () => {
      test('should revoke specific session', async () => {
        await authService.login('jwt@example.com', 'JWTPass123!', 'device-1');
        await authService.login('jwt@example.com', 'JWTPass123!', 'device-2');

        let sessions = authService.getSessions(userId);
        expect(sessions).toHaveLength(2);

        const result = authService.revokeSession(userId, 'device-1');
        expect(result.success).toBe(true);

        sessions = authService.getSessions(userId);
        expect(sessions).toHaveLength(1);
        expect(sessions[0].deviceId).toBe('device-2');
      });
    });
  });

  describe('Integration', () => {
    test('complete user lifecycle', async () => {
      // 1. Create user
      const createResult = await userService.createUser({
        email: 'lifecycle@example.com',
        username: 'lifecycleuser',
        password: 'LifecyclePass123!',
        profile: {
          firstName: 'Life',
          lastName: 'Cycle'
        }
      });
      expect(createResult.success).toBe(true);

      const userId = createResult.data!.id;

      // 2. Login
      const loginResult = await authService.login(
        'lifecycle@example.com',
        'LifecyclePass123!',
        'test-device'
      );
      expect(loginResult.success).toBe(true);

      // 3. Use access token
      const verifyResult = authService.verifyAccessToken(loginResult.data!.accessToken);
      expect(verifyResult.success).toBe(true);

      // 4. Update profile
      const updateResult = await userService.updateUser(userId, {
        profile: { bio: 'Testing lifecycle' }
      });
      expect(updateResult.success).toBe(true);

      // 5. Refresh tokens
      const refreshResult = await authService.refresh(loginResult.data!.refreshToken);
      expect(refreshResult.success).toBe(true);

      // 6. Logout
      const logoutResult = await authService.logout(refreshResult.data!.accessToken);
      expect(logoutResult.success).toBe(true);

      // 7. Delete user
      const deleteResult = userService.deleteUser(userId);
      expect(deleteResult.success).toBe(true);

      // 8. Verify user is gone
      const getResult = userService.getUser(userId);
      expect(getResult.success).toBe(false);
      expect(getResult.error?.code).toBe(ERROR_CODES.NOT_FOUND);
    });
  });
});

// Performance tests
describe('Performance', () => {
  let passwordService: PasswordService;
  let userService: UserService;

  beforeEach(() => {
    passwordService = createPasswordService('standard');
    userService = createUserService(passwordService);
  });

  test('password strength calculation should be cached', () => {
    const password = 'TestPassword123!';
    
    const start1 = performance.now();
    const strength1 = passwordService.calculateStrength(password);
    const time1 = performance.now() - start1;

    const start2 = performance.now();
    const strength2 = passwordService.calculateStrength(password);
    const time2 = performance.now() - start2;

    expect(strength1).toBe(strength2);
    expect(time2).toBeLessThan(time1 * 0.1); // Cached should be much faster
  });

  test('user lookup should be O(1)', async () => {
    const userIds: string[] = [];

    // Create many users
    for (let i = 0; i < 100; i++) {
      const result = await userService.createUser({
        email: `perf${i}@example.com`,
        username: `perfuser${i}`,
        password: 'PerfPass123!',
        profile: {
          firstName: 'Perf',
          lastName: `User${i}`
        }
      });
      if (result.success) {
        userIds.push(result.data.id);
      }
    }

    // Time lookups
    const times: number[] = [];
    for (const id of userIds.slice(0, 10)) {
      const start = performance.now();
      userService.getUser(id);
      times.push(performance.now() - start);
    }

    // All lookups should be roughly the same time (O(1))
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const variance = times.map(t => Math.abs(t - avgTime)).reduce((a, b) => a + b) / times.length;
    
    expect(variance).toBeLessThan(avgTime * 0.5); // Low variance indicates O(1)
  });
});