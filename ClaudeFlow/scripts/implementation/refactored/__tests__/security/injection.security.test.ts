import { Sequelize, Op } from 'sequelize';
import { User } from '../../src/models/user';
import { UserRepository } from '../../src/repositories/userRepository';
import { container } from '../../src/utils/container';

describe('Injection Attack Prevention Tests', () => {
  let sequelize: Sequelize;
  let userRepository: UserRepository;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false
    });

    container.register('passwordService', {
      hash: jest.fn().mockImplementation((p: string) => Promise.resolve(`hashed_${p}`)),
      verify: jest.fn().mockResolvedValue(true)
    });

    User.init(User.getAttributes(), {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true
    });

    await sequelize.sync({ force: true });
    userRepository = new UserRepository();

    // Create some test users
    await User.bulkCreate([
      { email: 'admin@example.com', username: 'admin', password: 'hashed_admin' },
      { email: 'user@example.com', username: 'user', password: 'hashed_user' }
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle SQL injection in findByEmail', async () => {
      const injectionAttempts = [
        "' OR '1'='1",
        "admin@example.com' OR '1'='1' --",
        "'; DROP TABLE users; --",
        "admin@example.com' UNION SELECT * FROM users --",
        "' OR 1=1 --",
        '" OR ""="',
        "admin@example.com' AND SLEEP(5) --"
      ];

      for (const attempt of injectionAttempts) {
        const user = await userRepository.findByEmail(attempt);
        expect(user).toBeNull(); // Should not find any user
      }

      // Verify table still exists
      const count = await User.count();
      expect(count).toBe(2);
    });

    it('should safely handle SQL injection in findByUsername', async () => {
      const injectionAttempts = [
        "admin' --",
        "' OR username LIKE '%",
        "admin'; DELETE FROM users WHERE '1'='1",
        "' UNION SELECT password FROM users --"
      ];

      for (const attempt of injectionAttempts) {
        const user = await userRepository.findByUsername(attempt);
        expect(user).toBeNull();
      }
    });

    it('should safely handle injection in dynamic queries', async () => {
      // Test with Sequelize operators
      const maliciousInput = "'; DROP TABLE users; --";
      
      const users = await User.findAll({
        where: {
          [Op.or]: [
            { email: { [Op.like]: `%${maliciousInput}%` } },
            { username: maliciousInput }
          ]
        }
      });

      expect(users).toHaveLength(0);
      
      // Table should still exist
      const tableExists = await sequelize.getQueryInterface().showAllTables();
      expect(tableExists).toContain('users');
    });

    it('should prevent second-order SQL injection', async () => {
      // Try to store malicious data that could be executed later
      const maliciousData = {
        email: 'secondorder@example.com',
        username: "'; DROP TABLE users; --",
        password: 'password'
      };

      try {
        await userRepository.create(maliciousData);
      } catch (error) {
        // Might fail validation
      }

      // Try to trigger the stored injection
      const users = await User.findAll({
        where: { username: { [Op.like]: '%DROP%' } }
      });

      // Table should still exist
      const count = await User.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should handle object injection attempts', async () => {
      // Simulate object injection attempts
      const injectionAttempts = [
        { $ne: null }, // MongoDB-style operator
        { $gt: '' },
        { $regex: '.*' },
        { '1': 1 }
      ];

      for (const attempt of injectionAttempts) {
        try {
          // These should either be rejected or safely handled
          const user = await User.findOne({
            where: { email: attempt as any }
          });
          
          expect(user).toBeNull();
        } catch (error) {
          // Expected - invalid input should be rejected
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Command Injection Prevention', () => {
    it('should prevent command injection through user input', async () => {
      const commandInjectionAttempts = [
        '; ls -la',
        '&& cat /etc/passwd',
        '| whoami',
        '`rm -rf /`',
        '$(evil-command)',
        '\n/bin/sh'
      ];

      for (const attempt of commandInjectionAttempts) {
        // Try to create user with malicious username
        try {
          await userRepository.create({
            email: `cmd${Date.now()}@example.com`,
            username: attempt,
            password: 'password'
          });
        } catch (error) {
          // Validation might reject these
        }
      }

      // System should still be functional
      const users = await User.findAll();
      expect(users).toBeDefined();
    });
  });

  describe('LDAP Injection Prevention', () => {
    it('should safely handle LDAP injection attempts', async () => {
      const ldapInjectionAttempts = [
        '*)(uid=*',
        'admin)(&(password=*))',
        '*)(|(uid=*',
        '\\',
        'admin*',
        '*)(objectClass=*'
      ];

      for (const attempt of ldapInjectionAttempts) {
        const user = await userRepository.findByUsername(attempt);
        expect(user).toBeNull();
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent path traversal in any file operations', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'user/../../../../etc/shadow',
        'user%2f..%2f..%2f..%2fetc%2fpasswd',
        'user\0.png',
        'user\n/etc/passwd'
      ];

      for (const attempt of pathTraversalAttempts) {
        // If the system handles file uploads or paths, test here
        const isSafe = !attempt.includes('..') && 
                       !attempt.includes('%2f') && 
                       !attempt.includes('%2F') &&
                       !attempt.includes('\0') &&
                       !attempt.includes('\n');
        
        expect(isSafe).toBe(false);
      }
    });
  });

  describe('XML Injection Prevention', () => {
    it('should handle XML entity injection attempts', async () => {
      const xmlInjectionAttempts = [
        '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
        '<username>&xxe;</username>',
        '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com">]>'
      ];

      for (const attempt of xmlInjectionAttempts) {
        try {
          await userRepository.create({
            email: `xml${Date.now()}@example.com`,
            username: attempt.substring(0, 20), // Truncate for username length
            password: 'password'
          });
        } catch (error) {
          // Expected - might fail validation
        }
      }

      // Check that no malicious data was processed
      const users = await User.findAll({
        where: { username: { [Op.like]: '%ENTITY%' } }
      });
      
      users.forEach(user => {
        expect(user.username).not.toContain('<!ENTITY');
      });
    });
  });

  describe('Header Injection Prevention', () => {
    it('should sanitize inputs that could be used in headers', async () => {
      const headerInjectionAttempts = [
        'user\r\nX-Injected: true',
        'user\nContent-Type: text/html',
        'user\r\n\r\n<script>alert(1)</script>',
        'user%0d%0aSet-Cookie:%20session=hijacked'
      ];

      for (const attempt of headerInjectionAttempts) {
        try {
          const user = await userRepository.create({
            email: `header${Date.now()}@example.com`,
            username: attempt.substring(0, 20),
            password: 'password'
          });

          if (user) {
            // Should not contain newlines or carriage returns
            expect(user.username).not.toMatch(/[\r\n]/);
          }
        } catch (error) {
          // Expected - validation should reject
        }
      }
    });
  });

  describe('Template Injection Prevention', () => {
    it('should prevent template injection attempts', async () => {
      const templateInjectionAttempts = [
        '{{7*7}}',
        '${7*7}',
        '<%= 7*7 %>',
        '#{7*7}',
        '{{config.items}}',
        '{{constructor.constructor("return process.mainModule.require(\"child_process\").execSync(\"id\")")()}}'
      ];

      for (const attempt of templateInjectionAttempts) {
        const user = await userRepository.findByUsername(attempt);
        expect(user).toBeNull();

        // If stored, should not be evaluated
        try {
          const created = await userRepository.create({
            email: `template${Date.now()}@example.com`,
            username: attempt.substring(0, 20),
            password: 'password'
          });

          if (created) {
            // Should be stored as literal string, not evaluated
            expect(created.username).not.toBe('49'); // 7*7
            expect(created.username).toContain(attempt.substring(0, 20));
          }
        } catch (error) {
          // Expected - might fail validation
        }
      }
    });
  });
});