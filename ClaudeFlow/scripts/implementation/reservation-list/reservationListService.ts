import { Reservation, ReservationListFilter, SortOptions, PaginationOptions, ReservationListResult, ReservationRepository } from './types';
import { InMemoryReservationStore } from './InMemoryReservationStore';

export class ReservationListService {
  private repository: ReservationRepository;

  constructor(repository?: ReservationRepository) {
    this.repository = repository || new InMemoryReservationStore();
  }

  async getReservations(
    filter?: ReservationListFilter,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<ReservationListResult> {
    const defaultSort: SortOptions = { field: 'startDateTime', order: 'asc' };
    const defaultPagination: PaginationOptions = { page: 1, limit: 20 };

    const actualSort = sort || defaultSort;
    const actualPagination = pagination || defaultPagination;

    const { data, total } = await this.repository.find(
      filter || {},
      actualSort,
      actualPagination
    );

    const totalPages = Math.ceil(total / actualPagination.limit);

    return {
      reservations: data,
      totalCount: total,
      page: actualPagination.page,
      totalPages,
      hasNext: actualPagination.page < totalPages,
      hasPrevious: actualPagination.page > 1
    };
  }

  async getAvailableResources(): Promise<Array<{id: string, name: string}>> {
    return this.repository.getAllResources();
  }

  getReservationStatuses(): Array<{value: Reservation['status'], label: string}> {
    return [
      { value: 'pending', label: '保留中' },
      { value: 'confirmed', label: '確定' },
      { value: 'cancelled', label: 'キャンセル' },
      { value: 'completed', label: '完了' }
    ];
  }
}