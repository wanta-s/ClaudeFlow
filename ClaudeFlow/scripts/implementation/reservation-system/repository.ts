import { Reservation } from './types';

class MemoryReservationRepository {
  private storage: Map<string, Reservation> = new Map();

  async save(reservation: Reservation): Promise<Reservation> {
    this.storage.set(reservation.id, reservation);
    return reservation;
  }

  async findById(id: string): Promise<Reservation | null> {
    return this.storage.get(id) || null;
  }

  async findConflicts(
    resourceId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<Reservation[]> {
    const conflicts: Reservation[] = [];
    
    for (const reservation of this.storage.values()) {
      if (
        reservation.resourceId === resourceId &&
        reservation.reservationDate === date &&
        reservation.status === 'confirmed'
      ) {
        const resStart = reservation.startTime;
        const resEnd = reservation.endTime;
        
        if (
          (startTime >= resStart && startTime < resEnd) ||
          (endTime > resStart && endTime <= resEnd) ||
          (startTime <= resStart && endTime >= resEnd)
        ) {
          conflicts.push(reservation);
        }
      }
    }
    
    return conflicts;
  }
}

export { MemoryReservationRepository };