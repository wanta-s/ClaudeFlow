// Rough implementation - Demo

const { DailyReservationService, formatDate } = require('./index');

// サービスインスタンス作成
const service = new DailyReservationService();

// 本日の予約を取得
const today = formatDate(new Date());
console.log('本日の予約:', today);
console.log(service.getDailyReservations(today));

// 特定日の予約を取得
console.log('\n2024-01-20の予約:');
const result = service.getDailyReservations('2024-01-20');
console.log(result);

// 個別の予約を取得
console.log('\n予約ID: 1の詳細:');
const reservation = service.getReservationById('1');
console.log(reservation);