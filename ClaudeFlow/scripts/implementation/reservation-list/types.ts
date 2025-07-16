export interface Reservation {
  id: string;
  resourceId: string;
  resourceName: string;
  startDateTime: Date;
  endDateTime: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  purpose?: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export interface ReservationListFilter {
  status?: Reservation['status'] | Reservation['status'][];
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
}

export interface SortOptions {
  field: 'startDateTime' | 'createdAt' | 'resourceName' | 'status';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ReservationListResult {
  reservations: Reservation[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ReservationRepository {
  find(
    filter: ReservationListFilter,
    sort: SortOptions,
    pagination: PaginationOptions
  ): Promise<{data: Reservation[], total: number}>;
  
  getAllResources(): Promise<Array<{id: string, name: string}>>;
}