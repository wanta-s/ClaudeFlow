import { ReservationDeleteService } from './reservation-delete-service-rough';
import { MemoryStore } from './memory-store-rough';

// 使用例
async function example() {
  // ストアとサービスの初期化
  const store = new MemoryStore();
  const deleteService = new ReservationDeleteService(store);

  // テストデータの追加
  store.addReservation({
    id: '1',
    resourceId: 'room-1',
    startTime: new Date('2024-12-25 10:00'),
    endTime: new Date('2024-12-25 11:00'),
    status: 'active'
  });

  store.addReservation({
    id: '2',
    resourceId: 'room-2',
    startTime: new Date('2024-12-26 14:00'),
    endTime: new Date('2024-12-26 15:00'),
    status: 'active'
  });

  // 予約のキャンセル
  const cancelResult = await deleteService.cancelReservation('1');
  console.log('Cancel result:', cancelResult);

  // 予約の削除
  const deleteResult = await deleteService.deleteReservation('2');
  console.log('Delete result:', deleteResult);

  // 複数予約の削除
  const bulkResult = await deleteService.bulkDeleteReservations(['1', '2', '3']);
  console.log('Bulk delete result:', bulkResult);

  // 予約の復元
  const restoreResult = await deleteService.restoreReservation('1');
  console.log('Restore result:', restoreResult);
}

// 実行
example();