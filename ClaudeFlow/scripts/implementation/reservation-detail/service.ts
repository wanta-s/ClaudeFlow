import { ReservationDetail } from './types';
import { ReservationRepository } from './repository';

export class ReservationService {
  private repository: ReservationRepository;

  constructor() {
    this.repository = new ReservationRepository();
  }

  async getReservationDetail(reservationId: string): Promise<ReservationDetail | null> {
    return await this.repository.findDetailById(reservationId);
  }
}