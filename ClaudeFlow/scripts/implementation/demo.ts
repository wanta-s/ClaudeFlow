import { ReservationDetailController } from './reservationDetailView';

async function demo() {
  const controller = new ReservationDetailController();
  
  console.log('予約詳細表示デモ');
  console.log('================\n');
  
  // 存在する予約ID
  const reservationId1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const reservationId2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  
  console.log('--- 予約1の詳細表示 ---');
  await controller.loadReservationDetail(reservationId1);
  
  console.log('\n\n--- 予約2の詳細表示 ---');
  await controller.loadReservationDetail(reservationId2);
}

demo().catch(console.error);