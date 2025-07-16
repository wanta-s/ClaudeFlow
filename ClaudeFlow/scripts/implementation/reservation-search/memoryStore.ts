// Rough level memory store

import { Reservation } from './types';

class MemoryStore {
  private data: Map<string, Reservation> = new Map();

  save(reservation: Reservation): void {
    this.data.set(reservation.id, reservation);
  }

  findById(id: string): Reservation | undefined {
    return this.data.get(id);
  }

  findAll(): Reservation[] {
    return Array.from(this.data.values());
  }

  delete(id: string): boolean {
    return this.data.delete(id);
  }

  clear(): void {
    this.data.clear();
  }

  size(): number {
    return this.data.size;
  }
}

export { MemoryStore };