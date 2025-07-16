// Rough level - 最小限の機能実装
import { Reservation, ReservationFilter, ReservationListResult } from './types';
import { ReservationStore } from './store';

export class ReservationListService {
  private store: ReservationStore;

  constructor() {
    this.store = new ReservationStore();
  }

  getReservations(filter?: ReservationFilter): ReservationListResult {
    let reservations = this.store.findAll();

    // シンプルなフィルタリング
    if (filter) {
      reservations = reservations.filter(r => {
        if (filter.resourceId && r.resourceId !== filter.resourceId) {
          return false;
        }
        if (filter.status && r.status !== filter.status) {
          return false;
        }
        return true;
      });
    }

    return {
      reservations,
      totalCount: reservations.length
    };
  }
}