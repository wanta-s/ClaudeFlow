import request from 'supertest';
import express from 'express';
import { reservationRouter } from './api';

describe('Reservation API', () => {
  const app = express();
  app.use('/api', reservationRouter);

  describe('GET /api/reservations', () => {
    it('should return all reservations when no query params are provided', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .expect(200);

      expect(response.body.totalCount).toBe(2);
      expect(response.body.reservations).toHaveLength(2);
    });

    it('should filter by resourceId query param', async () => {
      const response = await request(app)
        .get('/api/reservations?resourceId=room-1')
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.reservations).toHaveLength(1);
      expect(response.body.reservations[0].resourceId).toBe('room-1');
    });

    it('should filter by status query param', async () => {
      const response = await request(app)
        .get('/api/reservations?status=active')
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.reservations).toHaveLength(1);
      expect(response.body.reservations[0].status).toBe('active');
    });

    it('should filter by multiple query params', async () => {
      const response = await request(app)
        .get('/api/reservations?resourceId=room-1&status=active')
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.reservations).toHaveLength(1);
      expect(response.body.reservations[0].resourceId).toBe('room-1');
      expect(response.body.reservations[0].status).toBe('active');
    });

    it('should return empty result for non-matching filters', async () => {
      const response = await request(app)
        .get('/api/reservations?resourceId=non-existent')
        .expect(200);

      expect(response.body.totalCount).toBe(0);
      expect(response.body.reservations).toHaveLength(0);
    });
  });
});