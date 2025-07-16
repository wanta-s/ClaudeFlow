// 予約詳細インターフェース
export interface ReservationDetail {
  id: string;
  userId: string;
  restaurantName: string;
  date: Date;
  time: string;
  numberOfGuests: number;
  status: string;
}

// 簡易LRUキャッシュ
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5分

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }
}

// リポジトリ
export class ReservationRepository {
  // モックデータ
  private reservations: ReservationDetail[] = [
    {
      id: '1',
      userId: 'user1',
      restaurantName: 'レストランA',
      date: new Date('2024-01-01'),
      time: '19:00',
      numberOfGuests: 2,
      status: 'confirmed'
    }
  ];

  findById(id: string): ReservationDetail | undefined {
    return this.reservations.find(r => r.id === id);
  }
}

// サービス
export class ReservationService {
  private cache = new SimpleCache<ReservationDetail>();
  private repository = new ReservationRepository();

  getReservationDetail(id: string): ReservationDetail | undefined {
    // キャッシュチェック
    const cached = this.cache.get(id);
    if (cached) return cached;

    // リポジトリから取得
    const reservation = this.repository.findById(id);
    if (reservation) {
      this.cache.set(id, reservation);
    }

    return reservation;
  }
}