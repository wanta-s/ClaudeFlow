import { Reservation } from './types';

export class InMemoryReservationStorage {
  private reservations: Map<string, Reservation> = new Map();

  async save(reservation: Reservation): Promise<Reservation> {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  async findById(id: string): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async findAll(): Promise<Reservation[]> {
    return Array.from(this.reservations.values());
  }
}