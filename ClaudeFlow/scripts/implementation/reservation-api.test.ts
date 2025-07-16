import request from 'supertest';
import express from 'express';
import { ReservationService } from './reservation-detail';

// モックの設定
jest.mock('./reservation-detail');

describe('Reservation API Tests', () => {
  let app: express.Application;
  let mockReservationService: jest.Mocked<ReservationService>;

  beforeEach(() => {
    // Expressアプリの設定
    app = express();
    
    // モックサービスの設定
    mockReservationService = new ReservationService() as jest.Mocked<ReservationService>;
    
    // APIエンドポイントの設定
    app.get('/api/reservations/:id', (req, res) => {
      const { id } = req.params;
      const reservation = mockReservationService.getReservationDetail(id);
      
      if (!reservation) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }
      
      res.json(reservation);
    });
  });

  it('should return reservation detail for valid id', async () => {
    const mockReservation = {
      id: '1',
      userId: 'user1',
      restaurantName: 'レストランA',
      date: new Date('2024-01-01'),
      time: '19:00',
      numberOfGuests: 2,
      status: 'confirmed'
    };

    mockReservationService.getReservationDetail.mockReturnValue(mockReservation);

    const response = await request(app)
      .get('/api/reservations/1')
      .expect(200);

    expect(response.body.id).toBe('1');
    expect(response.body.restaurantName).toBe('レストランA');
    expect(mockReservationService.getReservationDetail).toHaveBeenCalledWith('1');
  });

  it('should return 404 for non-existent reservation', async () => {
    mockReservationService.getReservationDetail.mockReturnValue(undefined);

    const response = await request(app)
      .get('/api/reservations/999')
      .expect(404);

    expect(response.body.error).toBe('Reservation not found');
    expect(mockReservationService.getReservationDetail).toHaveBeenCalledWith('999');
  });
});