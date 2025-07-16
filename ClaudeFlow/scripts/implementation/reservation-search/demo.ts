// Rough level demo

import { ReservationSearchService } from './searchService';
import { Reservation } from './types';

// Demo data
const demoReservations: Reservation[] = [
  {
    id: 'demo_001',
    resourceId: 'conf_room_1',
    resourceName: 'Conference Room 1',
    reservationName: 'Team Standup',
    description: 'Daily team standup meeting',
    startTime: new Date('2024-01-20T09:00:00'),
    endTime: new Date('2024-01-20T09:30:00'),
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'demo_002',
    resourceId: 'conf_room_2',
    resourceName: 'Conference Room 2',
    reservationName: 'Client Meeting',
    description: 'Important client presentation',
    startTime: new Date('2024-01-20T14:00:00'),
    endTime: new Date('2024-01-20T16:00:00'),
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'demo_003',
    resourceId: 'conf_room_1',
    resourceName: 'Conference Room 1',
    reservationName: 'Sprint Planning',
    description: 'Sprint planning session',
    startTime: new Date('2024-01-21T10:00:00'),
    endTime: new Date('2024-01-21T12:00:00'),
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const runDemo = async () => {
  console.log('=== Reservation Search Service Demo (Rough Level) ===\n');

  const searchService = new ReservationSearchService(demoReservations);

  // Test 1: Search by keyword
  console.log('1. Searching for "meeting"...');
  const result1 = await searchService.search({ keyword: 'meeting' });
  console.log(`Found ${result1.totalCount} results`);
  result1.reservations.forEach(r => {
    console.log(`  - ${r.reservationName} in ${r.resourceName}`);
  });

  // Test 2: Search by date range
  console.log('\n2. Searching for reservations on Jan 20...');
  const result2 = await searchService.search({
    startDate: new Date('2024-01-20T00:00:00'),
    endDate: new Date('2024-01-20T23:59:59')
  });
  console.log(`Found ${result2.totalCount} results`);
  result2.reservations.forEach(r => {
    console.log(`  - ${r.reservationName} at ${r.startTime.toLocaleTimeString()}`);
  });

  // Test 3: Search by status
  console.log('\n3. Searching for confirmed reservations...');
  const result3 = await searchService.search({ status: ['confirmed'] });
  console.log(`Found ${result3.totalCount} results`);
  result3.reservations.forEach(r => {
    console.log(`  - ${r.reservationName} (${r.status})`);
  });

  // Test 4: Pagination
  console.log('\n4. Testing pagination (limit=1, offset=1)...');
  const result4 = await searchService.search({ limit: 1, offset: 1 });
  console.log(`Page ${result4.currentPage} of ${result4.totalPages}`);
  console.log(`Showing ${result4.reservations.length} of ${result4.totalCount} total`);
};

// Run demo if called directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };