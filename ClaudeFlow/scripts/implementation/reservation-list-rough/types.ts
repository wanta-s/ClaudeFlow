// Rough level - 最小限の型定義
export interface Reservation {
  id: string;
  resourceId: string;
  resourceName: string;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationFilter {
  resourceId?: string;
  status?: Reservation['status'];
}

export interface ReservationListResult {
  reservations: Reservation[];
  totalCount: number;
}