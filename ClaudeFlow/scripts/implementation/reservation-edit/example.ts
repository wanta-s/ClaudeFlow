import { InMemoryReservationStore } from './inMemoryStore';
import { ReservationEditService } from './editService';
import { Reservation, ReservationUpdateRequest } from './types';

async function example() {
  const dataStore = new InMemoryReservationStore();
  const editService = new ReservationEditService(dataStore);

  const sampleReservation: Reservation = {
    id: 'reservation-123',
    title: '会議室予約',
    description: '定例会議',
    startDateTime: new Date('2025-02-01T10:00:00'),
    endDateTime: new Date('2025-02-01T11:00:00'),
    location: '会議室A',
    participants: ['user1@example.com', 'user2@example.com'],
    resourceId: 'room-a',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1',
    status: 'active',
    version: 1
  };

  dataStore.addReservation(sampleReservation);

  const updateRequest: ReservationUpdateRequest = {
    id: 'reservation-123',
    title: '更新されたミーティング',
    endDateTime: new Date('2025-02-01T12:00:00'),
    participants: ['user1@example.com', 'user2@example.com', 'user3@example.com']
  };

  const result = await editService.updateReservation(updateRequest);

  if (result.success) {
    console.log('予約が更新されました:', result.reservation);
  } else {
    console.error('エラー:', result.error);
  }
}

example();