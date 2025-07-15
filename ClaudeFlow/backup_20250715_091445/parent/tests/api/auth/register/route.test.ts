import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/register/route';

describe('/api/auth/register', () => {
  const mockRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系テスト', () => {
    it('有効な入力で新規ユーザーを登録できる', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: '田中太郎',
      };

      const response = await POST(mockRequest(validData));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('ユーザー登録が完了しました');
      expect(data.user).toEqual({
        email: 'test@example.com',
        name: '田中太郎',
      });
    });

    it('異なるメールアドレスで複数のユーザーを登録できる', async () => {
      const user1 = {
        email: 'user1@example.com',
        password: 'password123',
        name: 'ユーザー1',
      };

      const user2 = {
        email: 'user2@example.com',
        password: 'password456',
        name: 'ユーザー2',
      };

      const response1 = await POST(mockRequest(user1));
      const response2 = await POST(mockRequest(user2));

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });
  });

  describe('異常系テスト', () => {
    it('必須項目が未入力の場合エラーを返す', async () => {
      const testCases = [
        { email: '', password: 'password123', name: '田中太郎' },
        { email: 'test@example.com', password: '', name: '田中太郎' },
        { email: 'test@example.com', password: 'password123', name: '' },
      ];

      for (const testData of testCases) {
        const response = await POST(mockRequest(testData));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.code).toBe('E002');
        expect(data.error.message).toBe('必須項目が入力されていません');
      }
    });

    it('既に登録されているメールアドレスの場合エラーを返す', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: '田中太郎',
      };

      const response1 = await POST(mockRequest(userData));
      expect(response1.status).toBe(201);

      const response2 = await POST(mockRequest(userData));
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.error.code).toBe('E005');
      expect(data2.error.message).toBe('このメールアドレスは既に登録されています');
    });

    it('パスワードが8文字未満の場合エラーを返す', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: '1234567',
        name: '田中太郎',
      };

      const response = await POST(mockRequest(invalidData));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('E003');
      expect(data.error.message).toBe('パスワードは8文字以上である必要があります');
    });

    it('不正なJSONを送信した場合サーバーエラーを返す', async () => {
      const mockBadRequest = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as NextRequest;

      const response = await POST(mockBadRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('E999');
      expect(data.error.message).toBe('サーバーエラーが発生しました');
    });
  });

  describe('境界値テスト', () => {
    it('パスワードが正確に8文字の場合は登録できる', async () => {
      const validData = {
        email: 'boundary1@example.com',
        password: '12345678',
        name: '田中太郎',
      };

      const response = await POST(mockRequest(validData));
      expect(response.status).toBe(201);
    });

    it('パスワードが7文字の場合はエラーを返す', async () => {
      const invalidData = {
        email: 'boundary2@example.com',
        password: '1234567',
        name: '田中太郎',
      };

      const response = await POST(mockRequest(invalidData));
      expect(response.status).toBe(400);
    });

    it('名前が50文字の場合は登録できる', async () => {
      const validData = {
        email: 'boundary3@example.com',
        password: 'password123',
        name: 'あ'.repeat(50),
      };

      const response = await POST(mockRequest(validData));
      expect(response.status).toBe(201);
    });

    it('メールアドレスが255文字の場合は登録できる', async () => {
      const localPart = 'a'.repeat(243);
      const validData = {
        email: `${localPart}@example.com`,
        password: 'password123',
        name: '田中太郎',
      };

      const response = await POST(mockRequest(validData));
      expect(response.status).toBe(201);
    });
  });

  describe('特殊ケーステスト', () => {
    it('名前に特殊文字を含む場合も登録できる', async () => {
      const validData = {
        email: 'special1@example.com',
        password: 'password123',
        name: '田中太郎@#$%^&*()',
      };

      const response = await POST(mockRequest(validData));
      expect(response.status).toBe(201);
    });

    it('パスワードに記号を含む場合も登録できる', async () => {
      const validData = {
        email: 'special2@example.com',
        password: 'Pass@word123!',
        name: '田中太郎',
      };

      const response = await POST(mockRequest(validData));
      expect(response.status).toBe(201);
    });

    it('空オブジェクトを送信した場合エラーを返す', async () => {
      const response = await POST(mockRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('E002');
    });

    it('null値を含む場合エラーを返す', async () => {
      const invalidData = {
        email: null,
        password: 'password123',
        name: '田中太郎',
      };

      const response = await POST(mockRequest(invalidData));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('E002');
    });
  });
});