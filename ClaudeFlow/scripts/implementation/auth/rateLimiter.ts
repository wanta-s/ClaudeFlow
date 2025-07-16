// rateLimiter.ts - Rate limiting implementation
import { RateLimitConfig, RateLimitEntry } from './types';

export interface RateLimiter {
  checkLimit(key: string, config: RateLimitConfig): Promise<boolean>;
  increment(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  getRemainingTime(key: string): Promise<number>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timer;

  constructor(cleanupIntervalMs: number = 60000) {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async checkLimit(key: string, config: RateLimitConfig): Promise<boolean> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return true;
    }

    const now = new Date();

    // Check if locked
    if (entry.lockedUntil && entry.lockedUntil > now) {
      return false;
    }

    // Check if window expired
    const windowExpired = now.getTime() - entry.firstAttemptAt.getTime() > config.windowMs;
    if (windowExpired) {
      this.store.delete(key);
      return true;
    }

    // Check attempts
    return entry.attempts < config.maxAttempts;
  }

  async increment(key: string): Promise<void> {
    const now = new Date();
    const entry = this.store.get(key);

    if (!entry) {
      this.store.set(key, {
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      });
      return;
    }

    entry.attempts++;
    entry.lastAttemptAt = now;

    // Lock if max attempts reached
    if (entry.attempts >= 5) {
      entry.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    }

    this.store.set(key, entry);
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getRemainingTime(key: string): Promise<number> {
    const entry = this.store.get(key);
    
    if (!entry || !entry.lockedUntil) {
      return 0;
    }

    const now = new Date();
    const remaining = entry.lockedUntil.getTime() - now.getTime();
    
    return Math.max(0, Math.ceil(remaining / 1000)); // Return seconds
  }

  private cleanup(): void {
    const now = new Date();
    
    for (const [key, entry] of this.store.entries()) {
      const windowExpired = now.getTime() - entry.firstAttemptAt.getTime() > 3600000; // 1 hour
      const lockExpired = entry.lockedUntil && entry.lockedUntil < now;
      
      if (windowExpired || (lockExpired && entry.attempts < 5)) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Redis-based implementation for production use
export class RedisRateLimiter implements RateLimiter {
  constructor(private redisClient: any) {} // Use actual Redis client type

  async checkLimit(key: string, config: RateLimitConfig): Promise<boolean> {
    const fullKey = `rate_limit:${key}`;
    const data = await this.redisClient.get(fullKey);
    
    if (!data) {
      return true;
    }

    const entry: RateLimitEntry = JSON.parse(data);
    const now = new Date();

    if (entry.lockedUntil && new Date(entry.lockedUntil) > now) {
      return false;
    }

    return entry.attempts < config.maxAttempts;
  }

  async increment(key: string): Promise<void> {
    const fullKey = `rate_limit:${key}`;
    const now = new Date();
    
    const data = await this.redisClient.get(fullKey);
    let entry: RateLimitEntry;

    if (!data) {
      entry = {
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      };
    } else {
      entry = JSON.parse(data);
      entry.attempts++;
      entry.lastAttemptAt = now;
      
      if (entry.attempts >= 5) {
        entry.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
      }
    }

    await this.redisClient.setex(
      fullKey,
      3600, // 1 hour TTL
      JSON.stringify(entry)
    );
  }

  async reset(key: string): Promise<void> {
    const fullKey = `rate_limit:${key}`;
    await this.redisClient.del(fullKey);
  }

  async getRemainingTime(key: string): Promise<number> {
    const fullKey = `rate_limit:${key}`;
    const data = await this.redisClient.get(fullKey);
    
    if (!data) {
      return 0;
    }

    const entry: RateLimitEntry = JSON.parse(data);
    if (!entry.lockedUntil) {
      return 0;
    }

    const now = new Date();
    const remaining = new Date(entry.lockedUntil).getTime() - now.getTime();
    
    return Math.max(0, Math.ceil(remaining / 1000));
  }
}