/**
 * Dependency Injection Container
 */

/**
 * Service factory function type
 */
type ServiceFactory<T> = (container: Container) => T;

/**
 * Service registration options
 */
interface ServiceOptions {
  singleton?: boolean;
}

/**
 * Service registration entry
 */
interface ServiceEntry {
  factory: ServiceFactory<any>;
  instance?: any;
  options: ServiceOptions;
}

/**
 * Dependency Injection Container
 */
export class Container {
  private services: Map<string, ServiceEntry> = new Map();

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {ServiceFactory<T>} factory - Service factory function
   * @param {ServiceOptions} options - Service options
   */
  register<T>(
    name: string,
    factory: ServiceFactory<T>,
    options: ServiceOptions = { singleton: true }
  ): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    this.services.set(name, {
      factory,
      options,
      instance: undefined
    });
  }

  /**
   * Get a service instance
   * @param {string} name - Service name
   * @returns {T} Service instance
   */
  get<T>(name: string): T {
    const entry = this.services.get(name);
    
    if (!entry) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return singleton instance if exists
    if (entry.options.singleton && entry.instance) {
      return entry.instance;
    }

    // Create new instance
    const instance = entry.factory(this);

    // Store singleton instance
    if (entry.options.singleton) {
      entry.instance = instance;
    }

    return instance;
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} Whether the service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Create a scoped container
   * @returns {Container} Scoped container
   */
  createScope(): Container {
    const scopedContainer = new Container();
    
    // Copy service registrations without instances
    for (const [name, entry] of this.services) {
      scopedContainer.services.set(name, {
        factory: entry.factory,
        options: entry.options,
        instance: undefined
      });
    }

    return scopedContainer;
  }
}

/**
 * Service decorator for automatic registration
 */
export function Service(name: string, options?: ServiceOptions) {
  return function (target: any) {
    // Store metadata for later registration
    Reflect.defineMetadata('service:name', name, target);
    Reflect.defineMetadata('service:options', options || { singleton: true }, target);
  };
}

/**
 * Inject decorator for dependency injection
 */
export function Inject(serviceName: string) {
  return function (target: any, propertyKey: string | symbol, parameterIndex?: number) {
    if (parameterIndex !== undefined) {
      // Constructor parameter injection
      const existingTokens = Reflect.getMetadata('service:inject', target) || [];
      existingTokens[parameterIndex] = serviceName;
      Reflect.defineMetadata('service:inject', existingTokens, target);
    } else {
      // Property injection
      Reflect.defineMetadata('service:inject', serviceName, target, propertyKey);
    }
  };
}

// Global container instance
export const container = new Container();