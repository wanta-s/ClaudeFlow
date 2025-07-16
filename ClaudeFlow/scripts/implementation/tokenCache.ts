import { TokenCache, UserPayload } from './authMiddleware.improved';
import * as crypto from 'crypto';

/**
 * In-memory token cache implementation
 */
export class InMemoryTokenCache implements TokenCache {
  private cache = new Map<string, { payload: UserPayload; expiry: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs: number = 60000) {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  async get(token: string): Promise<UserPayload | null> {
    const key = this.hashToken(token);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.payload;
  }

  async set(token: string, payload: UserPayload, ttl: number = 3600): Promise<void> {
    const key = this.hashToken(token);
    this.cache.set(key, {
      payload,
      expiry: Date.now() + (ttl * 1000)
    });
  }

  async invalidate(token: string): Promise<void> {
    const key = this.hashToken(token);
    this.cache.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Hash token for security
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Destroy the cache and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * Redis token cache implementation
 */
export class RedisTokenCache implements TokenCache {
  constructor(private redisClient: any) {}

  async get(token: string): Promise<UserPayload | null> {
    const key = this.getKey(token);
    const data = await this.redisClient.get(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async set(token: string, payload: UserPayload, ttl: number = 3600): Promise<void> {
    const key = this.getKey(token);
    await this.redisClient.setex(key, ttl, JSON.stringify(payload));
  }

  async invalidate(token: string): Promise<void> {
    const key = this.getKey(token);
    await this.redisClient.del(key);
  }

  private getKey(token: string): string {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return `auth:token:${hash}`;
  }
}

/**
 * LRU (Least Recently Used) token cache implementation
 */
export class LRUTokenCache implements TokenCache {
  private cache = new Map<string, { payload: UserPayload; expiry: number }>();
  private accessOrder: string[] = [];
  
  constructor(private maxSize: number = 1000) {}

  async get(token: string): Promise<UserPayload | null> {
    const key = this.hashToken(token);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (entry.expiry < Date.now()) {
      this.remove(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.updateAccessOrder(key);
    
    return entry.payload;
  }

  async set(token: string, payload: UserPayload, ttl: number = 3600): Promise<void> {
    const key = this.hashToken(token);
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    
    this.cache.set(key, {
      payload,
      expiry: Date.now() + (ttl * 1000)
    });
    
    this.updateAccessOrder(key);
  }

  async invalidate(token: string): Promise<void> {
    const key = this.hashToken(token);
    this.remove(key);
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private remove(key: string): void {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}