// Simplified in-memory rate limiter using patterns
interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

export class RateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private cleanupTimer: NodeJS.Timer;

  constructor(
    private maxAttempts = 5,
    private windowMinutes = 15,
    private lockoutMinutes = 15
  ) {
    // Auto cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async checkLimit(identifier: string): Promise<{ allowed: boolean; remainingAttempts?: number }> {
    const record = this.attempts.get(identifier);
    const now = Date.now();

    // No record or expired window
    if (!record || now - record.firstAttempt > this.windowMinutes * 60 * 1000) {
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    // Check if locked
    if (record.lockedUntil && now < record.lockedUntil) {
      return { allowed: false, remainingAttempts: 0 };
    }

    // Check attempts
    const remaining = Math.max(0, this.maxAttempts - record.count);
    return { allowed: remaining > 0, remainingAttempts: remaining };
  }

  async recordAttempt(identifier: string, success: boolean): Promise<void> {
    if (success) {
      this.attempts.delete(identifier);
      return;
    }

    const now = Date.now();
    const record = this.attempts.get(identifier) || { count: 0, firstAttempt: now };

    // Reset if window expired
    if (now - record.firstAttempt > this.windowMinutes * 60 * 1000) {
      record.count = 0;
      record.firstAttempt = now;
      delete record.lockedUntil;
    }

    record.count++;

    // Lock if max attempts reached
    if (record.count >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutMinutes * 60 * 1000;
    }

    this.attempts.set(identifier, record);
  }

  private cleanup(): void {
    const now = Date.now();
    const windowMs = this.windowMinutes * 60 * 1000;

    for (const [key, record] of this.attempts.entries()) {
      if (now - record.firstAttempt > windowMs && (!record.lockedUntil || now > record.lockedUntil)) {
        this.attempts.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.attempts.clear();
  }
}