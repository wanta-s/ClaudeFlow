import { IRateLimiter } from './loginService';

interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export class InMemoryRateLimiter implements IRateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private readonly maxAttempts: number;
  private readonly lockoutDuration: number;
  private readonly cleanupInterval: number;

  constructor(
    maxAttempts = 5,
    lockoutMinutes = 15,
    cleanupIntervalMinutes = 30
  ) {
    this.maxAttempts = maxAttempts;
    this.lockoutDuration = lockoutMinutes * 60 * 1000;
    this.cleanupInterval = cleanupIntervalMinutes * 60 * 1000;
    
    // Periodic cleanup
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  async checkLimit(identifier: string): Promise<{ allowed: boolean; remainingAttempts?: number }> {
    const record = this.attempts.get(identifier);
    const now = Date.now();

    if (!record) {
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    // Check if locked
    if (record.lockedUntil && record.lockedUntil > now) {
      return { allowed: false, remainingAttempts: 0 };
    }

    // Reset if lockout has expired
    if (record.lockedUntil && record.lockedUntil <= now) {
      this.attempts.delete(identifier);
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    const remaining = this.maxAttempts - record.count;
    return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
  }

  async recordAttempt(identifier: string, success: boolean): Promise<void> {
    const now = Date.now();
    const record = this.attempts.get(identifier) || { count: 0, lastAttempt: now };

    if (success) {
      // Reset on successful login
      this.attempts.delete(identifier);
      return;
    }

    // Increment failed attempts
    record.count++;
    record.lastAttempt = now;

    // Lock if max attempts reached
    if (record.count >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutDuration;
    }

    this.attempts.set(identifier, record);
  }

  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = now - this.cleanupInterval;

    for (const [key, record] of this.attempts.entries()) {
      // Remove expired lockouts or stale records
      if ((record.lockedUntil && record.lockedUntil < now) || 
          record.lastAttempt < staleThreshold) {
        this.attempts.delete(key);
      }
    }
  }
}