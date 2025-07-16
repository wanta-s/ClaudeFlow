// Rough level types - minimal definitions only

interface ReservationSearchCriteria {
  keyword?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string[];
  limit?: number;
  offset?: number;
}

interface Reservation {
  id: string;
  resourceId: string;
  resourceName: string;
  reservationName: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResult {
  reservations: Reservation[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export { ReservationSearchCriteria, Reservation, SearchResult };