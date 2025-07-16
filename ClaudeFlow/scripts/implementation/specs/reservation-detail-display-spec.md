# 予約詳細表示機能 仕様書

## 機能概要
個別予約の詳細情報を表示する機能。予約ID(またはUUID)を指定して、その予約に関する完全な情報を取得・表示する。

## インターフェース定義

### 1. データモデル

```typescript
// 予約詳細情報
interface ReservationDetail {
  id: string;                    // 予約ID (UUID)
  title: string;                 // 予約タイトル
  description?: string;          // 予約の詳細説明
  date: string;                  // 予約日 (YYYY-MM-DD)
  startTime: string;             // 開始時刻 (HH:mm)
  endTime: string;               // 終了時刻 (HH:mm)
  location?: string;             // 場所
  status: ReservationStatus;     // 予約ステータス
  createdAt: string;             // 作成日時 (ISO8601)
  updatedAt: string;             // 更新日時 (ISO8601)
  metadata?: Record<string, any>; // 追加メタデータ
}

// 予約ステータス
enum ReservationStatus {
  PENDING = 'pending',       // 保留中
  CONFIRMED = 'confirmed',   // 確定
  CANCELLED = 'cancelled',   // キャンセル済み
  COMPLETED = 'completed'    // 完了
}

// 予約詳細レスポンス
interface ReservationDetailResponse {
  success: boolean;
  data?: ReservationDetail;
  error?: ErrorResponse;
}

// エラーレスポンス
interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}
```

### 2. APIインターフェース

```typescript
interface ReservationDetailAPI {
  // 予約詳細を取得
  getReservationDetail(id: string): Promise<ReservationDetailResponse>;
}
```

### 3. サービスインターフェース

```typescript
interface ReservationDetailService {
  // 予約詳細を取得
  getDetail(id: string): Promise<ReservationDetail>;
  
  // 予約の存在確認
  exists(id: string): Promise<boolean>;
  
  // 予約ステータスを取得
  getStatus(id: string): Promise<ReservationStatus>;
}
```

### 4. リポジトリインターフェース

```typescript
interface ReservationRepository {
  // IDで予約を検索
  findById(id: string): Promise<ReservationDetail | null>;
  
  // 複数IDで予約を一括取得
  findByIds(ids: string[]): Promise<ReservationDetail[]>;
}
```

## 主要メソッドのシグネチャ

### 1. サービス層

```typescript
class ReservationDetailServiceImpl implements ReservationDetailService {
  constructor(
    private readonly repository: ReservationRepository,
    private readonly validator: ReservationValidator
  ) {}

  async getDetail(id: string): Promise<ReservationDetail> {
    // 1. ID検証
    // 2. リポジトリから取得
    // 3. データ整形・返却
  }

  async exists(id: string): Promise<boolean> {
    // 予約の存在確認
  }

  async getStatus(id: string): Promise<ReservationStatus> {
    // ステータスのみ取得
  }
}
```

### 2. API層

```typescript
class ReservationDetailAPIImpl implements ReservationDetailAPI {
  constructor(
    private readonly service: ReservationDetailService
  ) {}

  async getReservationDetail(id: string): Promise<ReservationDetailResponse> {
    // 1. パラメータ検証
    // 2. サービス呼び出し
    // 3. レスポンス構築
  }
}
```

### 3. バリデーション

```typescript
interface ReservationValidator {
  // 予約IDの形式を検証
  validateId(id: string): ValidationResult;
  
  // 予約データの完全性を検証
  validateReservationData(data: Partial<ReservationDetail>): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}
```

## エラーケース

### 1. エラーコード定義

```typescript
enum ReservationErrorCode {
  // 検証エラー
  INVALID_ID = 'RESERVATION_INVALID_ID',
  INVALID_FORMAT = 'RESERVATION_INVALID_FORMAT',
  
  // 存在エラー
  NOT_FOUND = 'RESERVATION_NOT_FOUND',
  
  // システムエラー
  STORAGE_ERROR = 'RESERVATION_STORAGE_ERROR',
  UNKNOWN_ERROR = 'RESERVATION_UNKNOWN_ERROR'
}
```

