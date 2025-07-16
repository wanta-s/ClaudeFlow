import request from 'supertest';
import express from 'express';
import { router } from './api';
import { ReservationService } from './service';
import { MemoryReservationRepository } from './repository';

describe('Reservation API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(router);
  });

  describe('POST /api/reservations', () => {
    it('should create a reservation successfully', async () => {
      const reservationData = {
        resourceId: 'boardroom-1',
        userId: 'api-user-1',
        date: '2024-04-01',
        startTime: '09:00',
        endTime: '10:30',
        purpose: 'Board meeting',
        participants: ['api-user-1', 'api-user-2']
      };

      const response = await request(app)
        .post('/api/reservations')
        .send(reservationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.resourceId).toBe('boardroom-1');
      expect(response.body.userId).toBe('api-user-1');
      expect(response.body.date).toBe('2024-04-01');
      expect(response.body.startTime).toBe('09:00');
      expect(response.body.endTime).toBe('10:30');
      expect(response.body.purpose).toBe('Board meeting');
      expect(response.body.participants).toEqual(['api-user-1', 'api-user-2']);
      expect(response.body.status).toBe('confirmed');
    });

    it('should return 201 status for successful creation', async () => {
      const reservationData = {
        resourceId: 'lab-room-2',
        userId: 'researcher-1',
        date: '2024-04-15',
        startTime: '13:00',
        endTime: '17:00',
        purpose: 'Research experiment',
        participants: ['researcher-1']
      };

      await request(app)
        .post('/api/reservations')
        .send(reservationData)
        .expect(201);
    });
  });

  describe('GET /api/reservations/availability', () => {
    it('should check availability and return true when available', async () => {
      const response = await request(app)
        .get('/api/reservations/availability')
        .query({
          resourceId: 'open-space-1',
          date: '2024-05-01',
          startTime: '10:00',
          endTime: '11:00'
        })
        .expect(200);

      expect(response.body).toEqual({ available: true });
    });

    it('should check availability and return false when conflicted', async () => {
      const reservationData = {
        resourceId: 'studio-1',
        userId: 'artist-1',
        date: '2024-05-20',
        startTime: '14:00',
        endTime: '16:00',
        purpose: 'Recording session',
        participants: ['artist-1']
      };

      await request(app)
        .post('/api/reservations')
        .send(reservationData);

      const response = await request(app)
        .get('/api/reservations/availability')
        .query({
          resourceId: 'studio-1',
          date: '2024-05-20',
          startTime: '15:00',
          endTime: '17:00'
        })
        .expect(200);

      expect(response.body).toEqual({ available: false });
    });
  });
});