// utils.ts - Utility functions for authentication
import * as crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

// Password hashing utilities
export const hashPassword = {
  async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  },

  async verify(password: string, hash: string): Promise<boolean> {
    try {
      const [salt, key] = hash.split(':');
      const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
      return key === derivedKey.toString('hex');
    } catch {
      return false;
    }
  },
};

// Token generation utilities
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

export function generateSecureRandomString(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

// Time utilities
export function addMilliseconds(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

export function isExpired(date: Date): boolean {
  return date < new Date();
}

// Sanitization utilities
export function sanitizeUsername(username: string): string {
  return username.toLowerCase().trim();
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Crypto utilities for token signing (simplified version)
export class TokenSigner {
  constructor(private secret: string) {}

  sign(payload: any): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${header}.${body}`)
      .digest('base64url');
    
    return `${header}.${body}.${signature}`;
  }

  verify(token: string): any | null {
    try {
      const [header, body, signature] = token.split('.');
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(`${header}.${body}`)
        .digest('base64url');
      
      if (signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
      
      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

// Session utilities
export function createSessionId(): string {
  return generateSecureRandomString(32);
}

// IP utilities
export function getClientIp(request: any): string {
  return (
    request.headers['x-forwarded-for']?.split(',')[0] ||
    request.headers['x-real-ip'] ||
    request.connection?.remoteAddress ||
    'unknown'
  );
}

// User agent parsing
export function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  device: string;
} {
  // Simplified parsing - in production use a proper UA parser
  const browser = userAgent.includes('Chrome') ? 'Chrome' : 
                  userAgent.includes('Firefox') ? 'Firefox' :
                  userAgent.includes('Safari') ? 'Safari' : 'Unknown';
  
  const os = userAgent.includes('Windows') ? 'Windows' :
             userAgent.includes('Mac') ? 'macOS' :
             userAgent.includes('Linux') ? 'Linux' : 'Unknown';
  
  const device = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';

  return { browser, os, device };
}