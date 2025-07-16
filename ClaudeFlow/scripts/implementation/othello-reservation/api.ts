import express from 'express';
import { createReservation, getReservations, getReservation } from './reservation';

const app = express();
app.use(express.json());

// 予約作成エンドポイント
app.post('/api/reservations', (req, res) => {
  const { userId, scheduledAt } = req.body;
  const reservation = createReservation(userId, new Date(scheduledAt));
  res.json(reservation);
});

// 予約リスト取得
app.get('/api/reservations', (req, res) => {
  const userId = req.query.userId as string;
  const reservations = getReservations(userId);
  res.json(reservations);
});

// 予約詳細取得
app.get('/api/reservations/:id', (req, res) => {
  const reservation = getReservation(req.params.id);
  if (reservation) {
    res.json(reservation);
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

// サーバー起動
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});