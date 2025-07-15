import { NextRequest, NextResponse } from 'next/server';

// 仮のユーザーストレージ（register routeと共有する必要がある）
// 実際のアプリケーションではデータベースを使用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'E001', message: 'メールアドレスとパスワードを入力してください' } },
        { status: 400 }
      );
    }

    // 仮の認証ロジック
    // 実際のアプリケーションではデータベースからユーザーを検索し、パスワードを検証
    if (email === 'test@example.com' && password === 'password123') {
      return NextResponse.json(
        {
          message: 'ログインに成功しました',
          user: { email, name: 'テストユーザー' },
        },
        { status: 200 }
      );
    }

    // 認証失敗
    return NextResponse.json(
      { error: { code: 'E001', message: 'メールアドレスまたはパスワードが正しくありません' } },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { code: 'E999', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    );
  }
}