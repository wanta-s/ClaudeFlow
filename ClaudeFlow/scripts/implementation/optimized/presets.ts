import { PasswordPolicy } from './passwordService';

export type PasswordPreset = 'minimal' | 'standard' | 'strict' | 'paranoid';

export const presets: Record<PasswordPreset, PasswordPolicy> = {
  minimal: {
    minLength: 6,
    maxLength: 128,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
    minStrength: 30
  },
  standard: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    minStrength: 50
  },
  strict: {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minStrength: 70,
    maxRepeatingChars: 2,
    minDifferentChars: 6
  },
  paranoid: {
    minLength: 16,
    maxLength: 256,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minStrength: 90,
    maxRepeatingChars: 1,
    minDifferentChars: 10,
    excludePatterns: [
      /password/i,
      /admin/i,
      /root/i,
      /123456/,
      /qwerty/i
    ]
  }
};

export function applyPreset(preset: PasswordPreset): PasswordPolicy {
  return { ...presets[preset] };
}