### 2. エラーハンドリング

```typescript
class ReservationError extends Error {
  constructor(
    public code: ReservationErrorCode,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ReservationError';
  }
}

// エラーハンドリングユーティリティ
const handleReservationError = (error: unknown): ErrorResponse => {
  if (error instanceof ReservationError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }
  
  return {
    code: ReservationErrorCode.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error : undefined
  };
};
```

## 依存関係

### 1. 内部依存関係

```typescript
// 依存関係の定義
interface Dependencies {
  // データストレージ（メモリまたはファイルベース）
  storage: StorageAdapter;
  
  // バリデーション
  validator: ReservationValidator;
  
  // ロギング（オプション）
  logger?: Logger;
}

// ストレージアダプタインターフェース
interface StorageAdapter {
  get(id: string): Promise<any | null>;
  getMultiple(ids: string[]): Promise<Map<string, any>>;
  exists(id: string): Promise<boolean>;
}
```

### 2. 実装例（メモリストレージ）

```typescript
class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, ReservationDetail>();

  async get(id: string): Promise<ReservationDetail | null> {
    return this.storage.get(id) || null;
  }

  async getMultiple(ids: string[]): Promise<Map<string, ReservationDetail>> {
    const result = new Map<string, ReservationDetail>();
    ids.forEach(id => {
      const data = this.storage.get(id);
      if (data) result.set(id, data);
    });
    return result;
  }

  async exists(id: string): Promise<boolean> {
    return this.storage.has(id);
  }
}
```

### 3. ファクトリーパターン

```typescript
// サービスファクトリー
class ReservationDetailServiceFactory {
  static create(options?: ServiceOptions): ReservationDetailService {
    const storage = options?.storage || new MemoryStorageAdapter();
    const validator = options?.validator || new DefaultReservationValidator();
    const repository = new ReservationRepositoryImpl(storage);
    
    return new ReservationDetailServiceImpl(repository, validator);
  }
}

interface ServiceOptions {
  storage?: StorageAdapter;
  validator?: ReservationValidator;
  logger?: Logger;
}
```

## 使用例

```typescript
// 1. サービスの初期化
const service = ReservationDetailServiceFactory.create();

// 2. 予約詳細の取得
try {
  const reservation = await service.getDetail('uuid-12345');
  console.log('Reservation:', reservation);
} catch (error) {
  if (error instanceof ReservationError) {
    console.error(`Error ${error.code}: ${error.message}`);
  }
}

// 3. API経由での取得
const api = new ReservationDetailAPIImpl(service);
const response = await api.getReservationDetail('uuid-12345');

if (response.success) {
  console.log('Reservation details:', response.data);
} else {
  console.error('Error:', response.error);
}
```

## テストケース

```typescript
describe('ReservationDetailService', () => {
  let service: ReservationDetailService;
  
  beforeEach(() => {
    service = ReservationDetailServiceFactory.create();
  });
  
  test('should retrieve reservation by ID', async () => {
    const id = 'test-uuid';
    const reservation = await service.getDetail(id);
    expect(reservation).toBeDefined();
    expect(reservation.id).toBe(id);
  });
  
  test('should throw error for invalid ID', async () => {
    await expect(service.getDetail('')).rejects.toThrow(ReservationError);
  });
  
  test('should throw error for non-existent reservation', async () => {
    await expect(service.getDetail('non-existent')).rejects.toThrow(ReservationError);
  });
});
```

## 拡張ポイント

1. **認証統合**: 後から認証機能を追加する際のフック
```typescript
interface AuthContext {
  userId?: string;
  permissions?: string[];
}

// サービスメソッドに認証コンテキストを追加
async getDetail(id: string, context?: AuthContext): Promise<ReservationDetail>
```

2. **キャッシング**: パフォーマンス向上のためのキャッシュ層
```typescript
interface CacheAdapter {
  get(key: string): Promise<any | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
}
```

3. **イベント通知**: 予約詳細が参照された際のイベント
```typescript
interface EventEmitter {
  emit(event: 'reservation.viewed', data: { id: string, timestamp: Date }): void;
}
```