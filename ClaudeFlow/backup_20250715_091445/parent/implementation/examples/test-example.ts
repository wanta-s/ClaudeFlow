// テストコードの使用例
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuthRouter } from '../feature_001_optimized';

// モックの設定
jest.mock('@prisma/client');
jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  },
  $transaction: jest.fn()
};

describe('Auth API Tests', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(() => {
    // アプリケーションのセットアップ
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter());
    request = supertest(app);

    // モックのリセット
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'ValidPass123!',
      name: 'Test User'
    };

    it('正常なユーザー登録', async () => {
      // モックの設定
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 1,
              email: validUserData.email,
              name: validUserData.name,
              createdAt: new Date()
            })
          }
        });
      });

      const response = await request
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'ユーザー登録が完了しました',
        data: {
          user: {
            id: expect.any(Number),
            email: validUserData.email,
            name: validUserData.name
          },
          token: expect.any(String),
          expiresIn: '24h'
        }
      });
    });

    it('メールアドレスの重複エラー', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('EMAIL_EXISTS'));

      const response = await request
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'メールアドレスが既に使用されています'
      });
    });

    it('バリデーションエラー', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        name: ''
      };

      const response = await request
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'バリデーションエラー',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'password',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'name',
            message: expect.any(String)
          })
        ])
      });
    });

    it('弱いパスワードのエラー', async () => {
      const weakPasswordData = {
        ...validUserData,
        password: 'Password123' // 特殊文字なし
      };

      const response = await request
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'パスワードが弱すぎます',
        details: {
          feedback: expect.arrayContaining(['特殊文字を含めてください'])
        }
      });
    });
  });

  describe('POST /api/auth/check-password-strength', () => {
    it('強いパスワードの判定', async () => {
      const response = await request
        .post('/api/auth/check-password-strength')
        .send({ password: 'StrongPass123!' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          strength: {
            score: 5,
            level: 'strong',
            feedback: []
          }
        }
      });
    });

    it('弱いパスワードの判定', async () => {
      const response = await request
        .post('/api/auth/check-password-strength')
        .send({ password: 'weak' })
        .expect(200);

      expect(response.body.data.strength).toMatchObject({
        score: expect.any(Number),
        level: 'weak',
        feedback: expect.arrayContaining([
          expect.any(String)
        ])
      });
    });

    it('パスワードが提供されない場合', async () => {
      const response = await request
        .post('/api/auth/check-password-strength')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'パスワードが必要です'
      });
    });
  });

  describe('レート制限のテスト', () => {
    it('レート制限が機能すること', async () => {
      const validUserData = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        name: 'Test User'
      };

      // 環境変数を本番モードに設定（テストモードではスキップされるため）
      process.env.NODE_ENV = 'production';

      // 6回リクエストを送信（制限は5回）
      for (let i = 0; i < 6; i++) {
        const response = await request
          .post('/api/auth/register')
          .send(validUserData);

        if (i < 5) {
          expect(response.status).not.toBe(429);
        } else {
          expect(response.status).toBe(429);
          expect(response.body).toEqual({
            success: false,
            error: 'リクエストが多すぎます。5分後に再試行してください。'
          });
        }
      }

      // 環境変数を元に戻す
      process.env.NODE_ENV = 'test';
    });
  });

  describe('セキュリティヘッダーのテスト', () => {
    it('適切なセキュリティヘッダーが設定されること', async () => {
      const response = await request
        .post('/api/auth/check-password-strength')
        .send({ password: 'test' });

      expect(response.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block'
      });
    });
  });
});

// 統合テストの例
describe('Auth Integration Tests', () => {
  let app: express.Application;
  let prisma: PrismaClient;

  beforeEach(async () => {
    // 実際のPrismaクライアントを使用
    prisma = new PrismaClient();
    
    // テスト用データベースのクリーンアップ
    await prisma.user.deleteMany();
    
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter());
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('実際のデータベースでのユーザー登録フロー', async () => {
    const userData = {
      email: 'integration@test.com',
      password: 'IntegrationTest123!',
      name: 'Integration Test User'
    };

    // ユーザー登録
    const registerResponse = await supertest(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.token).toBeDefined();

    // データベースで確認
    const user = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    expect(user).toBeDefined();
    expect(user?.email).toBe(userData.email);
    expect(user?.name).toBe(userData.name);

    // 重複登録の確認
    const duplicateResponse = await supertest(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(409);

    expect(duplicateResponse.body.error).toBe('メールアドレスが既に使用されています');
  });
});

// パフォーマンステストの例
describe('Auth Performance Tests', () => {
  it('登録処理が許容時間内に完了すること', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter());

    const userData = {
      email: 'perf@test.com',
      password: 'PerfTest123!',
      name: 'Performance Test'
    };

    const startTime = Date.now();
    
    await supertest(app)
      .post('/api/auth/register')
      .send(userData);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 登録処理は1秒以内に完了すべき
    expect(duration).toBeLessThan(1000);
  });
});

// エクスポート
export { mockPrisma };