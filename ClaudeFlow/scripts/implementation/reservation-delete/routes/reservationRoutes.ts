import { Router } from 'express';
import { reservationService } from '../services/reservationService';

const router = Router();

// Rough implementation - no error handling
router.delete('/api/reservations/:id', (req, res) => {
  const result = reservationService.deleteReservation({
    id: req.params.id,
    reason: req.body.reason
  });

  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// Batch delete endpoint
router.delete('/api/reservations', (req, res) => {
  const ids = req.body.ids || [];
  const result = reservationService.deleteMultipleReservations(ids);
  
  res.json(result);
});

export default router;