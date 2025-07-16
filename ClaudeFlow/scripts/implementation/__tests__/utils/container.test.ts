import { Container } from '../../src/utils/container';
import { PasswordService } from '../../src/services/passwordService';
import { JwtService } from '../../src/services/jwtService';
import { UserRepository } from '../../src/repositories/userRepository';
import { AuthController } from '../../src/controllers/authController';
import { config } from '../../src/utils/config';
import { User } from '../../src/models/user';

// Mock dependencies
jest.mock('../../src/services/passwordService');
jest.mock('../../src/services/jwtService');
jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/controllers/authController');
jest.mock('../../src/models/user');

describe('DI Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    jest.clearAllMocks();
  });

  describe('Service Registration and Resolution', () => {
    it('should register and resolve a service', () => {
      const testService = { name: 'TestService' };
      container.register('testService', testService);
      
      const resolved = container.resolve<typeof testService>('testService');
      expect(resolved).toBe(testService);
    });

    it('should throw error when resolving unregistered service', () => {
      expect(() => {
        container.resolve('nonExistentService');
      }).toThrow('Service nonExistentService not found in container');
    });

    it('should register and resolve factory functions', () => {
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { id: callCount };
      };
      
      container.register('factoryService', factory);
      
      const instance1 = container.resolve('factoryService');
      const instance2 = container.resolve('factoryService');
      
      expect(instance1).toEqual({ id: 1 });
      expect(instance2).toEqual({ id: 2 });
      expect(callCount).toBe(2);
    });

    it('should allow re-registration of services', () => {
      const service1 = { version: 1 };
      const service2 = { version: 2 };
      
      container.register('service', service1);
      expect(container.resolve('service')).toBe(service1);
      
      container.register('service', service2);
      expect(container.resolve('service')).toBe(service2);
    });
  });

  describe('registerAll', () => {
    it('should register all core services', () => {
      container.registerAll();
      
      // Check that all services can be resolved
      expect(() => container.resolve('config')).not.toThrow();
      expect(() => container.resolve('passwordService')).not.toThrow();
      expect(() => container.resolve('jwtService')).not.toThrow();
      expect(() => container.resolve('userModel')).not.toThrow();
      expect(() => container.resolve('userRepository')).not.toThrow();
      expect(() => container.resolve('authController')).not.toThrow();
    });

    it('should register config as a value', () => {
      container.registerAll();
      const resolvedConfig = container.resolve('config');
      expect(resolvedConfig).toBe(config);
    });

    it('should register services as factory functions', () => {
      container.registerAll();
      
      // Resolve services multiple times to ensure factories work
      const passwordService1 = container.resolve('passwordService');
      const passwordService2 = container.resolve('passwordService');
      
      expect(passwordService1).toBeDefined();
      expect(passwordService2).toBeDefined();
      expect(PasswordService).toHaveBeenCalledTimes(2);
    });

    it('should pass correct dependencies to services', () => {
      container.registerAll();
      
      // Resolve services
      container.resolve('passwordService');
      container.resolve('jwtService');
      container.resolve('userRepository');
      container.resolve('authController');
      
      // Check that constructors were called with correct arguments
      expect(PasswordService).toHaveBeenCalledWith(config);
      expect(JwtService).toHaveBeenCalledWith(config);
      expect(UserRepository).toHaveBeenCalledWith(User);
      expect(AuthController).toHaveBeenCalled();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety when resolving services', () => {
      interface TestService {
        doSomething(): string;
      }
      
      const service: TestService = {
        doSomething: () => 'test'
      };
      
      container.register('typedService', service);
      const resolved = container.resolve<TestService>('typedService');
      
      expect(resolved.doSomething()).toBe('test');
    });
  });

  describe('Complex Dependencies', () => {
    it('should handle nested dependency resolution', () => {
      class ServiceA {
        constructor(public name: string) {}
      }
      
      class ServiceB {
        constructor(public serviceA: ServiceA) {}
      }
      
      class ServiceC {
        constructor(public serviceB: ServiceB) {}
      }
      
      container.register('serviceA', () => new ServiceA('A'));
      container.register('serviceB', () => new ServiceB(container.resolve('serviceA')));
      container.register('serviceC', () => new ServiceC(container.resolve('serviceB')));
      
      const serviceC = container.resolve<ServiceC>('serviceC');
      
      expect(serviceC).toBeInstanceOf(ServiceC);
      expect(serviceC.serviceB).toBeInstanceOf(ServiceB);
      expect(serviceC.serviceB.serviceA).toBeInstanceOf(ServiceA);
      expect(serviceC.serviceB.serviceA.name).toBe('A');
    });

    it('should handle circular dependencies gracefully', () => {
      // This should throw or handle gracefully
      container.register('serviceA', () => ({
        b: container.resolve('serviceB')
      }));
      
      container.register('serviceB', () => ({
        a: container.resolve('serviceA')
      }));
      
      // This will cause infinite recursion if not handled
      expect(() => {
        container.resolve('serviceA');
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      container.register('nullService', null);
      container.register('undefinedService', undefined);
      
      expect(container.resolve('nullService')).toBeNull();
      expect(container.resolve('undefinedService')).toBeUndefined();
    });

    it('should handle empty string keys', () => {
      const service = { empty: true };
      container.register('', service);
      expect(container.resolve('')).toBe(service);
    });

    it('should be case sensitive for service names', () => {
      const service1 = { name: 'lowercase' };
      const service2 = { name: 'uppercase' };
      
      container.register('service', service1);
      container.register('SERVICE', service2);
      
      expect(container.resolve('service')).toBe(service1);
      expect(container.resolve('SERVICE')).toBe(service2);
    });
  });
});