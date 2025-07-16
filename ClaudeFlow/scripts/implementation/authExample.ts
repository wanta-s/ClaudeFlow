import express from 'express';
import { authMiddleware, AuthenticatedRequest } from './authMiddleware';

const app = express();

// 公開エンドポイント（認証不要）
app.post('/api/auth/login', async (req, res) => {
  // ログイン処理（省略）
  res.json({ token: 'jwt-token' });
});

// 保護されたエンドポイント
app.get('/api/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  res.json({
    userId: req.user?.id,
    email: req.user?.email
  });
});

// 保護されたエンドポイント
app.get('/api/tasks', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  // タスク取得処理（省略）
  res.json({ tasks: [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});