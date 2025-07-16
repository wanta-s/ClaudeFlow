// テスト実行ファイル
import { ReservationEditService, ReservationEditRequest } from './reservationEdit';

const runTests = async () => {
  const editService = new ReservationEditService();
  
  console.log('=== 予約編集機能テスト ===\n');

  // テスト1: 基本的な編集
  console.log('1. タイトルと日時の変更:');
  const editRequest1: ReservationEditRequest = {
    reservationId: 'res_001',
    changes: {
      title: '更新された会議',
      startDateTime: new Date('2024-01-20T14:00:00'),
      endDateTime: new Date('2024-01-20T15:30:00')
    }
  };
  
  const result1 = await editService.editReservation(editRequest1);
  console.log('成功:', result1.success);
  console.log('新しいタイトル:', result1.reservation?.title);
  console.log('新しい開始時刻:', result1.reservation?.startDateTime);
  console.log('バージョン:', result1.reservation?.version);
  console.log('');

  // テスト2: 場所とリソースの変更
  console.log('2. 場所とリソースの変更:');
  const editRequest2: ReservationEditRequest = {
    reservationId: 'res_001',
    changes: {
      location: '会議室B',
      resourceId: 'room_b'
    }
  };
  
  const result2 = await editService.editReservation(editRequest2);
  console.log('成功:', result2.success);
  console.log('新しい場所:', result2.reservation?.location);
  console.log('新しいリソースID:', result2.reservation?.resourceId);
  console.log('バージョン:', result2.reservation?.version);
  console.log('');

  // テスト3: 参加者の変更
  console.log('3. 参加者の変更:');
  const editRequest3: ReservationEditRequest = {
    reservationId: 'res_001',
    changes: {
      participants: ['user_001', 'user_003', 'user_004']
    }
  };
  
  const result3 = await editService.editReservation(editRequest3);
  console.log('成功:', result3.success);
  console.log('新しい参加者:', result3.reservation?.participants);
  console.log('');

  // テスト4: 検証機能
  console.log('4. 検証機能テスト:');
  const validation = await editService.validateEdit('res_001', {
    startDateTime: new Date('2024-01-20T16:00:00'),
    endDateTime: new Date('2024-01-20T17:00:00')
  });
  console.log('検証結果:', validation.isValid);
};

// 実行
runTests().catch(console.error);