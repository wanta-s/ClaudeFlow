// Rough level implementation entry point

export { ReservationSearchService } from './searchService';
export { MemoryStore } from './memoryStore';
export { ReservationSearchCriteria, Reservation, SearchResult } from './types';

// Example usage
import { ReservationSearchService } from './searchService';
import { MemoryStore } from './memoryStore';
import { Reservation } from './types';

// Create sample data
const createSampleReservations = (): Reservation[] => {
  return [
    {
      id: 'res_001',
      resourceId: 'room_001',
      resourceName: '会議室A',
      reservationName: '週次ミーティング',
      description: '開発チーム定例会議',
      startTime: new Date('2024-01-15T10:00:00'),
      endTime: new Date('2024-01-15T11:00:00'),
      status: 'confirmed',
      createdAt: new Date('2024-01-10T09:00:00'),
      updatedAt: new Date('2024-01-10T09:00:00')
    },
    {
      id: 'res_002',
      resourceId: 'room_002',
      resourceName: '会議室B',
      reservationName: 'プロジェクトレビュー',
      description: '四半期レビューミーティング',
      startTime: new Date('2024-01-16T14:00:00'),
      endTime: new Date('2024-01-16T15:30:00'),
      status: 'pending',
      createdAt: new Date('2024-01-11T10:00:00'),
      updatedAt: new Date('2024-01-11T10:00:00')
    },
    {
      id: 'res_003',
      resourceId: 'room_001',
      resourceName: '会議室A',
      reservationName: '新人研修',
      description: 'オリエンテーション',
      startTime: new Date('2024-01-17T09:00:00'),
      endTime: new Date('2024-01-17T17:00:00'),
      status: 'confirmed',
      createdAt: new Date('2024-01-12T11:00:00'),
      updatedAt: new Date('2024-01-12T11:00:00')
    }
  ];
};

// Example function
export const runExample = async () => {
  const searchService = new ReservationSearchService(createSampleReservations());

  // Search by keyword
  const keywordResult = await searchService.search({ keyword: '会議室A' });
  console.log('Keyword search results:', keywordResult.totalCount);

  // Search by date range
  const dateResult = await searchService.search({
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-16')
  });
  console.log('Date range search results:', dateResult.totalCount);

  // Search by status
  const statusResult = await searchService.search({
    status: ['confirmed']
  });
  console.log('Status search results:', statusResult.totalCount);

  // Combined search
  const combinedResult = await searchService.search({
    keyword: 'ミーティング',
    status: ['confirmed', 'pending'],
    limit: 10,
    offset: 0
  });
  console.log('Combined search results:', combinedResult);
};