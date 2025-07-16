// Rough level unit tests - 基本的な正常系のみ

import { DailyReservationService, formatDate } from './index';

// 簡易テストランナー
function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.error(`    ${error}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null but got ${actual}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value but got ${actual}`);
      }
    }
  };
}

// テスト実行
describe('DailyReservationService', () => {
  describe('getDailyReservations', () => {
    it('指定日の予約を取得できる', () => {
      const service = new DailyReservationService();
      const result = service.getDailyReservations('2024-01-20');
      
      expect(result.date).toBe('2024-01-20');
      expect(result.totalCount).toBe(2);
      expect(result.reservations.length).toBe(2);
    });

    it('予約が時間順にソートされている', () => {
      const service = new DailyReservationService();
      const result = service.getDailyReservations('2024-01-20');
      
      expect(result.reservations[0].time).toBe('10:00');
      expect(result.reservations[1].time).toBe('14:00');
    });

    it('予約がない日は空配列を返す', () => {
      const service = new DailyReservationService();
      const result = service.getDailyReservations('2024-01-21');
      
      expect(result.date).toBe('2024-01-21');
      expect(result.totalCount).toBe(0);
      expect(result.reservations.length).toBe(0);
    });
  });

  describe('getReservationById', () => {
    it('IDで予約を取得できる', () => {
      const service = new DailyReservationService();
      const reservation = service.getReservationById('1');
      
      expect(reservation).toBeTruthy();
      expect(reservation.id).toBe('1');
      expect(reservation.resourceName).toBe('会議室A');
    });

    it('存在しないIDはnullを返す', () => {
      const service = new DailyReservationService();
      const reservation = service.getReservationById('999');
      
      expect(reservation).toBeNull();
    });
  });
});

describe('formatDate', () => {
  it('Dateオブジェクトをyyyy-mm-dd形式に変換できる', () => {
    const date = new Date('2024-01-20');
    const formatted = formatDate(date);
    
    expect(formatted).toBe('2024-01-20');
  });

  it('月日が1桁の場合0埋めされる', () => {
    const date = new Date('2024-01-05');
    const formatted = formatDate(date);
    
    expect(formatted).toBe('2024-01-05');
  });
});

// テスト実行
console.log('Running tests...');