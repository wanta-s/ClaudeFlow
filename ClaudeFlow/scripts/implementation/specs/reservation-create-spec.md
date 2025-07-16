# 予約作成機能 詳細仕様書

## 機能概要
新規予約の作成機能。日時、内容、参加者を指定して予約を作成する。

## コア機能実装方針
- 認証機能への依存を避け、スタンドアロンで動作する実装
- メモリ内データストアを使用した簡易実装
- 後から認証機能を追加可能な設計

## インターフェース定義

### 1. データモデル

```typescript
// 予約エンティティ
interface Reservation {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
  status: ReservationStatus;
  createdBy?: string; // 後から認証機能追加時に使用
}

// 予約ステータス
enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

// 予約作成リクエスト
interface CreateReservationRequest {
  title: string;
  description?: string;
  startTime: string; // ISO 8601形式
  endTime: string;   // ISO 8601形式
  participants: string[];
}

// 予約作成レスポンス
interface CreateReservationResponse {
  success: boolean;
  data?: Reservation;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// バリデーション結果
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
}
```

### 2. サービスインターフェース

```typescript
interface ReservationService {
  createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse>;
  validateReservation(request: CreateReservationRequest): ValidationResult;
}
```

### 3. リポジトリインターフェース

```typescript
interface ReservationRepository {
  save(reservation: Reservation): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
  findByTimeRange(startTime: Date, endTime: Date): Promise<Reservation[]>;
  exists(id: string): Promise<boolean>;
}
```

## 主要メソッドのシグネチャ

### ReservationService

```typescript
class ReservationServiceImpl implements ReservationService {
  constructor(
    private repository: ReservationRepository,
    private config: ReservationConfig
  ) {}

  async createReservation(request: CreateReservationRequest): Promise<CreateReservationResponse> {
    // 1. バリデーション
    // 2. 重複チェック
    // 3. 予約作成
    // 4. 保存
    // 5. レスポンス生成
  }

  validateReservation(request: CreateReservationRequest): ValidationResult {
    // 必須項目チェック
    // 日時フォーマットチェック
    // 営業時間チェック
    // 終了時刻 > 開始時刻チェック
    // 参加者数チェック
  }

  private checkOverlap(startTime: Date, endTime: Date): Promise<boolean> {
    // 時間帯の重複チェック
  }

  private generateReservationId(): string {
    // ユニークID生成
  }
}
```

### ReservationRepository（メモリ実装）

```typescript
class InMemoryReservationRepository implements ReservationRepository {
  private reservations: Map<string, Reservation> = new Map();

  async save(reservation: Reservation): Promise<Reservation> {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  async findById(id: string): Promise<Reservation | null> {
    return this.reservations.get(id) || null;
  }

  async findByTimeRange(startTime: Date, endTime: Date): Promise<Reservation[]> {
    return Array.from(this.reservations.values())
      .filter(r => this.isOverlapping(r, startTime, endTime));
  }

  async exists(id: string): Promise<boolean> {
    return this.reservations.has(id);
  }

  private isOverlapping(reservation: Reservation, startTime: Date, endTime: Date): boolean {
    // 時間帯重複判定ロジック
  }
}
```

## エラーケース

### 1. バリデーションエラー

```typescript
const ERROR_CODES = {
  VALIDATION: {
    REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
    INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
    INVALID_TIME_RANGE: 'VALIDATION_INVALID_TIME_RANGE',
    OUTSIDE_BUSINESS_HOURS: 'VALIDATION_OUTSIDE_BUSINESS_HOURS',
    TOO_MANY_PARTICIPANTS: 'VALIDATION_TOO_MANY_PARTICIPANTS'
  },
  RESERVATION: {
    TIME_CONFLICT: 'RESERVATION_TIME_CONFLICT',
    CREATION_FAILED: 'RESERVATION_CREATION_FAILED'
  }
} as const;
```

### 2. エラー詳細

| エラーコード | 説明 | HTTPステータス |
|------------|------|--------------|
| VALIDATION_REQUIRED_FIELD | 必須項目が未入力 | 400 |
| VALIDATION_INVALID_FORMAT | 日時フォーマットが不正 | 400 |
| VALIDATION_INVALID_TIME_RANGE | 終了時刻が開始時刻より前 | 400 |
| VALIDATION_OUTSIDE_BUSINESS_HOURS | 営業時間外の予約 | 400 |
| VALIDATION_TOO_MANY_PARTICIPANTS | 参加者数が上限を超過 | 400 |
| RESERVATION_TIME_CONFLICT | 指定時間帯に既存予約あり | 409 |
| RESERVATION_CREATION_FAILED | 予約作成処理の失敗 | 500 |

## 依存関係

### 内部依存
- なし（コア機能として独立実装）

### 外部依存（最小限）
```json
{
  "dependencies": {
    "uuid": "^9.0.0"  // ID生成用
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

## 設定インターフェース

```typescript
interface ReservationConfig {
  businessHours: {
    start: string; // "09:00"
    end: string;   // "18:00"
  };
  maxParticipants: number;
  defaultStatus: ReservationStatus;
  allowPastReservations: boolean;
}

// デフォルト設定
const DEFAULT_CONFIG: ReservationConfig = {
  businessHours: {
    start: "09:00",
    end: "18:00"
  },
  maxParticipants: 50,
  defaultStatus: ReservationStatus.PENDING,
  allowPastReservations: false
};
```

## API仕様（RESTful）

### エンドポイント
```
POST /api/reservations
```

### リクエスト例
```json
{
  "title": "チームミーティング",
  "description": "週次定例会議",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "participants": ["user1@example.com", "user2@example.com"]
}
```

### レスポンス例（成功）
```json
{
  "success": true,
  "data": {
    "id": "res_123456",
    "title": "チームミーティング",
    "description": "週次定例会議",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T11:00:00Z",
    "participants": ["user1@example.com", "user2@example.com"],
    "status": "PENDING",
    "createdAt": "2024-01-10T09:00:00Z",
    "updatedAt": "2024-01-10T09:00:00Z"
  }
}
```

### レスポンス例（エラー）
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_INVALID_TIME_RANGE",
    "message": "終了時刻は開始時刻より後に設定してください",
    "details": {
      "startTime": "2024-01-15T11:00:00Z",
      "endTime": "2024-01-15T10:00:00Z"
    }
  }
}
```

## 拡張ポイント

### 1. 認証機能追加時
- `createdBy`フィールドにユーザーIDを設定
- 権限チェック機能の追加
- 自分の予約のみ表示するフィルタリング

### 2. 永続化層の変更
- `ReservationRepository`インターフェースの別実装を作成
- PostgreSQL、MongoDB等への対応

### 3. 通知機能の追加
- 予約作成時のメール通知
- リマインダー機能

### 4. 検証ルールの拡張
- カスタムバリデーションルールの追加
- 外部カレンダーとの連携チェック