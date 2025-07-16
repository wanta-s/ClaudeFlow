# カレンダー表示機能仕様書

## 機能概要
月間カレンダービューで予約状況を視覚的に表示する機能。在庫管理システムの予約情報を日付別に整理して表示。

## インターフェース定義

### CalendarView インターフェース
```typescript
interface CalendarView {
  year: number;
  month: number;
  days: CalendarDay[];
  resources: Resource[];
}

interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  reservations: ReservationSummary[];
}

interface ReservationSummary {
  id: string;
  resourceId: string;
  resourceName: string;
  timeSlot: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  itemCount: number;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  capacity: number;
}
```

## 主要メソッドのシグネチャ

### CalendarService クラス
```typescript
class CalendarService {
  /**
   * 指定月のカレンダーデータを取得
   * @param year 年
   * @param month 月 (1-12)
   * @returns カレンダービューデータ
   */
  async getMonthView(year: number, month: number): Promise<CalendarView>;

  /**
   * 指定日の予約サマリーを取得
   * @param date 対象日付
   * @returns 予約サマリーリスト
   */
  async getDayReservations(date: Date): Promise<ReservationSummary[]>;

  /**
   * カレンダー表示用の日付配列を生成
   * @param year 年
   * @param month 月
   * @returns カレンダー日付配列（前月末・翌月初を含む）
   */
  generateCalendarDays(year: number, month: number): CalendarDay[];

  /**
   * リソース別の予約状況を集計
   * @param resourceId リソースID
   * @param startDate 開始日
   * @param endDate 終了日
   * @returns リソース別予約集計
   */
  async getResourceUtilization(
    resourceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ResourceUtilization>;
}
```

### CalendarComponent インターフェース
```typescript
interface CalendarComponentProps {
  year: number;
  month: number;
  onDateSelect: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
  highlightDates?: Date[];
  disabledDates?: Date[];
}

interface CalendarComponentState {
  calendarView: CalendarView | null;
  selectedDate: Date | null;
  loading: boolean;
  error: string | null;
}
```

## エラーケース

### エラー定義
```typescript
enum CalendarErrorCode {
  INVALID_DATE = 'CALENDAR_001',
  DATA_FETCH_FAILED = 'CALENDAR_002',
  INVALID_MONTH = 'CALENDAR_003',
  RESOURCE_NOT_FOUND = 'CALENDAR_004'
}

interface CalendarError {
  code: CalendarErrorCode;
  message: string;
  details?: any;
}
```

### エラーハンドリング
```typescript
class CalendarErrorHandler {
  static handleError(error: any): CalendarError {
    if (error.code && Object.values(CalendarErrorCode).includes(error.code)) {
      return error as CalendarError;
    }
    
    return {
      code: CalendarErrorCode.DATA_FETCH_FAILED,
      message: 'カレンダーデータの取得に失敗しました',
      details: error
    };
  }
}
```

## データストレージ

### MemoryCalendarStore
```typescript
class MemoryCalendarStore {
  private reservations: Map<string, Reservation[]> = new Map();
  private resources: Map<string, Resource> = new Map();

  /**
   * 日付キーで予約を保存
   */
  addReservation(dateKey: string, reservation: Reservation): void {
    const existing = this.reservations.get(dateKey) || [];
    existing.push(reservation);
    this.reservations.set(dateKey, existing);
  }

  /**
   * 月間の予約を一括取得
   */
  getMonthReservations(year: number, month: number): Map<string, Reservation[]> {
    const result = new Map<string, Reservation[]>();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    for (const [dateKey, reservations] of this.reservations.entries()) {
      const date = new Date(dateKey);
      if (date >= startDate && date <= endDate) {
        result.set(dateKey, reservations);
      }
    }

    return result;
  }
}
```

## 依存関係

### 内部依存
- ReservationService（予約データの取得）
- ResourceService（リソース情報の取得）
- DateUtility（日付操作ユーティリティ）

### 外部依存（最小限）
- なし（スタンドアロン動作）

### 拡張ポイント
```typescript
interface CalendarDataProvider {
  getReservations(startDate: Date, endDate: Date): Promise<Reservation[]>;
  getResources(): Promise<Resource[]>;
}

// 将来の認証機能追加時に実装を差し替え可能
class AuthenticatedCalendarDataProvider implements CalendarDataProvider {
  constructor(private authToken: string) {}
  // 認証付きデータ取得の実装
}
```

## ユーティリティ関数

```typescript
// 日付フォーマット
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 週の開始日を取得
const getWeekStart = (date: Date, startDayOfWeek: number = 0): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + startDayOfWeek;
  return new Date(d.setDate(diff));
};

// 月の日数を取得
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};
```

## 使用例

```typescript
// 基本的な使用
const calendarService = new CalendarService();
const calendarView = await calendarService.getMonthView(2024, 1);

// コンポーネントでの使用
<CalendarComponent
  year={2024}
  month={1}
  onDateSelect={(date) => console.log('Selected:', date)}
  onMonthChange={(year, month) => {
    // 月変更時の処理
  }}
/>

// メモリストアの使用
const store = new MemoryCalendarStore();
store.addReservation('2024-01-15', {
  id: 'res-001',
  resourceId: 'resource-001',
  date: new Date('2024-01-15'),
  timeSlot: '10:00-11:00',
  status: 'confirmed',
  items: []
});
```