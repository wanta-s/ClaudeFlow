import { PasswordService } from './passwordService';

// モックユーザーデータベース
interface User {
  id: string;
  email: string;
  passwordHash: string;
  loginAttempts: number;
  lockedUntil?: Date;
  lastLogin?: Date;
}

class MockUserDatabase {
  private users: Map<string, User> = new Map();

  async createUser(email: string, passwordHash: string): Promise<User> {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      passwordHash,
      loginAttempts: 0,
    };
    this.users.set(email, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.users.get(email) || null;
  }

  async updateUser(email: string, updates: Partial<User>): Promise<void> {
    const user = this.users.get(email);
    if (user) {
      Object.assign(user, updates);
    }
  }

  async deleteUser(email: string): Promise<void> {
    this.users.delete(email);
  }

  clear(): void {
    this.users.clear();
  }
}

// 認証サービス
class AuthenticationService {
  constructor(
    private passwordService: PasswordService,
    private userDb: MockUserDatabase
  ) {}

  async register(email: string, password: string): Promise<{ success: boolean; errors?: string[] }> {
    // パスワード検証
    const validationErrors = this.passwordService.validatePassword(password);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    // 既存ユーザーチェック
    const existingUser = await this.userDb.findUserByEmail(email);
    if (existingUser) {
      return { success: false, errors: ['Email already registered'] };
    }

    // パスワードハッシュ化
    try {
      const passwordHash = await this.passwordService.hashPassword(password);
      await this.userDb.createUser(email, passwordHash);
      return { success: true };
    } catch (error) {
      return { success: false, errors: ['Registration failed'] };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; token?: string; errors?: string[] }> {
    const user = await this.userDb.findUserByEmail(email);
    if (!user) {
      // タイミング攻撃を防ぐため、存在しないユーザーでも検証を実行
      await this.passwordService.verifyPassword(password, '$2b$10$dummy.hash.for.timing.attack.prevention');
      return { success: false, errors: ['Invalid credentials'] };
    }

    // アカウントロックチェック
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { success: false, errors: ['Account is locked'] };
    }

    // パスワード検証
    const isValid = await this.passwordService.verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      // ログイン試行回数を増加
      user.loginAttempts++;
      
      // 5回失敗でアカウントロック
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15分間ロック
      }
      
      await this.userDb.updateUser(email, {
        loginAttempts: user.loginAttempts,
        lockedUntil: user.lockedUntil,
      });
      
      return { success: false, errors: ['Invalid credentials'] };
    }

    // ログイン成功
    await this.userDb.updateUser(email, {
      loginAttempts: 0,
      lockedUntil: undefined,
      lastLogin: new Date(),
    });

    // 簡易トークン生成
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    
    return { success: true, token };
  }

  async changePassword(email: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; errors?: string[] }> {
    const user = await this.userDb.findUserByEmail(email);
    if (!user) {
      return { success: false, errors: ['User not found'] };
    }

    // 現在のパスワードを検証
    const isCurrentValid = await this.passwordService.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return { success: false, errors: ['Current password is incorrect'] };
    }

    // 新しいパスワードを検証
    const validationErrors = this.passwordService.validatePassword(newPassword);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    // 同じパスワードへの変更を防ぐ
    const isSamePassword = await this.passwordService.verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return { success: false, errors: ['New password must be different from current password'] };
    }

    // 新しいパスワードをハッシュ化して保存
    try {
      const newPasswordHash = await this.passwordService.hashPassword(newPassword);
      await this.userDb.updateUser(email, { passwordHash: newPasswordHash });
      return { success: true };
    } catch (error) {
      return { success: false, errors: ['Failed to update password'] };
    }
  }
}

