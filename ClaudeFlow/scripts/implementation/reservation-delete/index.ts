import express from 'express';
import reservationRoutes from './routes/reservationRoutes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use(reservationRoutes);

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Reservation delete service running on port ${PORT}`);
});