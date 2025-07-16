import express, { Request, Response, Router } from 'express';
import { ReservationService } from './service';
import { MemoryReservationRepository } from './repository';
import { CreateReservationData } from './types';

const repository = new MemoryReservationRepository();
const service = new ReservationService(repository);

const router = Router();

router.post('/api/reservations', async (req: Request, res: Response) => {
  const data: CreateReservationData = {
    title: req.body.title,
    reservationDate: req.body.reservationDate,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    resourceId: req.body.resourceId,
    creatorName: req.body.creatorName
  };

  const reservation = await service.createReservation(data);

  res.json({
    success: true,
    data: {
      id: reservation.id,
      title: reservation.title,
      status: reservation.status,
      createdAt: reservation.createdAt.toISOString(),
      message: 'Reservation created successfully'
    }
  });
});

router.get('/api/reservations/availability', async (req: Request, res: Response) => {
  const { resourceId, date, startTime, endTime } = req.query;

  const isAvailable = await service.checkAvailability(
    resourceId as string,
    date as string,
    startTime as string,
    endTime as string
  );

  res.json({
    success: true,
    data: {
      available: isAvailable
    }
  });
});

export { router };