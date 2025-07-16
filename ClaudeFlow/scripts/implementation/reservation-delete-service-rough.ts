import { DeleteResult, BulkDeleteResult, RestoreResult } from './reservation-delete-types-rough';
import { MemoryStore } from './memory-store-rough';

export class ReservationDeleteService {
  constructor(private dataStore: MemoryStore) {}

  // 予約をキャンセル（ソフトデリート）
  async cancelReservation(reservationId: string): Promise<DeleteResult> {
    const reservation = await this.dataStore.findById(reservationId);
    
    // 予約が存在しない場合
    if (!reservation) {
      return { success: false };
    }

    // ソフトデリート実行
    await this.dataStore.update(reservationId, {
      status: 'cancelled',
      deletedAt: new Date()
    });

    return {
      success: true,
      deletedId: reservationId
    };
  }

  // 予約を完全に削除（ハードデリート）
  async deleteReservation(reservationId: string, force?: boolean): Promise<DeleteResult> {
    const reservation = await this.dataStore.findById(reservationId);
    
    if (!reservation) {
      return { success: false };
    }

    // 物理削除
    await this.dataStore.delete(reservationId);

    return {
      success: true,
      deletedId: reservationId
    };
  }

  // 複数予約の一括削除
  async bulkDeleteReservations(reservationIds: string[]): Promise<BulkDeleteResult> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const id of reservationIds) {
      const result = await this.deleteReservation(id);
      if (result.success) {
        successful.push(id);
      } else {
        failed.push(id);
      }
    }

    return { successful, failed };
  }

  // 削除済み予約の復元
  async restoreReservation(reservationId: string): Promise<RestoreResult> {
    const reservation = await this.dataStore.findById(reservationId);
    
    if (!reservation) {
      return { success: false };
    }

    // ステータスを復元
    await this.dataStore.update(reservationId, {
      status: 'active',
      deletedAt: null
    });

    return {
      success: true,
      restoredId: reservationId
    };
  }
}