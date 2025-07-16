import { ReservationEditService } from './reservationEdit';

describe('ReservationEditService', () => {
  let service: ReservationEditService;

  beforeEach(() => {
    service = new ReservationEditService();
  });

  test('should edit reservation successfully', () => {
    const result = service.editReservation('1', {
      date: '2024-12-25',
      customerName: 'Updated Name'
    });

    expect(result.success).toBe(true);
    expect(result.updatedReservation).toBeDefined();
    expect(result.updatedReservation?.date).toBe('2024-12-25');
    expect(result.updatedReservation?.customerName).toBe('Updated Name');
  });

  test('should preserve unchanged fields', () => {
    const result = service.editReservation('1', {
      customerName: 'New Name Only'
    });

    expect(result.success).toBe(true);
    expect(result.updatedReservation?.customerName).toBe('New Name Only');
    expect(result.updatedReservation?.date).toBe('2024-12-20');
    expect(result.updatedReservation?.status).toBe('confirmed');
  });

  test('should update multiple fields', () => {
    const result = service.editReservation('2', {
      date: '2024-12-26',
      customerName: 'Different Customer',
      status: 'pending'
    });

    expect(result.success).toBe(true);
    expect(result.updatedReservation?.date).toBe('2024-12-26');
    expect(result.updatedReservation?.customerName).toBe('Different Customer');
    expect(result.updatedReservation?.status).toBe('pending');
  });

  test('should handle empty update request', () => {
    const result = service.editReservation('1', {});

    expect(result.success).toBe(true);
    expect(result.updatedReservation?.id).toBe('1');
    expect(result.updatedReservation?.customerName).toBe('John Doe');
  });
});