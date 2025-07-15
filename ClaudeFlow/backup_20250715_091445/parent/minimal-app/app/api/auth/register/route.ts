import { NextRequest, NextResponse } from 'next/server';

// 仮のユーザーストレージ（実際のアプリケーションではデータベースを使用）
const users = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: { code: 'E002', message: '必須項目が入力されていません' } },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    if (users.has(email)) {
      return NextResponse.json(
        { error: { code: 'E005', message: 'このメールアドレスは既に登録されています' } },
        { status: 409 }
      );
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return NextResponse.json(
        { error: { code: 'E003', message: 'パスワードは8文字以上である必要があります' } },
        { status: 400 }
      );
    }

    // ユーザー登録（実際のアプリケーションではパスワードをハッシュ化）
    users.set(email, {
      email,
      password, // 実際にはハッシュ化が必要
      name,
      createdAt: new Date().toISOString(),
    });

    // 成功レスポンス
    return NextResponse.json(
      {
        message: 'ユーザー登録が完了しました',
        user: { email, name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: { code: 'E999', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    );
  }
}