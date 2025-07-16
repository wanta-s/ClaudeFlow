import { Reservation, ReservationDataStore } from './types';

export class InMemoryReservationStore implements ReservationDataStore {
  private reservations: Map<string, Reservation> = new Map();

  async findById(id: string): Promise<Reservation | null> {
    return this.reservations.get(id) || null;
  }

  async update(id: string, data: Partial<Reservation>, version: number): Promise<boolean> {
    const existing = this.reservations.get(id);
    if (!existing) return false;
    if (existing.version !== version) return false;

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date(),
      version: existing.version + 1
    };
    
    this.reservations.set(id, updated);
    return true;
  }

  async findConflictingReservations(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<Reservation[]> {
    const conflicts: Reservation[] = [];
    
    for (const [id, reservation] of this.reservations) {
      if (id === excludeId) continue;
      if (reservation.resourceId !== resourceId) continue;
      if (reservation.status !== 'active') continue;
      
      const hasOverlap = 
        (startTime < reservation.endDateTime && endTime > reservation.startDateTime);
      
      if (hasOverlap) {
        conflicts.push(reservation);
      }
    }
    
    return conflicts;
  }

  addReservation(reservation: Reservation): void {
    this.reservations.set(reservation.id, reservation);
  }
}