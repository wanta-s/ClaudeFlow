import { Reservation, CreateReservationData } from './types';
import { MemoryReservationRepository } from './repository';

class ReservationService {
  constructor(private repository: MemoryReservationRepository) {}

  async createReservation(data: CreateReservationData): Promise<Reservation> {
    const conflicts = await this.repository.findConflicts(
      data.resourceId,
      data.reservationDate,
      data.startTime,
      data.endTime
    );
    
    if (conflicts.length > 0) {
      throw new Error('Time slot is already reserved');
    }

    const reservation: Reservation = {
      id: Math.random().toString(36).substring(7),
      title: data.title,
      reservationDate: data.reservationDate,
      startTime: data.startTime,
      endTime: data.endTime,
      resourceId: data.resourceId,
      creatorName: data.creatorName,
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.repository.save(reservation);
  }

  async checkAvailability(
    resourceId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const conflicts = await this.repository.findConflicts(
      resourceId,
      date,
      startTime,
      endTime
    );
    
    return conflicts.length === 0;
  }
}

export { ReservationService };