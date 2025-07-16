// Rough level - 使用例
import express from 'express';
import { reservationRouter } from './index';

const app = express();
app.use(express.json());

// APIルートの登録
app.use('/api', reservationRouter);

// サーバー起動
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Example API calls:');
  console.log('- GET http://localhost:3000/api/reservations');
  console.log('- GET http://localhost:3000/api/reservations?status=active');
  console.log('- GET http://localhost:3000/api/reservations?resourceId=room-1');
});