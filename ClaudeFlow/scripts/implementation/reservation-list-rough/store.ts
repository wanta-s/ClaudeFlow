// Rough level - シンプルなインメモリストア
import { Reservation } from './types';

export class ReservationStore {
  private reservations: Map<string, Reservation> = new Map();

  // サンプルデータの初期化
  constructor() {
    const sampleData: Reservation[] = [
      {
        id: '1',
        resourceId: 'room-1',
        resourceName: '会議室A',
        startTime: new Date('2024-12-01T10:00:00'),
        endTime: new Date('2024-12-01T11:00:00'),
        status: 'active',
        createdAt: new Date('2024-11-25T10:00:00'),
        updatedAt: new Date('2024-11-25T10:00:00')
      },
      {
        id: '2',
        resourceId: 'room-2',
        resourceName: '会議室B',
        startTime: new Date('2024-12-02T14:00:00'),
        endTime: new Date('2024-12-02T15:00:00'),
        status: 'active',
        createdAt: new Date('2024-11-26T10:00:00'),
        updatedAt: new Date('2024-11-26T10:00:00')
      }
    ];
    
    sampleData.forEach(r => this.reservations.set(r.id, r));
  }

  findAll(): Reservation[] {
    return Array.from(this.reservations.values());
  }
}