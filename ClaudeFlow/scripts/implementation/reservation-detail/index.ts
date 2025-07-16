import { Router } from 'express';
import { ReservationController } from './controller';

export * from './types';
export * from './repository';
export * from './service';
export * from './controller';

export function createReservationDetailRouter(): Router {
  const router = Router();
  const controller = new ReservationController();

  router.get('/api/reservations/:id', (req, res) => controller.getReservationDetail(req, res));

  return router;
}