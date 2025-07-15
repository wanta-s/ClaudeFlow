// ユーザー登録機能 - 最小実装
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

// バリデーション規則
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('パスワードは8文字以上である必要があります')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('パスワードは英数字を含む必要があります'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('名前は1文字以上50文字以内で入力してください')
];

// ユーザー登録API
export const registerUser = async (req: Request, res: Response) => {
  try {
    // バリデーションエラーチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'バリデーションエラー',
        details: errors.array().map(err => ({
          field: err.type === 'field' ? err.path : 'unknown',
          message: err.msg
        }))
      });
    }

    const { email, password, name } = req.body;

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'メールアドレスが既に使用されています'
      });
    }

    // パスワードのハッシュ化
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ユーザーの作成
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name
      }
    });

    // JWTトークンの生成
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // レスポンス
    res.status(201).json({
      success: true,
      message: 'ユーザー登録が完了しました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      token
    });

  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
};

// エクスポート
export default {
  registerValidation,
  registerUser
};