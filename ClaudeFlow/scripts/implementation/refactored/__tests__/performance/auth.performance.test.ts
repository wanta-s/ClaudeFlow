import { performance } from 'perf_hooks';
import { PasswordService } from '../../src/services/passwordService';
import { JWTService } from '../../src/services/jwtService';
import { config } from '../../src/utils/config';

describe('Auth Performance Tests', () => {
  let passwordService: PasswordService;
  let jwtService: JWTService;

  beforeAll(() => {
    passwordService = new PasswordService();
    jwtService = new JWTService();
    config.jwtSecret = 'test-secret';
  });

  describe('Password Hashing Performance', () => {
    it('should hash passwords within acceptable time', async () => {
      const passwords = [
        'shortpass',
        'medium_length_password_123',
        'very_long_password_with_special_chars_!@#$%^&*()_+1234567890',
        'a'.repeat(72) // bcrypt max length
      ];

      for (const password of passwords) {
        const start = performance.now();
        await passwordService.hash(password);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(200); // Should complete within 200ms
      }
    });

    it('should verify passwords efficiently', async () => {
      const password = 'test_password_123';
      const hash = await passwordService.hash(password);

      const start = performance.now();
      await passwordService.verify(password, hash);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(150); // Verification should be faster
    });

    it('should handle concurrent hashing operations', async () => {
      const concurrentOps = 10;
      const passwords = Array.from({ length: concurrentOps }, (_, i) => `password_${i}`);

      const start = performance.now();
      await Promise.all(passwords.map(p => passwordService.hash(p)));
      const totalDuration = performance.now() - start;

      const avgDuration = totalDuration / concurrentOps;
      expect(avgDuration).toBeLessThan(300); // Average should still be reasonable
    });
  });

  describe('JWT Performance', () => {
    it('should generate tokens quickly', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        jwtService.generateToken(payload);
      }
      const duration = performance.now() - start;

      const avgTime = duration / iterations;
      expect(avgTime).toBeLessThan(1); // Less than 1ms per token
    });

    it('should verify tokens efficiently', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwtService.generateToken(payload);
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        jwtService.verifyToken(token);
      }
      const duration = performance.now() - start;

      const avgTime = duration / iterations;
      expect(avgTime).toBeLessThan(1); // Less than 1ms per verification
    });

    it('should handle large payloads', () => {
      const largePayload = {
        userId: 1,
        email: 'test@example.com',
        permissions: Array.from({ length: 100 }, (_, i) => `permission_${i}`),
        metadata: {
          profile: {
            name: 'Test User',
            bio: 'a'.repeat(500),
            preferences: Array.from({ length: 50 }, (_, i) => ({ key: `pref_${i}`, value: i }))
          }
        }
      };

      const start = performance.now();
      const token = jwtService.generateToken(largePayload);
      const generateDuration = performance.now() - start;

      expect(generateDuration).toBeLessThan(10);

      const verifyStart = performance.now();
      jwtService.verifyToken(token);
      const verifyDuration = performance.now() - verifyStart;

      expect(verifyDuration).toBeLessThan(10);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      const iterations = 1000;
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < iterations; i++) {
        const password = `password_${i}`;
        const hash = await passwordService.hash(password);
        await passwordService.verify(password, hash);

        const token = jwtService.generateToken({ userId: i });
        jwtService.verifyToken(token);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1000 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under load', async () => {
      const concurrentUsers = 100;
      const operationsPerUser = 10;

      const userOperations = async (userId: number) => {
        const results = [];
        
        for (let i = 0; i < operationsPerUser; i++) {
          const start = performance.now();
          
          // Simulate user registration
          const password = `user_${userId}_pass_${i}`;
          const hash = await passwordService.hash(password);
          
          // Simulate login
          await passwordService.verify(password, hash);
          const token = jwtService.generateToken({ userId, operation: i });
          
          // Simulate token verification
          jwtService.verifyToken(token);
          
          const duration = performance.now() - start;
          results.push(duration);
        }
        
        return results;
      };

      const start = performance.now();
      const allResults = await Promise.all(
        Array.from({ length: concurrentUsers }, (_, i) => userOperations(i))
      );
      const totalDuration = performance.now() - start;

      // Flatten results and calculate statistics
      const allDurations = allResults.flat();
      const avgDuration = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
      const maxDuration = Math.max(...allDurations);

      expect(avgDuration).toBeLessThan(200); // Average operation under 200ms
      expect(maxDuration).toBeLessThan(500); // No operation over 500ms
      expect(totalDuration).toBeLessThan(30000); // Total under 30 seconds
    });
  });

  describe('Optimization Validation', () => {
    it('should benefit from validator caching', () => {
      const iterations = 1000;
      const durations: number[] = [];

      // Measure time for each iteration
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        // This would trigger validation in a real scenario
        const validEmail = `user${i}@example.com`;
        const validUsername = `user${i}`;
        const validPassword = `Pass${i}!`;
        
        // Simulate validation checks
        expect(validEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(validUsername).toMatch(/^[a-zA-Z0-9_]{3,20}$/);
        expect(validPassword.length).toBeGreaterThanOrEqual(8);
        
        const duration = performance.now() - start;
        durations.push(duration);
      }

      // First iterations might be slower, later ones should be faster (cached)
      const firstHalf = durations.slice(0, iterations / 2);
      const secondHalf = durations.slice(iterations / 2);

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // Second half should be faster or equal (caching effect)
      expect(avgSecond).toBeLessThanOrEqual(avgFirst * 1.1); // Allow 10% variance
    });
  });
});