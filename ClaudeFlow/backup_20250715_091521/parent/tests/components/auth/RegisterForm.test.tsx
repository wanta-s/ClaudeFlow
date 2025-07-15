import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import RegisterPage from '@/app/register/page';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

global.fetch = jest.fn();

describe('RegisterPage Component', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('正常系テスト', () => {
    it('初期状態で正しくレンダリングされる', () => {
      render(<RegisterPage />);

      expect(screen.getByText('ユーザー登録')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス *')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード *')).toBeInTheDocument();
      expect(screen.getByLabelText('名前 *')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument();
      expect(screen.getByText('ログイン')).toBeInTheDocument();
    });

    it('有効な入力で正常に登録できる', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'ユーザー登録が完了しました',
          user: { email: 'test@example.com', name: '田中太郎' },
        }),
      });

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('メールアドレス *'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('パスワード *'), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText('名前 *'), {
        target: { value: '田中太郎' },
      });

      fireEvent.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            name: '田中太郎',
          }),
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('登録中は送信ボタンが無効になる', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('メールアドレス *'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('パスワード *'), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText('名前 *'), {
        target: { value: '田中太郎' },
      });

      const submitButton = screen.getByRole('button', { name: '登録する' });
      fireEvent.click(submitButton);

      expect(screen.getByRole('button', { name: '登録中...' })).toBeDisabled();
    });
  });

  describe('異常系テスト', () => {
    it('メールアドレス重複エラーを正しく表示する', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: 'E005',
            message: 'このメールアドレスは既に登録されています',
          },
        }),
      });

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('メールアドレス *'), {
        target: { value: 'duplicate@example.com' },
      });
      fireEvent.change(screen.getByLabelText('パスワード *'), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText('名前 *'), {
        target: { value: '田中太郎' },
      });

      fireEvent.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(screen.getByText('このメールアドレスは既に登録されています')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('一般的なエラーを正しく表示する', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: 'E999',
            message: 'サーバーエラーが発生しました',
          },
        }),
      });

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('メールアドレス *'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('パスワード *'), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText('名前 *'), {
        target: { value: '田中太郎' },
      });

      fireEvent.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });

    it('ネットワークエラーを正しく処理する', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('メールアドレス *'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('パスワード *'), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText('名前 *'), {
        target: { value: '田中太郎' },
      });

      fireEvent.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('フォーム入力テスト', () => {
    it('入力値が正しく状態に反映される', () => {
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText('メールアドレス *') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('パスワード *') as HTMLInputElement;
      const nameInput = screen.getByLabelText('名前 *') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(nameInput, { target: { value: '田中太郎' } });

      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');
      expect(nameInput.value).toBe('田中太郎');
    });

    it('HTML5バリデーション属性が正しく設定されている', () => {
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText('メールアドレス *') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('パスワード *') as HTMLInputElement;
      const nameInput = screen.getByLabelText('名前 *') as HTMLInputElement;

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('minLength', '8');

      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).toHaveAttribute('required');
      expect(nameInput).toHaveAttribute('maxLength', '50');
    });
  });

  describe('境界値テスト', () => {
    it('パスワードが8文字で送信できる', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '成功' }),
      });

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText('メールアドレス *'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('パスワード *'), {
        target: { value: '12345678' },
      });
      fireEvent.change(screen.getByLabelText('名前 *'), {
        target: { value: '田中太郎' },
      });

      fireEvent.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('名前が50文字まで入力できる', () => {
      render(<RegisterPage />);

      const nameInput = screen.getByLabelText('名前 *') as HTMLInputElement;
      const longName = 'あ'.repeat(50);

      fireEvent.change(nameInput, { target: { value: longName } });

      expect(nameInput.value).toBe(longName);
    });
  });

  describe('UIインタラクションテスト', () => {
    it('ログインリンクが正しく機能する', () => {
      render(<RegisterPage />);

      const loginLink = screen.getByText('ログイン');

      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('エラー発生後に再送信できる', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { code: 'E005' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: '成功' }),
        });

      render(<RegisterPage />);

      const formData = {
        email: 'test@example.com',
        password: 'password123',
        name: '田中太郎',
      };

      fireEvent.change(screen.getByLabelText('メールアドレス *'), {
        target: { value: formData.email },
      });
      fireEvent.change(screen.getByLabelText('パスワード *'), {
        target: { value: formData.password },
      });
      fireEvent.change(screen.getByLabelText('名前 *'), {
        target: { value: formData.name },
      });

      fireEvent.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(screen.getByText('このメールアドレスは既に登録されています')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('メールアドレス *'), {
        target: { value: 'new@example.com' },
      });

      fireEvent.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});