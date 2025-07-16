import { Reservation, Resource } from './types';

export class MemoryCalendarStore {
  private reservations: Map<string, Reservation[]> = new Map();
  private resources: Map<string, Resource> = new Map();

  addReservation(dateKey: string, reservation: Reservation): void {
    const existing = this.reservations.get(dateKey) || [];
    existing.push(reservation);
    this.reservations.set(dateKey, existing);
  }

  getMonthReservations(year: number, month: number): Map<string, Reservation[]> {
    const result = new Map<string, Reservation[]>();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    for (const [dateKey, reservations] of this.reservations.entries()) {
      const date = new Date(dateKey);
      if (date >= startDate && date <= endDate) {
        result.set(dateKey, reservations);
      }
    }

    return result;
  }

  addResource(resource: Resource): void {
    this.resources.set(resource.id, resource);
  }

  getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }

  getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }
}