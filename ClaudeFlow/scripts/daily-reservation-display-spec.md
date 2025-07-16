# 機能仕様: 日別予約表示 (feature_011)

## 概要
選択した日付の予約一覧を表示する機能。コア機能として実装し、認証機能への依存を避けてスタンドアロンで動作する設計とする。

## インターフェース定義

### 1. データモデル

```typescript
interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD形式
  time: string; // HH:mm形式
  resourceName: string;
  resourceId: string;
  purpose: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  // 認証機能追加時に拡張可能
  userId?: string;
  userName?: string;
}

interface DailyReservationFilter {
  date: string; // YYYY-MM-DD形式
  resourceId?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
}

interface DailyReservationResponse {
  date: string;
  reservations: Reservation[];
  totalCount: number;
}
```

### 2. サービスインターフェース

```typescript
interface DailyReservationService {
  // 指定日の予約一覧を取得
  getDailyReservations(filter: DailyReservationFilter): Promise<DailyReservationResponse>;
  
  // 予約の詳細を取得
  getReservationById(id: string): Promise<Reservation | null>;
  
  // データストアの初期化（開発用）
  initialize(): Promise<void>;
}
```

### 3. ビューコンポーネントインターフェース

```typescript
interface DailyReservationViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onReservationSelect?: (reservation: Reservation) => void;
}

interface ReservationListItemProps {
  reservation: Reservation;
  onClick?: () => void;
}
```

## 主要メソッドのシグネチャ

### 1. サービス層

```typescript
class SimpleDailyReservationService implements DailyReservationService {
  private dataStore: Map<string, Reservation>;
  
  constructor(dataStore?: Map<string, Reservation>) {
    this.dataStore = dataStore || new Map();
  }
  
  async getDailyReservations(filter: DailyReservationFilter): Promise<DailyReservationResponse> {
    // 実装詳細
  }
  
  async getReservationById(id: string): Promise<Reservation | null> {
    // 実装詳細
  }
  
  async initialize(): Promise<void> {
    // サンプルデータの投入
  }
}
```

### 2. ユーティリティ関数

```typescript
// 日付フォーマット関数
function formatDate(date: Date): string {
  // YYYY-MM-DD形式に変換
}

// 時刻フォーマット関数
function formatTime(time: string): string {
  // HH:mm形式に変換
}

// 日付パース関数
function parseDate(dateString: string): Date {
  // YYYY-MM-DD形式をDateオブジェクトに変換
}

// 予約時間によるソート関数
function sortReservationsByTime(reservations: Reservation[]): Reservation[] {
  // 時刻順にソート
}
```

### 3. ビューコンポーネント（React）

```typescript
// 日別予約表示メインコンポーネント
const DailyReservationView: React.FC<DailyReservationViewProps> = ({
  selectedDate,
  onDateChange,
  onReservationSelect
}) => {
  // 実装詳細
};

// 予約リストアイテムコンポーネント
const ReservationListItem: React.FC<ReservationListItemProps> = ({
  reservation,
  onClick
}) => {
  // 実装詳細
};
```

## エラーケース

### 1. データ取得エラー
```typescript
class DataFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataFetchError';
  }
}
```

### 2. 無効な日付形式
```typescript
class InvalidDateFormatError extends Error {
  constructor(dateString: string) {
    super(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
    this.name = 'InvalidDateFormatError';
  }
}
```

### 3. リソース未検出
```typescript
class ResourceNotFoundError extends Error {
  constructor(resourceId: string) {
    super(`Resource not found: ${resourceId}`);
    this.name = 'ResourceNotFoundError';
  }
}
```

## 依存関係

### 最小限の依存
- **データストア**: Map（メモリ内）またはファイルベース（JSON）
- **日付処理**: 標準JavaScript Date API（外部ライブラリ不要）
- **ビュー**: React（オプション、純粋なJavaScriptでも実装可能）

### 後から追加可能な依存
- **認証**: JWT検証ミドルウェア
- **データベース**: PostgreSQL接続
- **キャッシュ**: Redis接続

## 実装パターン

### 1. シングルトンパターン（データストア）
```typescript
class ReservationDataStore {
  private static instance: ReservationDataStore;
  private data: Map<string, Reservation>;
  
  private constructor() {
    this.data = new Map();
  }
  
  static getInstance(): ReservationDataStore {
    if (!ReservationDataStore.instance) {
      ReservationDataStore.instance = new ReservationDataStore();
    }
    return ReservationDataStore.instance;
  }
}
```

### 2. ファクトリーパターン（サービス生成）
```typescript
class ReservationServiceFactory {
  static createService(type: 'memory' | 'file' = 'memory'): DailyReservationService {
    switch (type) {
      case 'memory':
        return new SimpleDailyReservationService();
      case 'file':
        return new FileBasedReservationService();
      default:
        return new SimpleDailyReservationService();
    }
  }
}
```

## テストケース

### 1. 単体テスト
- 指定日の予約取得
- 空の日付での取得
- 無効な日付形式でのエラー
- フィルタリング機能

### 2. 統合テスト  
- データストアとの連携
- 複数日にまたがる予約の処理
- パフォーマンステスト（大量データ）

## 拡張ポイント

### 1. 認証機能追加時
```typescript
interface AuthenticatedReservation extends Reservation {
  userId: string;
  userName: string;
  userEmail: string;
}
```

### 2. リアルタイム更新
```typescript
interface ReservationUpdateEvent {
  type: 'created' | 'updated' | 'deleted';
  reservation: Reservation;
  timestamp: string;
}
```

### 3. 権限管理
```typescript
interface ReservationPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
```