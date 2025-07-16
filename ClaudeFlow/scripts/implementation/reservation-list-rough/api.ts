// Rough level - シンプルなAPI実装
import express from 'express';
import { ReservationListService } from './service';

const router = express.Router();
const service = new ReservationListService();

// GET /api/reservations
router.get('/reservations', (req, res) => {
  const filter = {
    resourceId: req.query.resourceId as string,
    status: req.query.status as any
  };

  const result = service.getReservations(filter);
  res.json(result);
});

export default router;