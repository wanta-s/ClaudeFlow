import { v4 as uuidv4 } from 'uuid';
import {
  ValidationResult,
  createResult,
  isError,
  ERROR_CODES,
  createError,
  createRegexValidator,
  withCache
} from './utils';
import { PasswordService } from './passwordService';

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  profile: UserProfile;
  settings: UserSettings;
  metadata: UserMetadata;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface UserMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
  isActive: boolean;
  isVerified: boolean;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  profile: Omit<UserProfile, 'displayName'>;
  settings?: Partial<UserSettings>;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  profile?: Partial<UserProfile>;
  settings?: Partial<UserSettings>;
}

// Optimized validators
const emailValidator = withCache(
  createRegexValidator(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    'Invalid email format'
  )
);

const usernameValidator = withCache(
  createRegexValidator(
    /^[a-zA-Z0-9_-]{3,30}$/,
    'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'
  )
);

// In-memory storage with optimized indexing
interface UserStore {
  byId: Map<string, User>;
  byEmail: Map<string, string>; // email -> id
  byUsername: Map<string, string>; // username -> id
}

export class UserService {
  private users: UserStore = {
    byId: new Map(),
    byEmail: new Map(),
    byUsername: new Map()
  };
  private passwordService: PasswordService;

  constructor(passwordService: PasswordService) {
    this.passwordService = passwordService;
  }

