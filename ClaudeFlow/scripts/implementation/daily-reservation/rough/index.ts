// Rough implementation - 日別予約表示機能

// 最小限の型定義
interface Reservation {
  id: string;
  date: string;
  time: string;
  resourceName: string;
  resourceId: string;
  purpose: string;
  status: string;
}

// シンプルなサービス実装
class DailyReservationService {
  private data: Map<string, Reservation>;

  constructor() {
    this.data = new Map();
    this.initialize();
  }

  // サンプルデータ投入
  initialize() {
    const sampleData = [
      {
        id: '1',
        date: '2024-01-20',
        time: '10:00',
        resourceName: '会議室A',
        resourceId: 'room-a',
        purpose: 'ミーティング',
        status: 'confirmed'
      },
      {
        id: '2',
        date: '2024-01-20',
        time: '14:00',
        resourceName: '会議室B',
        resourceId: 'room-b',
        purpose: '打ち合わせ',
        status: 'confirmed'
      }
    ];

    sampleData.forEach(item => {
      this.data.set(item.id, item);
    });
  }

  // 指定日の予約取得
  getDailyReservations(date: string) {
    const reservations = [];
    this.data.forEach(reservation => {
      if (reservation.date === date) {
        reservations.push(reservation);
      }
    });

    return {
      date: date,
      reservations: reservations.sort((a, b) => a.time.localeCompare(b.time)),
      totalCount: reservations.length
    };
  }

  // ID指定で予約取得
  getReservationById(id: string) {
    return this.data.get(id) || null;
  }
}

// ユーティリティ関数
function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 使用例
const service = new DailyReservationService();
const todayStr = formatDate(new Date());
const result = service.getDailyReservations('2024-01-20');
console.log(result);

export { DailyReservationService, formatDate };