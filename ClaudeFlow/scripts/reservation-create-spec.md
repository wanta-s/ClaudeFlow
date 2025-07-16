# 予約作成機能 詳細仕様書

## 概要
新規予約の作成機能（日時、内容、参加者）を実装する。認証機能への依存を避け、スタンドアロンで動作する設計とする。

## インターフェース定義

### 予約データモデル
```typescript
interface Reservation {
  id: string;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  participants: Participant[];
  resourceId?: string;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // 後から認証システムと連携可能
}

interface Participant {
  id: string;
  name: string;
  email: string;
  role: ParticipantRole;
  status: ParticipantStatus;
}

type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';
type ParticipantRole = 'organizer' | 'attendee' | 'optional';
type ParticipantStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

interface CreateReservationRequest {
  title: string;
  description?: string;
  startDateTime: string; // ISO 8601形式
  endDateTime: string;   // ISO 8601形式
  participants: CreateParticipantRequest[];
  resourceId?: string;
  createdBy?: string; // オプショナル（認証なしモード用）
}

interface CreateParticipantRequest {
  name: string;
  email: string;
  role?: ParticipantRole; // デフォルト: 'attendee'
}

interface CreateReservationResponse {
  success: boolean;
  data?: Reservation;
  error?: {
    code: string;
    message: string;
    details?: ValidationError[];
  };
}

interface ValidationError {
  field: string;
  message: string;
}
```

## 主要メソッドのシグネチャ

### ReservationService クラス
```typescript
class ReservationService {
  constructor(config?: ReservationServiceConfig);
  
  // 予約作成
  async createReservation(
    request: CreateReservationRequest
  ): Promise<Result<Reservation, ReservationError>>;
  
  // バリデーション
  validateReservationRequest(
    request: CreateReservationRequest
  ): ValidationResult;
  
  // 重複チェック
  async checkConflicts(
    startDateTime: Date,
    endDateTime: Date,
    resourceId?: string
  ): Promise<ConflictCheckResult>;
  
  // 参加者通知（後から実装可能）
  async notifyParticipants(
    reservation: Reservation,
    notificationOptions?: NotificationOptions
  ): Promise<NotificationResult>;
}

interface ReservationServiceConfig {
  storage?: StorageAdapter;
  validation?: ValidationConfig;
  defaults?: ReservationDefaults;
}

interface StorageAdapter {
  save(reservation: Reservation): Promise<Reservation>;
  findConflicts(criteria: ConflictCriteria): Promise<Reservation[]>;
}

interface ValidationConfig {
  minAdvanceMinutes?: number;  // デフォルト: 0
  maxAdvanceDays?: number;      // デフォルト: 365
  minDurationMinutes?: number;  // デフォルト: 15
  maxDurationHours?: number;    // デフォルト: 24
  maxParticipants?: number;     // デフォルト: 100
}

interface ReservationDefaults {
  defaultDurationMinutes?: number; // デフォルト: 60
  defaultStatus?: ReservationStatus; // デフォルト: 'pending'
}
```

### ストレージ実装（メモリベース）
```typescript
class InMemoryReservationStorage implements StorageAdapter {
  private reservations: Map<string, Reservation> = new Map();
  
  async save(reservation: Reservation): Promise<Reservation> {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }
  
  async findConflicts(criteria: ConflictCriteria): Promise<Reservation[]> {
    // 時間とリソースの重複をチェック
    return Array.from(this.reservations.values()).filter(r => 
      this.isConflicting(r, criteria)
    );
  }
  
  private isConflicting(
    reservation: Reservation, 
    criteria: ConflictCriteria
  ): boolean {
    // 重複判定ロジック
  }
}
```

## エラーケース

### エラーコード定義
```typescript
enum ReservationErrorCode {
  // バリデーションエラー
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  PAST_DATE = 'PAST_DATE',
  TOO_FAR_IN_FUTURE = 'TOO_FAR_IN_FUTURE',
  DURATION_TOO_SHORT = 'DURATION_TOO_SHORT',
  DURATION_TOO_LONG = 'DURATION_TOO_LONG',
  
  // 参加者エラー
  NO_PARTICIPANTS = 'NO_PARTICIPANTS',
  TOO_MANY_PARTICIPANTS = 'TOO_MANY_PARTICIPANTS',
  INVALID_EMAIL = 'INVALID_EMAIL',
  DUPLICATE_PARTICIPANT = 'DUPLICATE_PARTICIPANT',
  
  // 競合エラー
  TIME_CONFLICT = 'TIME_CONFLICT',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // システムエラー
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

class ReservationError extends Error {
  constructor(
    public code: ReservationErrorCode,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}
```

