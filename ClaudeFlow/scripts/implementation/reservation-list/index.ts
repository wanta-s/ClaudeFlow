export * from './types';
export { InMemoryReservationStore } from './store';
export { ReservationListService } from './reservationListService';

// 使用例
import { InMemoryReservationStore } from './store';
import { ReservationListService } from './reservationListService';

export function createReservationListService() {
  const store = new InMemoryReservationStore();
  return new ReservationListService(store);
}

// サンプルデータの生成
export function generateSampleReservations(count: number) {
  const reservations = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    reservations.push({
      id: `res-${i + 1}`,
      userId: `user-${(i % 3) + 1}`,
      title: `予約 ${i + 1}`,
      date: date,
      startTime: '10:00',
      endTime: '11:00',
      status: ['pending', 'confirmed', 'cancelled'][i % 3] as any,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  return reservations;
}