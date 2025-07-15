// ユーザー登録機能 - 最適化版
import { Request, Response, NextFunction, Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult, ValidationError } from 'express-validator';
import rateLimit from 'express-rate-limit';

// 型定義
interface UserRegistrationRequest {
  email: string;
  password: string;
  name: string;
}

interface UserResponse {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

interface TokenPayload {
  userId: number;
  email: string;
  name: string;
  iat: number;
}

// 定数とコンフィグ
const CONFIG = {
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: '24h',
    issuer: 'task-management-app',
    audience: 'task-management-users'
  },
  rateLimit: {
    windowMs: 5 * 60 * 1000, // 5分
    max: 5
  },
  password: {
    saltRounds: 12,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  },
  validation: {
    email: { maxLength: 255 },
    name: { minLength: 1, maxLength: 50 }
  }
} as const;

// シングルトンPrismaクライアント
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

// レート制限設定（メモ化）
export const registerRateLimit = rateLimit({
  ...CONFIG.rateLimit,
  message: {
    success: false,
    error: 'リクエストが多すぎます。5分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

// バリデーション規則（再利用可能）
export const registerValidation = [
  body('email')
    .isEmail().withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail()
    .isLength({ max: CONFIG.validation.email.maxLength })
    .withMessage(`メールアドレスは${CONFIG.validation.email.maxLength}文字以内で入力してください`),
  
  body('password')
    .isLength({ min: CONFIG.password.minLength, max: CONFIG.password.maxLength })
    .withMessage(`パスワードは${CONFIG.password.minLength}文字以上${CONFIG.password.maxLength}文字以内で入力してください`)
    .matches(CONFIG.password.pattern)
    .withMessage('パスワードは大文字、小文字、数字、特殊文字を含む必要があります'),
  
  body('name')
    .trim()
    .isLength({ min: CONFIG.validation.name.minLength, max: CONFIG.validation.name.maxLength })
    .withMessage(`名前は${CONFIG.validation.name.minLength}文字以上${CONFIG.validation.name.maxLength}文字以内で入力してください`)
    .matches(/^[^\x00-\x1F\x7F]+$/)
    .withMessage('名前に無効な文字が含まれています')
];

// エラーハンドリングミドルウェア（改善版）
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err: ValidationError) => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg
    }));
    
    res.status(400).json({
      success: false,
      error: 'バリデーションエラー',
      details: formattedErrors
    } as ApiResponse);
    return;
  }
  next();
};

// JWTトークン生成（最適化版）
const generateToken = (user: UserResponse): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, CONFIG.jwt.secret, {
    expiresIn: CONFIG.jwt.expiresIn,
    issuer: CONFIG.jwt.issuer,
    audience: CONFIG.jwt.audience
  });
};

// パスワード強度チェック（最適化版）
interface PasswordStrength {
  score: number;
  level: 'weak' | 'medium' | 'strong';
  feedback: string[];
}

const checkPasswordStrength = (password: string): PasswordStrength => {
  const checks = [
    { test: () => password.length >= CONFIG.password.minLength, message: `${CONFIG.password.minLength}文字以上にしてください` },
    { test: () => /[a-z]/.test(password), message: '小文字を含めてください' },
    { test: () => /[A-Z]/.test(password), message: '大文字を含めてください' },
    { test: () => /\d/.test(password), message: '数字を含めてください' },
    { test: () => /[@$!%*?&]/.test(password), message: '特殊文字を含めてください' }
  ];

  const results = checks.map(check => ({
    passed: check.test(),
    message: check.message
  }));

  const score = results.filter(r => r.passed).length;
  const feedback = results.filter(r => !r.passed).map(r => r.message);
  
  return {
    score,
    level: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
    feedback
  };
};

// セキュリティヘッダー設定ミドルウェア
const setSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'"
  });
  next();
};

// メイン登録処理（最適化版）
export const registerUser = async (
  req: Request<{}, {}, UserRegistrationRequest>,
  res: Response<ApiResponse<{ user: UserResponse; token: string; expiresIn: string }>>
): Promise<void> => {
  const { email, password, name } = req.body;

  try {
    // パスワード強度チェック（早期リターン）
    const passwordStrength = checkPasswordStrength(password);
    if (passwordStrength.score < 4) {
      res.status(400).json({
        success: false,
        error: 'パスワードが弱すぎます',
        details: { feedback: passwordStrength.feedback }
      });
      return;
    }

    // トランザクション処理（最適化）
    const user = await prisma.$transaction(async (tx) => {
      // 重複チェックとユーザー作成を1つのトランザクションで
      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true }
      });

      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      // パスワードハッシュ化（非同期処理の最適化）
      const passwordHash = await bcrypt.hash(password, CONFIG.password.saltRounds);

      // ユーザー作成
      return await tx.user.create({
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
    }, {
      maxWait: 5000, // 5秒
      timeout: 10000, // 10秒
      isolationLevel: 'Serializable' // 重複チェックの整合性を保証
    });

    // トークン生成
    const token = generateToken(user);

    // 成功レスポンス
    res.status(201).json({
      success: true,
      message: 'ユーザー登録が完了しました',
      data: {
        user,
        token,
        expiresIn: CONFIG.jwt.expiresIn
      }
    });

    // 非同期ログ記録（レスポンスをブロックしない）
    setImmediate(() => {
      console.log(`新規ユーザー登録: ${user.email} (ID: ${user.id})`);
    });

  } catch (error) {
    // エラーハンドリング（最適化版）
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      res.status(409).json({
        success: false,
        error: 'メールアドレスが既に使用されています'
      });
      return;
    }

    // エラーログ記録
    console.error('ユーザー登録エラー:', error);

    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    });
  }
};

// パスワード強度チェックAPI（最適化版）
export const checkPasswordStrengthHandler = (
  req: Request<{}, {}, { password: string }>,
  res: Response<ApiResponse<{ strength: PasswordStrength }>>
): void => {
  const { password } = req.body;
  
  if (!password) {
    res.status(400).json({
      success: false,
      error: 'パスワードが必要です'
    });
    return;
  }

  const strength = checkPasswordStrength(password);
  
  res.json({
    success: true,
    data: { strength }
  });
};

// ルーター設定（最適化版）
export const createAuthRouter = (): Router => {
  const router = Router();

  // セキュリティヘッダーを全ルートに適用
  router.use(setSecurityHeaders);

  // ユーザー登録エンドポイント
  router.post(
    '/register',
    registerRateLimit,
    registerValidation,
    handleValidationErrors,
    registerUser
  );

  // パスワード強度チェックエンドポイント
  router.post(
    '/check-password-strength',
    body('password').isString().withMessage('パスワードは文字列である必要があります'),
    handleValidationErrors,
    checkPasswordStrengthHandler
  );

  return router;
};

// デフォルトエクスポート
export default {
  registerRateLimit,
  registerValidation,
  registerUser,
  checkPasswordStrengthHandler,
  createAuthRouter,
  checkPasswordStrength
};

// クリーンアップ処理
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});