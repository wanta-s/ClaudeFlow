import express from 'express';
import { ReservationService } from './reservation-detail';

const app = express();
const reservationService = new ReservationService();

// GET /api/reservations/:id
app.get('/api/reservations/:id', (req, res) => {
  const { id } = req.params;
  
  const reservation = reservationService.getReservationDetail(id);
  
  if (!reservation) {
    res.status(404).json({ error: 'Reservation not found' });
    return;
  }
  
  res.json(reservation);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});