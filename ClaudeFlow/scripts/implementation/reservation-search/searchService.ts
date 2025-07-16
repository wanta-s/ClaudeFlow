// Rough level search service - minimal implementation

import { ReservationSearchCriteria, Reservation, SearchResult } from './types';

class ReservationSearchService {
  private reservations: Reservation[];

  constructor(reservations: Reservation[] = []) {
    this.reservations = reservations;
  }

  async search(criteria: ReservationSearchCriteria): Promise<SearchResult> {
    let filtered = [...this.reservations];

    // Keyword search
    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      filtered = filtered.filter(r => 
        r.reservationName.toLowerCase().includes(keyword) ||
        r.description?.toLowerCase().includes(keyword) ||
        r.resourceName.toLowerCase().includes(keyword)
      );
    }

    // Date range search
    if (criteria.startDate && criteria.endDate) {
      filtered = filtered.filter(r => 
        (r.startTime >= criteria.startDate && r.startTime <= criteria.endDate) ||
        (r.endTime >= criteria.startDate && r.endTime <= criteria.endDate)
      );
    }

    // Status filter
    if (criteria.status && criteria.status.length > 0) {
      filtered = filtered.filter(r => criteria.status.includes(r.status));
    }

    // Pagination
    const limit = criteria.limit || 20;
    const offset = criteria.offset || 0;
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    const paginatedResults = filtered.slice(offset, offset + limit);

    return {
      reservations: paginatedResults,
      totalCount,
      currentPage,
      totalPages
    };
  }

  // Add reservation to the store
  addReservation(reservation: Reservation): void {
    this.reservations.push(reservation);
  }

  // Get all reservations
  getAllReservations(): Reservation[] {
    return this.reservations;
  }
}

export { ReservationSearchService };