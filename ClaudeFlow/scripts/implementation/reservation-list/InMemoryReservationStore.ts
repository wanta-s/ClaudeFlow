import { Reservation, ReservationListFilter, SortOptions, PaginationOptions, ReservationRepository } from './types';

export class InMemoryReservationStore implements ReservationRepository {
  private reservations: Map<string, Reservation> = new Map();
  private resources: Map<string, {id: string, name: string}> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // サンプルリソース
    this.resources.set('resource1', { id: 'resource1', name: '会議室A' });
    this.resources.set('resource2', { id: 'resource2', name: '会議室B' });
    this.resources.set('resource3', { id: 'resource3', name: 'ラウンジ' });

    // サンプル予約
    const now = new Date();
    const sampleReservations: Reservation[] = [
      {
        id: '1',
        resourceId: 'resource1',
        resourceName: '会議室A',
        startDateTime: new Date(now.getTime() + 86400000),
        endDateTime: new Date(now.getTime() + 90000000),
        status: 'confirmed',
        purpose: '部門会議',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        resourceId: 'resource2',
        resourceName: '会議室B',
        startDateTime: new Date(now.getTime() + 172800000),
        endDateTime: new Date(now.getTime() + 176400000),
        status: 'pending',
        purpose: 'クライアント商談',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        resourceId: 'resource1',
        resourceName: '会議室A',
        startDateTime: new Date(now.getTime() - 86400000),
        endDateTime: new Date(now.getTime() - 82800000),
        status: 'completed',
        purpose: '定例ミーティング',
        createdAt: new Date(now.getTime() - 172800000),
        updatedAt: new Date(now.getTime() - 86400000),
      },
    ];

    sampleReservations.forEach(r => this.reservations.set(r.id, r));
  }

  async find(
    filter: ReservationListFilter,
    sort: SortOptions,
    pagination: PaginationOptions
  ): Promise<{data: Reservation[], total: number}> {
    let reservations = Array.from(this.reservations.values());

    // フィルタリング
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      reservations = reservations.filter(r => statuses.includes(r.status));
    }

    if (filter.resourceId) {
      reservations = reservations.filter(r => r.resourceId === filter.resourceId);
    }

    if (filter.startDate) {
      reservations = reservations.filter(r => r.startDateTime >= filter.startDate!);
    }

    if (filter.endDate) {
      reservations = reservations.filter(r => r.endDateTime <= filter.endDate!);
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      reservations = reservations.filter(r => 
        r.resourceName.toLowerCase().includes(searchLower) ||
        (r.purpose && r.purpose.toLowerCase().includes(searchLower))
      );
    }

    const total = reservations.length;

    // ソート
    reservations.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sort.field) {
        case 'startDateTime':
          aVal = a.startDateTime.getTime();
          bVal = b.startDateTime.getTime();
          break;
        case 'createdAt':
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
        case 'resourceName':
          aVal = a.resourceName;
          bVal = b.resourceName;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
      }

      if (sort.order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // ページネーション
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginatedData = reservations.slice(start, end);

    return { data: paginatedData, total };
  }

  async getAllResources(): Promise<Array<{id: string, name: string}>> {
    return Array.from(this.resources.values());
  }
}