  async createUser(input: CreateUserInput): Promise<ValidationResult<User>> {
    // Validate all inputs in parallel
    const validations = await Promise.all([
      this.validateEmail(input.email),
      this.validateUsername(input.username),
      this.passwordService.validate(input.password)
    ]);

    const errors = validations.filter(isError);
    if (errors.length > 0) {
      return errors[0]; // Return first error
    }

    // Check uniqueness
    if (this.users.byEmail.has(this.normalizeEmail(input.email))) {
      return createError('DUPLICATE_ENTRY', 'Email already exists');
    }
    if (this.users.byUsername.has(input.username.toLowerCase())) {
      return createError('DUPLICATE_ENTRY', 'Username already exists');
    }

    // Hash password
    const hashResult = await this.passwordService.hash(input.password);
    if (isError(hashResult)) return hashResult;

    // Create user
    const now = new Date();
    const user: User = {
      id: uuidv4(),
      email: this.normalizeEmail(input.email),
      username: input.username,
      passwordHash: hashResult.data,
      profile: {
        ...input.profile,
        displayName: input.profile.firstName + ' ' + input.profile.lastName
      },
      settings: {
        theme: input.settings?.theme ?? 'auto',
        language: input.settings?.language ?? 'en',
        timezone: input.settings?.timezone ?? 'UTC',
        notifications: {
          email: input.settings?.notifications?.email ?? true,
          push: input.settings?.notifications?.push ?? true,
          sms: input.settings?.notifications?.sms ?? false
        }
      },
      metadata: {
        createdAt: now,
        updatedAt: now,
        loginCount: 0,
        isActive: true,
        isVerified: false
      }
    };

    // Store with indexes
    this.users.byId.set(user.id, user);
    this.users.byEmail.set(user.email, user.id);
    this.users.byUsername.set(user.username.toLowerCase(), user.id);

    return createResult(user);
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<ValidationResult<User>> {
    const user = this.users.byId.get(id);
    if (!user) {
      return createError('NOT_FOUND', 'User not found');
    }

    // Validate changed fields
    if (input.email && input.email !== user.email) {
      const emailValidation = this.validateEmail(input.email);
      if (isError(emailValidation)) return emailValidation;

      if (this.users.byEmail.has(this.normalizeEmail(input.email))) {
        return createError('DUPLICATE_ENTRY', 'Email already exists');
      }
    }

    if (input.username && input.username !== user.username) {
      const usernameValidation = this.validateUsername(input.username);
      if (isError(usernameValidation)) return usernameValidation;

      if (this.users.byUsername.has(input.username.toLowerCase())) {
        return createError('DUPLICATE_ENTRY', 'Username already exists');
      }
    }

    // Update indexes if email/username changed
    if (input.email && input.email !== user.email) {
      this.users.byEmail.delete(user.email);
      this.users.byEmail.set(this.normalizeEmail(input.email), id);
    }

    if (input.username && input.username !== user.username) {
      this.users.byUsername.delete(user.username.toLowerCase());
      this.users.byUsername.set(input.username.toLowerCase(), id);
    }

    // Update user
    const updatedUser: User = {
      ...user,
      email: input.email ? this.normalizeEmail(input.email) : user.email,
      username: input.username ?? user.username,
      profile: {
        ...user.profile,
        ...input.profile
      },
      settings: {
        ...user.settings,
        ...input.settings,
        notifications: {
          ...user.settings.notifications,
          ...input.settings?.notifications
        }
      },
      metadata: {
        ...user.metadata,
        updatedAt: new Date()
      }
    };

    // Update display name if name changed
    if (input.profile?.firstName || input.profile?.lastName) {
      updatedUser.profile.displayName = 
        `${updatedUser.profile.firstName} ${updatedUser.profile.lastName}`;
    }

    this.users.byId.set(id, updatedUser);
    return createResult(updatedUser);
  }

  async authenticate(emailOrUsername: string, password: string): Promise<ValidationResult<User>> {
    const user = this.findByEmailOrUsername(emailOrUsername);
    if (!user) {
      return createError('AUTH_FAILED', 'Invalid credentials');
    }

    if (!user.metadata.isActive) {
      return createError('AUTH_FAILED', 'Account is inactive');
    }

    const verifyResult = await this.passwordService.verify(password, user.passwordHash);
    if (isError(verifyResult) || !verifyResult.data) {
      return createError('AUTH_FAILED', 'Invalid credentials');
    }

    // Update login metadata
    user.metadata.lastLoginAt = new Date();
    user.metadata.loginCount++;
    user.metadata.updatedAt = new Date();

    return createResult(user);
  }

  getUser(id: string): ValidationResult<User> {
    const user = this.users.byId.get(id);
    return user ? createResult(user) : createError('NOT_FOUND', 'User not found');
  }

  deleteUser(id: string): ValidationResult<boolean> {
    const user = this.users.byId.get(id);
    if (!user) {
      return createError('NOT_FOUND', 'User not found');
    }

    // Remove from all indexes
    this.users.byId.delete(id);
    this.users.byEmail.delete(user.email);
    this.users.byUsername.delete(user.username.toLowerCase());

    return createResult(true);
  }

  listUsers(options?: { limit?: number; offset?: number }): User[] {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    
    return Array.from(this.users.byId.values())
      .slice(offset, offset + limit);
  }

  // Helper methods
  private validateEmail(email: string): ValidationResult<true> {
    return emailValidator(email);
  }

  private validateUsername(username: string): ValidationResult<true> {
    return usernameValidator(username);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private findByEmailOrUsername(identifier: string): User | undefined {
    const normalizedIdentifier = identifier.toLowerCase();
    
    // Try email first
    const userIdByEmail = this.users.byEmail.get(normalizedIdentifier);
    if (userIdByEmail) {
      return this.users.byId.get(userIdByEmail);
    }

    // Try username
    const userIdByUsername = this.users.byUsername.get(normalizedIdentifier);
    if (userIdByUsername) {
      return this.users.byId.get(userIdByUsername);
    }

    return undefined;
  }

  // Stats methods
  getUserCount(): number {
    return this.users.byId.size;
  }

  getActiveUserCount(): number {
    return Array.from(this.users.byId.values())
      .filter(user => user.metadata.isActive)
      .length;
  }
}

// Export factory function
export function createUserService(passwordService: PasswordService): UserService {
  return new UserService(passwordService);
}