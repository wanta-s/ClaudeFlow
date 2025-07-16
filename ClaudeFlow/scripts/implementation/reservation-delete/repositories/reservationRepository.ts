import { Reservation } from '../interfaces/reservation';

// Rough implementation - memory store
class ReservationRepository {
  private reservations: Map<string, Reservation> = new Map();

  constructor() {
    // Add some test data
    this.reservations.set('1', { id: '1', status: 'confirmed' });
    this.reservations.set('2', { id: '2', status: 'pending' });
  }

  findById(id: string): Reservation | undefined {
    return this.reservations.get(id);
  }

  delete(id: string): boolean {
    const reservation = this.reservations.get(id);
    if (reservation) {
      reservation.status = 'cancelled';
      reservation.deletedAt = new Date();
      return true;
    }
    return false;
  }

  deleteMultiple(ids: string[]): string[] {
    const deleted: string[] = [];
    ids.forEach(id => {
      if (this.delete(id)) {
        deleted.push(id);
      }
    });
    return deleted;
  }
}

export const reservationRepository = new ReservationRepository();