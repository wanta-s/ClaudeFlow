import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'app-20250717-071437-backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// メインAPIエンドポイント
app.get('/api/hello', (_req, res) => {
  res.json({
    message: 'Hello from app-20250717-071437-backend API!',
    success: true,
    data: {
      project: 'app-20250717-071437-backend',
      description: 'Backend for Generated by ClaudeFlow - fullstack project',
      version: '1.0.0'
    }
  });
});

// サンプルユーザーエンドポイント
app.get('/api/users', (_req, res) => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];
  
  res.json({
    success: true,
    data: users,
    count: users.length
  });
});

// エラーハンドリング
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 app-20250717-071437-backend API server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API: http://localhost:${PORT}/api/hello`);
});

export default app;
