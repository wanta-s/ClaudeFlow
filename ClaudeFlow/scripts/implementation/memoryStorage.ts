// Rough level implementation - minimal memory storage

import { StorageAdapter, ReservationDetail } from './reservationDetailService';

class MemoryStorage implements StorageAdapter {
  private data = new Map<string, ReservationDetail>();

  constructor() {
    // Add sample data
    this.data.set('test-123', {
      id: 'test-123',
      title: 'Sample Reservation',
      date: '2024-01-15',
      startTime: '10:00',
      endTime: '11:00',
      status: 'confirmed',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });
  }

  async get(id: string): Promise<ReservationDetail> {
    return this.data.get(id) as ReservationDetail;
  }

  async exists(id: string): Promise<boolean> {
    return this.data.has(id);
  }
}

export { MemoryStorage };