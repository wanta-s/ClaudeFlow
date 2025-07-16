import { ReservationService } from './reservationService';

async function testReservationService() {
  const service = new ReservationService();

  // Test 1: Create reservation
  const request = {
    userId: 'user123',
    resourceId: 'room101',
    startTime: new Date('2024-01-20T10:00:00'),
    endTime: new Date('2024-01-20T11:00:00')
  };

  const reservation = await service.createReservation(request);
  console.log('Created reservation:', reservation);

  // Test 2: Get reservation by ID
  const found = await service.getReservation(reservation.id);
  console.log('Found reservation:', found);

  // Test 3: Get user reservations
  const userReservations = await service.getUserReservations('user123');
  console.log('User reservations:', userReservations);

  // Test 4: Get resource reservations
  const resourceReservations = await service.getResourceReservations('room101');
  console.log('Resource reservations:', resourceReservations);
}

// Run tests
testReservationService().catch(console.error);