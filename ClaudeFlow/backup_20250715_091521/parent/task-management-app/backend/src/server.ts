import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createAuthRouter } from './auth';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'task-management-api',
    version: '1.0.0'
  });
});

// APIルート
app.use('/api/auth', createAuthRouter());

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません',
    path: req.originalUrl
  });
});

// エラーハンドラー
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'サーバー内部エラーが発生しました',
    ...(process.env.NODE_ENV === 'development' && {
      details: err.message,
      stack: err.stack
    })
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 サーバーがポート${PORT}で起動しました`);
  console.log(`📊 ヘルスチェック: http://localhost:${PORT}/health`);
  console.log(`🔐 認証API: http://localhost:${PORT}/api/auth`);
  console.log(`🌟 環境: ${process.env.NODE_ENV || 'development'}`);
});

export default app;