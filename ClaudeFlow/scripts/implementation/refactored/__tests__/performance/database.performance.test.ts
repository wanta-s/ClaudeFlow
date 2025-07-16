import { Sequelize, Op } from 'sequelize';
import { performance } from 'perf_hooks';
import { User } from '../../src/models/user';
import { UserRepository } from '../../src/repositories/userRepository';
import { container } from '../../src/utils/container';

describe('Database Performance Tests', () => {
  let sequelize: Sequelize;
  let userRepository: UserRepository;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });

    container.register('passwordService', {
      hash: jest.fn().mockImplementation((p: string) => Promise.resolve(`hashed_${p}`)),
      verify: jest.fn().mockResolvedValue(true)
    });

    User.init(User.getAttributes(), {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      indexes: [
        { fields: ['email'] },
        { fields: ['username'] },
        { fields: ['createdAt'] }
      ]
    });

    await sequelize.sync({ force: true });
    userRepository = new UserRepository();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      // Seed database with test data
      const users = Array.from({ length: 10000 }, (_, i) => ({
        email: `user${i}@example.com`,
        username: `user${i}`,
        password: `hashed_password${i}`
      }));

      await User.bulkCreate(users, { validate: false });
    });

    afterEach(async () => {
      await User.destroy({ where: {}, truncate: true });
    });

    it('should perform indexed lookups efficiently', async () => {
      const testCases = [
        { field: 'email', value: 'user5000@example.com' },
        { field: 'username', value: 'user7500' },
        { field: 'email', value: 'user9999@example.com' }
      ];

      for (const testCase of testCases) {
        const start = performance.now();
        const user = await User.findOne({
          where: { [testCase.field]: testCase.value }
        });
        const duration = performance.now() - start;

        expect(user).toBeDefined();
        expect(duration).toBeLessThan(10); // Indexed queries should be very fast
      }
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 100;
      const pagesToTest = 10;

      const durations: number[] = [];

      for (let page = 0; page < pagesToTest; page++) {
        const start = performance.now();
        const result = await User.findAndCountAll({
          limit: pageSize,
          offset: page * pageSize,
          order: [['createdAt', 'DESC']]
        });
        const duration = performance.now() - start;

        expect(result.rows.length).toBe(pageSize);
        durations.push(duration);
      }

      // All pages should have similar performance
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDeviation = Math.max(...durations.map(d => Math.abs(d - avgDuration)));
      
      expect(maxDeviation).toBeLessThan(avgDuration * 0.5); // No page 50% slower than average
    });

    it('should optimize complex WHERE conditions', async () => {
      const complexQueries = [
        // OR conditions
        {
          where: {
            [Op.or]: [
              { email: { [Op.like]: '%test%' } },
              { username: { [Op.like]: '%admin%' } }
            ]
          }
        },
        // AND with multiple conditions
        {
          where: {
            [Op.and]: [
              { email: { [Op.endsWith]: '@example.com' } },
              { username: { [Op.startsWith]: 'user' } }
            ]
          }
        },
        // IN clause
        {
          where: {
            username: {
              [Op.in]: Array.from({ length: 100 }, (_, i) => `user${i * 100}`)
            }
          }
        }
      ];

      for (const query of complexQueries) {
        const start = performance.now();
        const users = await User.findAll({
          ...query,
          limit: 100
        });
        const duration = performance.now() - start;

        expect(users.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(100); // Complex queries under 100ms
      }
    });
  });

  describe('Write Performance', () => {
    it('should handle bulk inserts efficiently', async () => {
      const batchSizes = [100, 500, 1000, 5000];
      const results: { size: number; duration: number; opsPerSecond: number }[] = [];

      for (const size of batchSizes) {
        const users = Array.from({ length: size }, (_, i) => ({
          email: `bulk${i}@example.com`,
          username: `bulk${i}`,
          password: `hashed_bulk${i}`
        }));

        const start = performance.now();
        await User.bulkCreate(users, { validate: false });
        const duration = performance.now() - start;

        const opsPerSecond = (size / duration) * 1000;
        results.push({ size, duration, opsPerSecond });

        await User.destroy({ where: { email: { [Op.like]: 'bulk%' } } });
      }

      // Operations per second should scale reasonably
      results.forEach(result => {
        expect(result.opsPerSecond).toBeGreaterThan(100); // At least 100 ops/second
      });
    });

    it('should handle concurrent writes', async () => {
      const concurrentWrites = 50;
      const writeTasks = Array.from({ length: concurrentWrites }, (_, i) => 
        userRepository.create({
          email: `concurrent${i}@example.com`,
          username: `concurrent${i}`,
          password: 'password'
        })
      );

      const start = performance.now();
      const results = await Promise.allSettled(writeTasks);
      const duration = performance.now() - start;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(concurrentWrites);
      expect(duration).toBeLessThan(5000); // 50 concurrent writes under 5 seconds
    });

    it('should optimize update operations', async () => {
      // Create test data
      await User.bulkCreate(
        Array.from({ length: 1000 }, (_, i) => ({
          email: `update${i}@example.com`,
          username: `update${i}`,
          password: 'old_password'
        })),
        { validate: false }
      );

      // Test single updates
      const singleStart = performance.now();
      await User.update(
        { password: 'new_password' },
        { where: { email: 'update500@example.com' } }
      );
      const singleDuration = performance.now() - singleStart;
      expect(singleDuration).toBeLessThan(50);

      // Test bulk updates
      const bulkStart = performance.now();
      const [affectedRows] = await User.update(
        { password: 'bulk_new_password' },
        { where: { email: { [Op.like]: 'update%' } } }
      );
      const bulkDuration = performance.now() - bulkStart;

      expect(affectedRows).toBe(1000);
      expect(bulkDuration).toBeLessThan(1000); // Bulk update 1000 rows under 1 second
    });
  });

  describe('Connection Pool Performance', () => {
    it('should handle connection pool efficiently', async () => {
      const concurrentQueries = 20;
      const queries = Array.from({ length: concurrentQueries }, (_, i) => 
        User.findOne({ where: { email: `user${i}@example.com` } })
      );

      const start = performance.now();
      await Promise.all(queries);
      const duration = performance.now() - start;

      // Should utilize connection pool effectively
      expect(duration).toBeLessThan(1000); // 20 concurrent queries under 1 second
    });

    it('should recover from connection issues', async () => {
      // Simulate connection drop by closing and reopening
      await sequelize.close();

      const start = performance.now();
      try {
        await User.findOne({ where: { email: 'test@example.com' } });
      } catch (error) {
        // Expected to fail
      }

      // Reconnect
      await sequelize.authenticate();
      
      // Should work again
      const user = await User.findOne({ where: { email: 'test@example.com' } });
      const recoveryTime = performance.now() - start;

      expect(recoveryTime).toBeLessThan(5000); // Recovery under 5 seconds
    });
  });

  describe('Memory Efficiency', () => {
    it('should handle large result sets without excessive memory', async () => {
      // Create large dataset
      await User.bulkCreate(
        Array.from({ length: 10000 }, (_, i) => ({
          email: `memory${i}@example.com`,
          username: `memory${i}`,
          password: 'password'
        })),
        { validate: false }
      );

      const initialMemory = process.memoryUsage().heapUsed;

      // Fetch large result set
      const users = await User.findAll({
        where: { email: { [Op.like]: 'memory%' } },
        raw: true // Use raw queries for better memory efficiency
      });

      const peakMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = peakMemory - initialMemory;

      expect(users.length).toBe(10000);
      // Memory increase should be reasonable (less than 100MB for 10k records)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});