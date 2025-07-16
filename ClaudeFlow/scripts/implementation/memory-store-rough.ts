import { Reservation } from './reservation-delete-types-rough';

// シンプルなメモリストア
export class MemoryStore {
  private reservations: Map<string, Reservation> = new Map();

  async findById(id: string): Promise<Reservation | null> {
    return this.reservations.get(id) || null;
  }

  async update(id: string, data: any): Promise<boolean> {
    const reservation = this.reservations.get(id);
    if (!reservation) return false;
    
    Object.assign(reservation, data);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.reservations.delete(id);
  }

  async findByIds(ids: string[]): Promise<Reservation[]> {
    return ids.map(id => this.reservations.get(id)).filter(r => r) as Reservation[];
  }

  // テスト用にデータを追加
  addReservation(reservation: Reservation): void {
    this.reservations.set(reservation.id, reservation);
  }
}