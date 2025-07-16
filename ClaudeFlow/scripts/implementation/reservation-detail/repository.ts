import { ReservationDetail } from './types';

const reservations = new Map<string, any>();
const resources = new Map<string, any>();

reservations.set('1', {
  id: '1',
  resourceId: 'res1',
  userId: 'user1',
  startTime: '2024-01-20T10:00:00Z',
  endTime: '2024-01-20T11:00:00Z',
  status: 'confirmed',
  purpose: '会議',
  notes: 'プロジェクトミーティング',
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt: '2024-01-15T09:00:00Z'
});

resources.set('res1', {
  id: 'res1',
  name: '会議室A'
});

export class ReservationRepository {
  async findDetailById(id: string): Promise<ReservationDetail | null> {
    const reservation = reservations.get(id);
    if (!reservation) return null;
    
    const resource = resources.get(reservation.resourceId);
    return {
      ...reservation,
      resourceName: resource?.name || 'Unknown',
      userName: 'Guest User'
    };
  }
}