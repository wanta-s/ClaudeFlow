import { ReservationDeleteService } from './reservation-delete-service-rough';
import { MemoryStore } from './memory-store-rough';

// 簡易テスト
async function test() {
  const store = new MemoryStore();
  const service = new ReservationDeleteService(store);

  // テストデータ
  store.addReservation({
    id: 'test-1',
    resourceId: 'resource-1',
    startTime: new Date('2024-12-30 10:00'),
    endTime: new Date('2024-12-30 11:00'),
    status: 'active'
  });

  // キャンセルテスト
  const cancelResult = await service.cancelReservation('test-1');
  console.log('✓ Cancel test:', cancelResult.success === true);

  // 削除テスト
  const deleteResult = await service.deleteReservation('test-1');
  console.log('✓ Delete test:', deleteResult.success === true);

  // 存在しない予約の削除テスト
  const notFoundResult = await service.deleteReservation('not-exists');
  console.log('✓ Not found test:', notFoundResult.success === false);

  // 一括削除テスト
  store.addReservation({
    id: 'bulk-1',
    resourceId: 'resource-2',
    startTime: new Date(),
    endTime: new Date(),
    status: 'active'
  });
  store.addReservation({
    id: 'bulk-2',
    resourceId: 'resource-3',
    startTime: new Date(),
    endTime: new Date(),
    status: 'active'
  });

  const bulkResult = await service.bulkDeleteReservations(['bulk-1', 'bulk-2', 'bulk-3']);
  console.log('✓ Bulk delete test:', bulkResult.successful.length === 2 && bulkResult.failed.length === 1);
}

test();