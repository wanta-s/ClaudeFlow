import { Reservation, CreateReservationRequest, Participant } from './types';
import { InMemoryReservationStorage } from './storage';

export class ReservationService {
  private storage: InMemoryReservationStorage;

  constructor() {
    this.storage = new InMemoryReservationStorage();
  }

  async createReservation(request: CreateReservationRequest): Promise<Reservation> {
    const reservation: Reservation = {
      id: this.generateId(),
      title: request.title,
      startDateTime: new Date(request.startDateTime),
      endDateTime: new Date(request.endDateTime),
      participants: request.participants.map(p => ({
        name: p.name,
        email: p.email
      }))
    };

    return await this.storage.save(reservation);
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    return await this.storage.findById(id);
  }

  async getAllReservations(): Promise<Reservation[]> {
    return await this.storage.findAll();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}