describe('PasswordService E2E Tests', () => {
  let passwordService: PasswordService;
  let userDb: MockUserDatabase;
  let authService: AuthenticationService;

  beforeEach(() => {
    passwordService = new PasswordService();
    userDb = new MockUserDatabase();
    authService = new AuthenticationService(passwordService, userDb);
  });

  afterEach(() => {
    userDb.clear();
  });

  describe('User Registration Flow', () => {
    it('should complete successful registration flow', async () => {
      const email = 'user@example.com';
      const password = 'SecurePass123!';

      // 登録
      const result = await authService.register(email, password);
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();

      // ユーザーが作成されたことを確認
      const user = await userDb.findUserByEmail(email);
      expect(user).toBeDefined();
      expect(user!.email).toBe(email);
      expect(user!.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    });

    it('should reject registration with weak password', async () => {
      const email = 'user@example.com';
      const weakPassword = 'password123';

      const result = await authService.register(email, weakPassword);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should prevent duplicate registrations', async () => {
      const email = 'user@example.com';
      const password = 'SecurePass123!';

      // 最初の登録
      const firstResult = await authService.register(email, password);
      expect(firstResult.success).toBe(true);

      // 重複登録の試行
      const secondResult = await authService.register(email, password);
      expect(secondResult.success).toBe(false);
      expect(secondResult.errors).toContain('Email already registered');
    });
  });

  describe('User Login Flow', () => {
    const email = 'user@example.com';
    const password = 'SecurePass123!';

    beforeEach(async () => {
      await authService.register(email, password);
    });

    it('should complete successful login flow', async () => {
      const result = await authService.login(email, password);
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.errors).toBeUndefined();

      // 最終ログイン時刻が更新されたことを確認
      const user = await userDb.findUserByEmail(email);
      expect(user!.lastLogin).toBeDefined();
      expect(user!.loginAttempts).toBe(0);
    });

    it('should reject login with incorrect password', async () => {
      const result = await authService.login(email, 'WrongPassword123!');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid credentials');
      expect(result.token).toBeUndefined();

      // ログイン試行回数が増加したことを確認
      const user = await userDb.findUserByEmail(email);
      expect(user!.loginAttempts).toBe(1);
    });

    it('should lock account after multiple failed attempts', async () => {
      // 5回失敗
      for (let i = 0; i < 5; i++) {
        await authService.login(email, 'WrongPassword123!');
      }

      // アカウントがロックされたことを確認
      const result = await authService.login(email, password);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Account is locked');

      const user = await userDb.findUserByEmail(email);
      expect(user!.lockedUntil).toBeDefined();
      expect(user!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle non-existent user login gracefully', async () => {
      const start = Date.now();
      const result = await authService.login('nonexistent@example.com', 'SomePassword123!');
      const duration = Date.now() - start;

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid credentials');

      // タイミング攻撃防止のため、実際のユーザーと同程度の時間がかかることを確認
      expect(duration).toBeGreaterThan(10);
    });
  });

  describe('Password Change Flow', () => {
    const email = 'user@example.com';
    const originalPassword = 'OldSecurePass123!';
    const newPassword = 'NewSecurePass456!';

    beforeEach(async () => {
      await authService.register(email, originalPassword);
    });

    it('should complete successful password change flow', async () => {
      // パスワード変更
      const changeResult = await authService.changePassword(email, originalPassword, newPassword);
      expect(changeResult.success).toBe(true);

      // 古いパスワードでログイン失敗
      const oldLoginResult = await authService.login(email, originalPassword);
      expect(oldLoginResult.success).toBe(false);

      // 新しいパスワードでログイン成功
      const newLoginResult = await authService.login(email, newPassword);
      expect(newLoginResult.success).toBe(true);
    });

    it('should reject password change with incorrect current password', async () => {
      const result = await authService.changePassword(email, 'WrongCurrentPass123!', newPassword);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Current password is incorrect');
    });

    it('should reject password change to same password', async () => {
      const result = await authService.changePassword(email, originalPassword, originalPassword);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('New password must be different from current password');
    });

    it('should enforce password policy on new password', async () => {
      const weakNewPassword = 'weak123';
      const result = await authService.changePassword(email, originalPassword, weakNewPassword);
      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('Security Scenarios', () => {
    it('should handle concurrent registration attempts', async () => {
      const email = 'concurrent@example.com';
      const password = 'ConcurrentPass123!';

      // 同時に複数の登録試行
      const attempts = Array.from({ length: 5 }, () => 
        authService.register(email, password)
      );

      const results = await Promise.all(attempts);
      
      // 1つだけ成功
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(1);
      
      // 残りは失敗
      const failureCount = results.filter(r => !r.success).length;
      expect(failureCount).toBe(4);
    });

    it('should handle password reset scenario', async () => {
      const email = 'reset@example.com';
      const originalPassword = 'OriginalPass123!';
      
      // ユーザー登録
      await authService.register(email, originalPassword);
      
      // パスワードリセット（実際の実装では一時トークンを使用）
      const temporaryPassword = 'TempPass123!';
      const user = await userDb.findUserByEmail(email);
      const tempHash = await passwordService.hashPassword(temporaryPassword);
      await userDb.updateUser(email, { passwordHash: tempHash });
      
      // 一時パスワードでログイン
      const tempLoginResult = await authService.login(email, temporaryPassword);
      expect(tempLoginResult.success).toBe(true);
      
      // 新しいパスワードに変更
      const finalPassword = 'FinalSecurePass123!';
      const changeResult = await authService.changePassword(email, temporaryPassword, finalPassword);
      expect(changeResult.success).toBe(true);
      
      // 最終パスワードでログイン
      const finalLoginResult = await authService.login(email, finalPassword);
      expect(finalLoginResult.success).toBe(true);
    });

    it('should handle session invalidation after password change', async () => {
      const email = 'session@example.com';
      const password = 'SessionPass123!';
      
      // 登録とログイン
      await authService.register(email, password);
      const loginResult = await authService.login(email, password);
      const oldToken = loginResult.token;
      
      // パスワード変更
      const newPassword = 'NewSessionPass123!';
      await authService.changePassword(email, password, newPassword);
      
      // 実際の実装では、古いトークンが無効化されることを確認
      // ここではトークンが変わることを簡易的に確認
      const newLoginResult = await authService.login(email, newPassword);
      expect(newLoginResult.token).not.toBe(oldToken);
    });
  });

  describe('Performance under load', () => {
    it('should handle multiple concurrent users', async () => {
      const userCount = 50;
      const baseEmail = 'loadtest';
      const password = 'LoadTest123!';
      
      // 複数ユーザーの登録
      const registrationPromises = Array.from({ length: userCount }, (_, i) => 
        authService.register(`${baseEmail}${i}@example.com`, password)
      );
      
      const registrationResults = await Promise.all(registrationPromises);
      expect(registrationResults.every(r => r.success)).toBe(true);
      
      // 複数ユーザーの同時ログイン
      const loginPromises = Array.from({ length: userCount }, (_, i) => 
        authService.login(`${baseEmail}${i}@example.com`, password)
      );
      
      const loginResults = await Promise.all(loginPromises);
      expect(loginResults.every(r => r.success)).toBe(true);
    });
  });
});