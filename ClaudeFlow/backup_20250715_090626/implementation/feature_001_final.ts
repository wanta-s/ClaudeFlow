// ユーザー登録機能 - 最終実装版
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const prisma = new PrismaClient();

// レート制限設定
export const registerRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分
  max: 5, // 最大5回まで
  message: {
    success: false,
    error: 'リクエストが多すぎます。5分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 強化されたバリデーション規則
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('メールアドレスは255文字以内で入力してください'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('パスワードは8文字以上128文字以内で入力してください')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('パスワードは大文字、小文字、数字、特殊文字を含む必要があります'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('名前は1文字以上50文字以内で入力してください')
    .matches(/^[^\x00-\x1F\x7F]+$/)
    .withMessage('名前に無効な文字が含まれています')
];

// エラーハンドリングミドルウェア
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
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
  next();
};

// JWTトークン生成関数
const generateToken = (user: { id: number; email: string; name: string }) => {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'default-secret-change-in-production',
    { 
      expiresIn: '24h',
      issuer: 'task-management-app',
      audience: 'task-management-users'
    }
  );
};

// パスワード強度チェック
const checkPasswordStrength = (password: string): { score: number; feedback: string[] } => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push('8文字以上にしてください');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('小文字を含めてください');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('大文字を含めてください');

  if (/\d/.test(password)) score += 1;
  else feedback.push('数字を含めてください');

  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push('特殊文字を含めてください');

  return { score, feedback };
};

// メイン登録処理
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // パスワード強度チェック
    const passwordStrength = checkPasswordStrength(password);
    if (passwordStrength.score < 4) {
      return res.status(400).json({
        success: false,
        error: 'パスワードが弱すぎます',
        feedback: passwordStrength.feedback
      });
    }

    // メールアドレスの重複チェック（トランザクション内で実行）
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      // パスワードのハッシュ化
      const saltRounds = 12; // セキュリティ強化
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // ユーザーの作成
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });

      return user;
    });

    // JWTトークンの生成
    const token = generateToken(result);

    // セキュリティヘッダーの設定
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    // 成功レスポンス
    res.status(201).json({
      success: true,
      message: 'ユーザー登録が完了しました',
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        createdAt: result.createdAt
      },
      token,
      expiresIn: '24h'
    });

    // ログ記録（本番環境では適切なロギングシステムを使用）
    console.log(`新規ユーザー登録: ${result.email} (ID: ${result.id})`);

  } catch (error) {
    console.error('ユーザー登録エラー:', error);

    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return res.status(409).json({
        success: false,
        error: 'メールアドレスが既に使用されています'
      });
    }

    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error instanceof Error ? error.message : 'Unknown error' 
      })
    });
  }
};

// Express ルーター設定
import { Router } from 'express';

export const authRouter = Router();

authRouter.post(
  '/register',
  registerRateLimit,
  registerValidation,
  handleValidationErrors,
  registerUser
);

// ヘルスチェック用のパスワード強度チェックAPI
authRouter.post('/check-password-strength', (req: Request, res: Response) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'パスワードが必要です'
    });
  }

  const strength = checkPasswordStrength(password);
  
  res.json({
    success: true,
    strength: {
      score: strength.score,
      level: strength.score < 3 ? '弱い' : strength.score < 5 ? '普通' : '強い',
      feedback: strength.feedback
    }
  });
});

export default {
  registerRateLimit,
  registerValidation,
  registerUser,
  authRouter,
  checkPasswordStrength
};