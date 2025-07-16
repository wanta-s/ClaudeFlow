import { Request, Response } from 'express';
import { ReservationService } from './service';
import { ReservationDetailResponse } from './types';

export class ReservationController {
  private service: ReservationService;

  constructor() {
    this.service = new ReservationService();
  }

  async getReservationDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    const detail = await this.service.getReservationDetail(id);
    
    if (!detail) {
      const response: ReservationDetailResponse = {
        success: false,
        error: {
          code: 'RESERVATION_NOT_FOUND',
          message: '指定された予約が見つかりません'
        }
      };
      res.status(404).json(response);
      return;
    }

    const response: ReservationDetailResponse = {
      success: true,
      data: detail
    };
    res.json(response);
  }
}