### バリデーションルール
```typescript
const validationRules = {
  // 日時バリデーション
  dateRange: (start: Date, end: Date) => {
    if (start >= end) {
      return 'endDateTime must be after startDateTime';
    }
    return null;
  },
  
  // 過去日チェック
  notInPast: (date: Date, allowPast: boolean = false) => {
    if (!allowPast && date < new Date()) {
      return 'Cannot create reservation in the past';
    }
    return null;
  },
  
  // 期間チェック
  duration: (start: Date, end: Date, config: ValidationConfig) => {
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    if (durationMinutes < (config.minDurationMinutes || 15)) {
      return `Duration must be at least ${config.minDurationMinutes} minutes`;
    }
    
    const durationHours = durationMinutes / 60;
    if (durationHours > (config.maxDurationHours || 24)) {
      return `Duration cannot exceed ${config.maxDurationHours} hours`;
    }
    
    return null;
  },
  
  // Email検証
  email: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    return null;
  }
};
```

## 依存関係

### 必須依存
- なし（スタンドアロン動作）

### オプション依存
```typescript
interface OptionalDependencies {
  // 認証システム（後から追加可能）
  authService?: {
    getCurrentUser(): User | null;
    hasPermission(user: User, action: string): boolean;
  };
  
  // 通知システム（後から追加可能）
  notificationService?: {
    sendEmail(to: string, subject: string, body: string): Promise<void>;
  };
  
  // 永続化ストレージ（後から追加可能）
  persistentStorage?: {
    save(data: any): Promise<void>;
    load(id: string): Promise<any>;
  };
}
```

## 実装例

### 基本的な使用方法
```typescript
// 1. サービスの初期化
const reservationService = new ReservationService({
  validation: {
    minAdvanceMinutes: 30,
    maxAdvanceDays: 90,
    maxParticipants: 20
  }
});

// 2. 予約作成
const request: CreateReservationRequest = {
  title: '会議室予約',
  description: '月次定例会議',
  startDateTime: '2024-12-20T10:00:00+09:00',
  endDateTime: '2024-12-20T11:30:00+09:00',
  participants: [
    { name: '山田太郎', email: 'yamada@example.com', role: 'organizer' },
    { name: '佐藤花子', email: 'sato@example.com' }
  ],
  resourceId: 'meeting-room-a'
};

const result = await reservationService.createReservation(request);

if (result.success) {
  console.log('予約作成成功:', result.value.id);
} else {
  console.error('予約作成失敗:', result.error.message);
}
```

### 認証システムとの統合例
```typescript
// 認証システムが利用可能になった後
class AuthenticatedReservationService extends ReservationService {
  constructor(
    private authService: AuthService,
    config?: ReservationServiceConfig
  ) {
    super(config);
  }
  
  async createReservation(
    request: CreateReservationRequest
  ): Promise<Result<Reservation, ReservationError>> {
    // 現在のユーザーを取得
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return err(new ReservationError(
        ReservationErrorCode.UNAUTHORIZED,
        'Authentication required'
      ));
    }
    
    // createdByを自動設定
    const authenticatedRequest = {
      ...request,
      createdBy: currentUser.id
    };
    
    return super.createReservation(authenticatedRequest);
  }
}
```

## テスト例

```typescript
describe('ReservationService', () => {
  let service: ReservationService;
  
  beforeEach(() => {
    service = new ReservationService();
  });
  
  test('正常な予約作成', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const request: CreateReservationRequest = {
      title: 'テスト予約',
      startDateTime: tomorrow.toISOString(),
      endDateTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
      participants: [{ name: 'テストユーザー', email: 'test@example.com' }]
    };
    
    const result = await service.createReservation(request);
    
    expect(result.success).toBe(true);
    expect(result.value?.title).toBe('テスト予約');
  });
  
  test('過去日時での予約作成エラー', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const request: CreateReservationRequest = {
      title: 'テスト予約',
      startDateTime: yesterday.toISOString(),
      endDateTime: new Date().toISOString(),
      participants: [{ name: 'テストユーザー', email: 'test@example.com' }]
    };
    
    const result = await service.createReservation(request);
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ReservationErrorCode.PAST_DATE);
  });
});
```

## 設計上の考慮事項

1. **スタンドアロン動作**: 認証や外部サービスに依存せず単体で動作
2. **拡張性**: 後から認証、通知、永続化を追加可能な設計
3. **型安全性**: TypeScriptの型システムを活用したエラー防止
4. **テスタビリティ**: 依存性注入によるテストしやすい設計
5. **パフォーマンス**: メモリベースストレージで高速動作
6. **エラーハンドリング**: Result型による明示的なエラー処理