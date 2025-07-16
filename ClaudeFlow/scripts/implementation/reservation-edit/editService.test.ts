import { ReservationEditService } from './editService';
import { ReservationDataStore, Reservation } from './types';

// Mock implementation of ReservationDataStore
class MockDataStore implements ReservationDataStore {
  private reservations: Map<string, Reservation> = new Map();

  async findById(id: string): Promise<Reservation | null> {
    return this.reservations.get(id) || null;
  }

  async update(id: string, data: Partial<Reservation>, version: number): Promise<boolean> {
    const existing = this.reservations.get(id);
    if (!existing || existing.version !== version) {
      return false;
    }

    const updated: Reservation = {
      ...existing,
      ...data,
      updatedAt: new Date(),
      version: existing.version + 1
    };

    this.reservations.set(id, updated);
    return true;
  }

  async findConflictingReservations(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<Reservation[]> {
    return [];
  }

  // Helper method for tests
  addReservation(reservation: Reservation): void {
    this.reservations.set(reservation.id, reservation);
  }
}

describe('ReservationEditService', () => {
  let service: ReservationEditService;
  let dataStore: MockDataStore;

  beforeEach(() => {
    dataStore = new MockDataStore();
    service = new ReservationEditService(dataStore);
  });

  const createTestReservation = (): Reservation => ({
    id: 'test-id',
    title: 'Test Reservation',
    description: 'Test description',
    startDateTime: new Date('2024-01-01T10:00:00'),
    endDateTime: new Date('2024-01-01T12:00:00'),
    location: 'Test Location',
    participants: ['user1', 'user2'],
    resourceId: 'resource-1',
    createdAt: new Date('2024-01-01T00:00:00'),
    updatedAt: new Date('2024-01-01T00:00:00'),
    createdBy: 'test-user',
    status: 'active',
    version: 1
  });

  test('should update reservation title successfully', async () => {
    const reservation = createTestReservation();
    dataStore.addReservation(reservation);

    const result = await service.updateReservation({
      id: 'test-id',
      title: 'Updated Title'
    });

    expect(result.success).toBe(true);
    expect(result.reservation?.title).toBe('Updated Title');
  });

  test('should update multiple fields successfully', async () => {
    const reservation = createTestReservation();
    dataStore.addReservation(reservation);

    const result = await service.updateReservation({
      id: 'test-id',
      title: 'New Title',
      location: 'New Location',
      participants: ['user3', 'user4']
    });

    expect(result.success).toBe(true);
    expect(result.reservation?.title).toBe('New Title');
    expect(result.reservation?.location).toBe('New Location');
    expect(result.reservation?.participants).toEqual(['user3', 'user4']);
  });

  test('should return error when reservation not found', async () => {
    const result = await service.updateReservation({
      id: 'non-existent',
      title: 'New Title'
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('RESERVATION_NOT_FOUND');
  });

  test('should get reservation for edit', async () => {
    const reservation = createTestReservation();
    dataStore.addReservation(reservation);

    const result = await service.getReservationForEdit('test-id');

    expect(result).toEqual(reservation);
  });

  test('should return null when getting non-existent reservation', async () => {
    const result = await service.getReservationForEdit('non-existent');

    expect(result).toBeNull();
  });
});