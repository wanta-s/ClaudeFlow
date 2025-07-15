// 認証機能の使用例
import express from 'express';
import { createAuthRouter } from '../feature_001_optimized';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// Expressアプリケーションの初期化
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェアの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS設定（必要に応じて）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 認証ルーターの登録
app.use('/api/auth', createAuthRouter());

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// エラーハンドリングミドルウェア
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});