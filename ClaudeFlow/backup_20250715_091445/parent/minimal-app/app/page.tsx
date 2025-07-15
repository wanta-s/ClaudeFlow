'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <h1>タスク管理アプリケーション</h1>
      <p>シンプルで使いやすいタスク管理ツールです。</p>
      
      <div style={{ marginTop: '30px' }}>
        <button
          onClick={() => router.push('/register')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          新規登録
        </button>
        
        <button
          onClick={() => router.push('/login')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'white',
            color: '#0070f3',
            border: '1px solid #0070f3',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ログイン
        </button>
      </div>
    </div>
  );
}