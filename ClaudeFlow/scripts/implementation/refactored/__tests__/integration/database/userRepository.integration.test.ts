import { Sequelize } from 'sequelize';
import { User } from '../../../src/models/user';
import { UserRepository } from '../../../src/repositories/userRepository';
import { container } from '../../../src/utils/container';
import { IPasswordService } from '../../../src/services/passwordService';

describe('UserRepository Integration Tests', () => {
  let sequelize: Sequelize;
  let userRepository: UserRepository;
  let passwordService: IPasswordService;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false
    });

    passwordService = {
      hash: jest.fn().mockImplementation((password: string) => Promise.resolve(`hashed_${password}`)),
      verify: jest.fn().mockImplementation((password: string, hash: string) => Promise.resolve(hash === `hashed_${password}`))
    };

    container.register('passwordService', passwordService);

    User.init(User.getAttributes(), {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true
    });

    await sequelize.sync({ force: true });
    userRepository = new UserRepository();
  });

  afterEach(async () => {
    await User.destroy({ where: {}, truncate: true, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Complex Queries', () => {
    beforeEach(async () => {
      const users = [
        { email: 'user1@example.com', username: 'user1', password: 'password1' },
        { email: 'user2@example.com', username: 'user2', password: 'password2' },
        { email: 'admin@example.com', username: 'admin', password: 'adminpass' },
        { email: 'test@test.com', username: 'testuser', password: 'testpass' }
      ];

      for (const userData of users) {
        await userRepository.create(userData);
      }
    });

    it('should find users with pagination', async () => {
      const page1 = await User.findAndCountAll({
        limit: 2,
        offset: 0,
        order: [['createdAt', 'ASC']]
      });

      expect(page1.count).toBe(4);
      expect(page1.rows.length).toBe(2);
      expect(page1.rows[0].email).toBe('user1@example.com');

      const page2 = await User.findAndCountAll({
        limit: 2,
        offset: 2,
        order: [['createdAt', 'ASC']]
      });

      expect(page2.rows.length).toBe(2);
      expect(page2.rows[0].email).toBe('admin@example.com');
    });

    it('should perform bulk operations', async () => {
      const bulkUsers = Array.from({ length: 100 }, (_, i) => ({
        email: `bulk${i}@example.com`,
        username: `bulk${i}`,
        password: 'bulkpass'
      }));

      const startTime = Date.now();
      await User.bulkCreate(bulkUsers);
      const duration = Date.now() - startTime;

      const count = await User.count();
      expect(count).toBe(104); // 4 initial + 100 bulk
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent writes', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        userRepository.create({
          email: `concurrent${i}@example.com`,
          username: `concurrent${i}`,
          password: 'concurrentpass'
        })
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(10);
      
      const count = await User.count();
      expect(count).toBe(14); // 4 initial + 10 concurrent
    });
  });

  describe('Transaction Support', () => {
    it('should rollback on error', async () => {
      const t = await sequelize.transaction();

      try {
        await userRepository.create({
          email: 'transaction@example.com',
          username: 'transaction',
          password: 'transpass'
        }, { transaction: t });

        // Force an error
        await userRepository.create({
          email: 'transaction@example.com', // Duplicate email
          username: 'transaction2',
          password: 'transpass2'
        }, { transaction: t });

        await t.commit();
      } catch (error) {
        await t.rollback();
      }

      const user = await User.findOne({ where: { email: 'transaction@example.com' } });
      expect(user).toBeNull();
    });

    it('should commit successful transactions', async () => {
      const t = await sequelize.transaction();

      try {
        const user1 = await userRepository.create({
          email: 'trans1@example.com',
          username: 'trans1',
          password: 'pass1'
        }, { transaction: t });

        const user2 = await userRepository.create({
          email: 'trans2@example.com',
          username: 'trans2',
          password: 'pass2'
        }, { transaction: t });

        await t.commit();

        const count = await User.count();
        expect(count).toBe(2);
      } catch (error) {
        await t.rollback();
        throw error;
      }
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique email constraint', async () => {
      await userRepository.create({
        email: 'unique@example.com',
        username: 'unique1',
        password: 'password'
      });

      await expect(userRepository.create({
        email: 'unique@example.com',
        username: 'unique2',
        password: 'password'
      })).rejects.toThrow();
    });

    it('should enforce unique username constraint', async () => {
      await userRepository.create({
        email: 'test1@example.com',
        username: 'uniqueuser',
        password: 'password'
      });

      await expect(userRepository.create({
        email: 'test2@example.com',
        username: 'uniqueuser',
        password: 'password'
      })).rejects.toThrow();
    });

    it('should enforce not null constraints', async () => {
      await expect(User.create({
        email: 'test@example.com',
        // username missing
        password: 'password'
      } as any)).rejects.toThrow();
    });
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      // Create 1000 users for performance testing
      const users = Array.from({ length: 1000 }, (_, i) => ({
        email: `perf${i}@example.com`,
        username: `perfuser${i}`,
        password: 'password'
      }));

      await User.bulkCreate(users);
    });

    it('should efficiently query with indexes', async () => {
      const startTime = Date.now();
      const user = await userRepository.findByEmail('perf500@example.com');
      const duration = Date.now() - startTime;

      expect(user).toBeDefined();
      expect(duration).toBeLessThan(50); // Should be fast with index
    });

    it('should efficiently handle complex WHERE conditions', async () => {
      const startTime = Date.now();
      const users = await User.findAll({
        where: {
          email: {
            [Sequelize.Op.like]: '%perf1%'
          }
        },
        limit: 10
      });
      const duration = Date.now() - startTime;

      expect(users.length).toBe(10);
      expect(duration).toBeLessThan(100);
    });
  });
});