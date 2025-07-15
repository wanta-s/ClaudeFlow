// ユーザー登録機能のテスト
import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('ユーザー登録 API', () => {
  // テストデータのクリーンアップ
  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'invalid-email', 'existing@example.com']
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('正常なデータでユーザー登録ができること', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: '太郎 田中'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('ユーザー登録が完了しました');
      expect(response.body.user).toMatchObject({
        email: userData.email,
        name: userData.name
      });
      expect(response.body.user.id).toBeDefined();
      expect(response.body.token).toBeDefined();

      // データベースに保存されているか確認
      const savedUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(savedUser).toBeTruthy();
      expect(savedUser?.name).toBe(userData.name);
      
      // パスワードがハッシュ化されているか確認
      const isPasswordHashed = await bcrypt.compare(
        userData.password,
        savedUser?.passwordHash || ''
      );
      expect(isPasswordHashed).toBe(true);
    });

    it('メールアドレスが無効な場合はエラーになること', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: '太郎 田中'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('バリデーションエラー');
      expect(response.body.details).toContainEqual({
        field: 'email',
        message: '有効なメールアドレスを入力してください'
      });
    });

    it('パスワードが短すぎる場合はエラーになること', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'short',
        name: '太郎 田中'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toContainEqual({
        field: 'password',
        message: 'パスワードは8文字以上である必要があります'
      });
    });

    it('パスワードに英数字が含まれていない場合はエラーになること', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'onlyletters',
        name: '太郎 田中'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toContainEqual({
        field: 'password',
        message: 'パスワードは英数字を含む必要があります'
      });
    });

    it('名前が空の場合はエラーになること', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: ''
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toContainEqual({
        field: 'name',
        message: '名前は1文字以上50文字以内で入力してください'
      });
    });

    it('既存のメールアドレスで登録しようとした場合はエラーになること', async () => {
      // 事前にユーザーを作成
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          name: '既存ユーザー'
        }
      });

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: '新しいユーザー'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('メールアドレスが既に使用されています');
    });

    it('必須フィールドが不足している場合はエラーになること', async () => {
      const userData = {
        email: 'test@example.com'
        // password と name が不足
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('バリデーションエラー');
    });
  });
});