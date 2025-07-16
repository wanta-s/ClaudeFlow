import { PasswordService } from './passwordService';

describe('PasswordService Performance Tests', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('Hashing performance', () => {
    it('should hash password within acceptable time for standard security', async () => {
      const password = 'TestPassword123!';
      const iterations = 10;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await passwordService.hashPassword(password, 'standard');
      }
      const end = Date.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`Average hash time (standard): ${avgTime}ms`);
      
      // 標準セキュリティレベルでは平均100ms以下を期待
      expect(avgTime).toBeLessThan(100);
    });

    it('should hash password within acceptable time for low security', async () => {
      const password = 'TestPassword123!';
      const iterations = 20;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await passwordService.hashPassword(password, 'low');
      }
      const end = Date.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`Average hash time (low): ${avgTime}ms`);
      
      // 低セキュリティレベルでは平均50ms以下を期待
      expect(avgTime).toBeLessThan(50);
    });

    it('should handle high security level appropriately', async () => {
      const password = 'TestPassword123!';
      const iterations = 5;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await passwordService.hashPassword(password, 'high');
      }
      const end = Date.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`Average hash time (high): ${avgTime}ms`);
      
      // 高セキュリティレベルでは200ms以下を期待
      expect(avgTime).toBeLessThan(200);
    });
  });

  describe('Verification performance', () => {
    it('should verify password quickly', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);
      const iterations = 50;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await passwordService.verifyPassword(password, hash);
      }
      const end = Date.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`Average verify time: ${avgTime}ms`);
      
      // 検証は平均50ms以下を期待
      expect(avgTime).toBeLessThan(50);
    });

    it('should verify invalid passwords quickly', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await passwordService.hashPassword(password);
      const iterations = 50;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await passwordService.verifyPassword(wrongPassword, hash);
      }
      const end = Date.now();
      
      const avgTime = (end - start) / iterations;
      console.log(`Average verify time (invalid): ${avgTime}ms`);
      
      // 無効なパスワードの検証も同程度の時間を期待
      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('Validation performance', () => {
    it('should validate passwords quickly', () => {
      const passwords = [
        'ValidPassword123!',
        'short',
        'no-uppercase-123!',
        'NO-LOWERCASE-123!',
        'NoNumbers!',
        'NoSpecialChars123',
        'a'.repeat(1000),
      ];
      
      const iterations = 1000;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        for (const password of passwords) {
          passwordService.validatePassword(password);
        }
      }
      
      const end = Date.now();
      const totalValidations = iterations * passwords.length;
      const avgTime = (end - start) / totalValidations;
      
      console.log(`Average validation time: ${avgTime}ms`);
      console.log(`Total validations per second: ${1000 / avgTime}`);
      
      // 検証は0.1ms以下を期待
      expect(avgTime).toBeLessThan(0.1);
    });
  });

  describe('Concurrent performance', () => {
    it('should handle high concurrent load', async () => {
      const concurrentOperations = 100;
      const password = 'TestPassword123!';
      
      const start = Date.now();
      const promises = Array.from({ length: concurrentOperations }, () =>
        passwordService.hashPassword(password, 'low')
      );
      
      await Promise.all(promises);
      const end = Date.now();
      
      const totalTime = end - start;
      console.log(`Total time for ${concurrentOperations} concurrent hashes: ${totalTime}ms`);
      console.log(`Average time per operation: ${totalTime / concurrentOperations}ms`);
      
      // 並行処理でも妥当な時間内に完了
      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle mixed operations concurrently', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);
      
      const operations = [
        ...Array.from({ length: 30 }, () => passwordService.hashPassword(password, 'low')),
        ...Array.from({ length: 30 }, () => passwordService.verifyPassword(password, hash)),
        ...Array.from({ length: 40 }, () => Promise.resolve(passwordService.validatePassword(password))),
      ];
      
      const start = Date.now();
      await Promise.all(operations);
      const end = Date.now();
      
      const totalTime = end - start;
      console.log(`Total time for 100 mixed operations: ${totalTime}ms`);
      
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Memory efficiency', () => {
    it('should not leak memory on repeated operations', async () => {
      const password = 'TestPassword123!';
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 多数の操作を実行
      for (let i = 0; i < 100; i++) {
        const hash = await passwordService.hashPassword(password, 'low');
        await passwordService.verifyPassword(password, hash);
        passwordService.validatePassword(password);
      }
      
      // ガベージコレクションを強制
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // メモリ増加が10MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Performance benchmarks', () => {
    it('should generate performance report', async () => {
      const results = {
        validation: { operations: 0, totalTime: 0 },
        hashing: { low: 0, standard: 0, high: 0 },
        verification: { operations: 0, totalTime: 0 },
      };
      
      // Validation benchmark
      const validationStart = Date.now();
      for (let i = 0; i < 10000; i++) {
        passwordService.validatePassword('TestPassword123!');
      }
      results.validation.totalTime = Date.now() - validationStart;
      results.validation.operations = 10000;
      
      // Hashing benchmarks
      const password = 'BenchmarkPassword123!';
      
      // Low security
      const lowStart = Date.now();
      for (let i = 0; i < 10; i++) {
        await passwordService.hashPassword(password, 'low');
      }
      results.hashing.low = (Date.now() - lowStart) / 10;
      
      // Standard security
      const standardStart = Date.now();
      for (let i = 0; i < 5; i++) {
        await passwordService.hashPassword(password, 'standard');
      }
      results.hashing.standard = (Date.now() - standardStart) / 5;
      
      // High security
      const highStart = Date.now();
      for (let i = 0; i < 3; i++) {
        await passwordService.hashPassword(password, 'high');
      }
      results.hashing.high = (Date.now() - highStart) / 3;
      
      // Verification benchmark
      const hash = await passwordService.hashPassword(password);
      const verifyStart = Date.now();
      for (let i = 0; i < 20; i++) {
        await passwordService.verifyPassword(password, hash);
      }
      results.verification.totalTime = Date.now() - verifyStart;
      results.verification.operations = 20;
      
      // Performance report
      console.log('\n=== Performance Benchmark Results ===');
      console.log(`Validation: ${(results.validation.operations / results.validation.totalTime * 1000).toFixed(0)} ops/sec`);
      console.log(`Hashing (low): ${results.hashing.low.toFixed(1)}ms per operation`);
      console.log(`Hashing (standard): ${results.hashing.standard.toFixed(1)}ms per operation`);
      console.log(`Hashing (high): ${results.hashing.high.toFixed(1)}ms per operation`);
      console.log(`Verification: ${(results.verification.totalTime / results.verification.operations).toFixed(1)}ms per operation`);
      console.log('===================================\n');
      
      // Assertions
      expect(results.validation.operations / results.validation.totalTime * 1000).toBeGreaterThan(10000);
      expect(results.hashing.low).toBeLessThan(50);
      expect(results.hashing.standard).toBeLessThan(100);
      expect(results.hashing.high).toBeLessThan(200);
    });
  });
});