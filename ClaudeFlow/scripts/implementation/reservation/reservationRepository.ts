import { Reservation } from './types';

export class ReservationRepository {
  private reservations: Map<string, Reservation> = new Map();

  async create(reservation: Reservation): Promise<Reservation> {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  async findById(id: string): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async findByUserId(userId: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(r => r.userId === userId);
  }

  async findByResourceId(resourceId: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(r => r.resourceId === resourceId);
  }
}