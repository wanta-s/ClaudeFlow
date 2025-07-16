import { Reservation } from './types';

export class InMemoryReservationStore {
  private reservations: Map<string, Reservation> = new Map();

  async findAll(): Promise<Reservation[]> {
    return Array.from(this.reservations.values());
  }

  async findByUserId(userId: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values())
      .filter(r => r.userId === userId);
  }

  async save(reservation: Reservation): Promise<void> {
    this.reservations.set(reservation.id, reservation);
  }

  async delete(id: string): Promise<void> {
    this.reservations.delete(id);
  }

  async findById(id: string): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  clear(): void {
    this.reservations.clear();
  }
}