'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === 'E001') {
          setErrors({ general: 'メールアドレスまたはパスワードが正しくありません' });
        } else {
          setErrors({ general: 'エラーが発生しました' });
        }
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'ネットワークエラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>ログイン</h1>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        {errors.general && <p style={{ color: 'red' }}>{errors.general}</p>}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        アカウントをお持ちでない方は{' '}
        <a href="/register" style={{ color: '#0070f3' }}>新規登録</a>
      </p>
    </div>
  );
}