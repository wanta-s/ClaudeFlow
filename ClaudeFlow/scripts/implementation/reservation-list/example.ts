import { ReservationListService } from './reservationListService';

async function main() {
  const service = new ReservationListService();

  console.log('=== 全件取得 ===');
  const allReservations = await service.getReservations();
  console.log('総件数:', allReservations.totalCount);
  console.log('予約一覧:', allReservations.reservations);

  console.log('\n=== ステータスでフィルタリング ===');
  const confirmedReservations = await service.getReservations(
    { status: 'confirmed' },
    { field: 'startDateTime', order: 'asc' },
    { page: 1, limit: 20 }
  );
  console.log('確定済み予約:', confirmedReservations.reservations);

  console.log('\n=== 日付範囲でフィルタリング ===');
  const weekReservations = await service.getReservations({
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-07')
  });
  console.log('期間内予約:', weekReservations.reservations);

  console.log('\n=== テキスト検索 ===');
  const searchResults = await service.getReservations({
    searchText: '会議室'
  });
  console.log('検索結果:', searchResults.reservations);

  console.log('\n=== 利用可能なリソース一覧 ===');
  const resources = await service.getAvailableResources();
  console.log('リソース:', resources);

  console.log('\n=== 予約ステータス一覧 ===');
  const statuses = service.getReservationStatuses();
  console.log('ステータス:', statuses);

  console.log('\n=== ページネーション確認 ===');
  const page2 = await service.getReservations(
    {},
    { field: 'createdAt', order: 'desc' },
    { page: 2, limit: 1 }
  );
  console.log('2ページ目:', {
    page: page2.page,
    totalPages: page2.totalPages,
    hasNext: page2.hasNext,
    hasPrevious: page2.hasPrevious,
    items: page2.reservations
  });
}

main().catch(console.error);