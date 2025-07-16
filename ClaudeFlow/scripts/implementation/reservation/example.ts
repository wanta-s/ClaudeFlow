import { ReservationService } from './reservationService';
import { CreateReservationRequest } from './types';

async function main() {
  const service = new ReservationService();

  // 予約作成
  const request: CreateReservationRequest = {
    title: '会議室予約',
    startDateTime: '2024-12-20T10:00:00+09:00',
    endDateTime: '2024-12-20T11:30:00+09:00',
    participants: [
      { name: '山田太郎', email: 'yamada@example.com' },
      { name: '佐藤花子', email: 'sato@example.com' }
    ]
  };

  const reservation = await service.createReservation(request);
  console.log('予約作成成功:', reservation);

  // 予約取得
  const fetched = await service.getReservation(reservation.id);
  console.log('予約取得:', fetched);

  // 全予約取得
  const all = await service.getAllReservations();
  console.log('全予約:', all);
}

main().catch(console.error);