# 予約詳細表示機能 詳細仕様書

## 1. 機能概要
個別予約の詳細情報を表示する機能。予約ID を基に特定の予約情報を取得し、ユーザーに詳細な情報を提供する。

## 2. インターフェース定義

### 2.1 データモデル

```typescript
// 予約詳細情報
interface ReservationDetail {
  id: string;
  title: string;
  description?: string;
  date: string;          // ISO8601形式 (YYYY-MM-DD)
  startTime: string;     // HH:mm形式
  endTime: string;       // HH:mm形式
  location?: string;
  status: ReservationStatus;
  createdAt: string;     // ISO8601形式
  updatedAt: string;     // ISO8601形式
  metadata?: ReservationMetadata;
}

// 予約ステータス
enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

// 予約メタデータ（拡張情報）
interface ReservationMetadata {
  notes?: string;
  attachments?: string[];
  tags?: string[];
  customFields?: Record<string, unknown>;
}

// API レスポンス
interface ReservationDetailResponse {
  success: boolean;
  data?: ReservationDetail;
  error?: ErrorDetail;
}

// エラー詳細
interface ErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}
```

### 2.2 サービスインターフェース

```typescript
interface ReservationDetailService {
  // 予約詳細を取得
  getReservationDetail(reservationId: string): Promise<ReservationDetail>;
  
  // 予約の存在確認
  reservationExists(reservationId: string): Promise<boolean>;
  
  // 予約詳細のキャッシュクリア
  clearDetailCache(reservationId: string): void;
}
```

### 2.3 リポジトリインターフェース

```typescript
interface ReservationDetailRepository {
  // データストアから予約を取得
  findById(reservationId: string): Promise<ReservationDetail | null>;
  
  // 複数の予約詳細を一括取得（最適化用）
  findByIds(reservationIds: string[]): Promise<Map<string, ReservationDetail>>;
}
```

## 3. 主要メソッドのシグネチャ

### 3.1 API エンドポイント

```typescript
// GET /api/reservations/:id
async function getReservationDetail(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;
  
  try {
    const detail = await reservationDetailService.getReservationDetail(id);
    res.json({
      success: true,
      data: detail
    });
  } catch (error) {
    handleError(res, error);
  }
}
```

### 3.2 サービス実装

```typescript
class ReservationDetailServiceImpl implements ReservationDetailService {
  private cache: Map<string, CachedReservation> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分
  
  constructor(
    private repository: ReservationDetailRepository
  ) {}
  
  async getReservationDetail(reservationId: string): Promise<ReservationDetail> {
    // バリデーション
    this.validateReservationId(reservationId);
    
    // キャッシュチェック
    const cached = this.getFromCache(reservationId);
    if (cached) {
      return cached;
    }
    
    // リポジトリから取得
    const detail = await this.repository.findById(reservationId);
    
    if (!detail) {
      throw new ReservationNotFoundError(reservationId);
    }
    
    // キャッシュに保存
    this.setCache(reservationId, detail);
    
    return detail;
  }
  
  private validateReservationId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('予約IDが無効です');
    }
    
    // UUID形式のチェック（例）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError('予約IDの形式が正しくありません');
    }
  }
}
```

### 3.3 リポジトリ実装（メモリストア版）

```typescript
class InMemoryReservationDetailRepository implements ReservationDetailRepository {
  private dataStore: Map<string, ReservationDetail> = new Map();
  
  async findById(reservationId: string): Promise<ReservationDetail | null> {
    return this.dataStore.get(reservationId) || null;
  }
  
  async findByIds(reservationIds: string[]): Promise<Map<string, ReservationDetail>> {
    const result = new Map<string, ReservationDetail>();
    
    reservationIds.forEach(id => {
      const detail = this.dataStore.get(id);
      if (detail) {
        result.set(id, detail);
      }
    });
    
    return result;
  }
  
  // テスト・開発用メソッド
  async save(detail: ReservationDetail): Promise<void> {
    this.dataStore.set(detail.id, detail);
  }
}
```

## 4. エラーケース

### 4.1 エラー種別

```typescript
// 基底エラークラス
class ReservationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ReservationError';
  }
}

// 予約が見つからない
class ReservationNotFoundError extends ReservationError {
  constructor(reservationId: string) {
    super(
      'RESERVATION_NOT_FOUND',
      `予約が見つかりません: ${reservationId}`,
      404
    );
  }
}

// バリデーションエラー
class ValidationError extends ReservationError {
  constructor(message: string) {
    super(
      'VALIDATION_ERROR',
      message,
      400
    );
  }
}

// データ取得エラー
class DataAccessError extends ReservationError {
  constructor(message: string) {
    super(
      'DATA_ACCESS_ERROR',
      `データの取得に失敗しました: ${message}`,
      500
    );
  }
}
```

### 4.2 エラーハンドリング

```typescript
function handleError(res: Response, error: unknown): void {
  if (error instanceof ReservationError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }
  
  // 予期しないエラー
  console.error('Unexpected error:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '内部エラーが発生しました'
    }
  });
}
```

## 5. バリデーション規則

### 5.1 入力検証

```typescript
const validationRules = {
  // 予約ID検証
  reservationId: (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof id === 'string' && uuidRegex.test(id);
  },
  
  // 日付形式検証
  dateFormat: (date: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  },
  
  // 時刻形式検証
  timeFormat: (time: string): boolean => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  }
};
```

## 6. 依存関係

### 6.1 外部依存（最小限）

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 6.2 内部依存構造

```typescript
// 依存性注入コンテナ
class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  
  static getInstance(): ServiceContainer {
    if (!this.instance) {
      this.instance = new ServiceContainer();
    }
    return this.instance;
  }
  
  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory());
  }
  
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service;
  }
}

// 初期化
const container = ServiceContainer.getInstance();
container.register('reservationDetailRepository', 
  () => new InMemoryReservationDetailRepository()
);
container.register('reservationDetailService', 
  () => new ReservationDetailServiceImpl(
    container.get('reservationDetailRepository')
  )
);
```

## 7. パフォーマンス考慮事項

### 7.1 キャッシュ戦略

```typescript
interface CachedReservation {
  data: ReservationDetail;
  timestamp: number;
}

class CacheManager {
  private cache: Map<string, CachedReservation> = new Map();
  private readonly maxSize = 1000;
  
  set(key: string, data: ReservationDetail, ttl: number): void {
    // LRU実装
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl
    });
  }
  
  get(key: string): ReservationDetail | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
}
```

## 8. テスト仕様

### 8.1 ユニットテスト例

```typescript
describe('ReservationDetailService', () => {
  let service: ReservationDetailService;
  let repository: ReservationDetailRepository;
  
  beforeEach(() => {
    repository = new InMemoryReservationDetailRepository();
    service = new ReservationDetailServiceImpl(repository);
  });
  
  test('正常に予約詳細を取得できる', async () => {
    const mockReservation: ReservationDetail = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'テスト予約',
      date: '2024-01-01',
      startTime: '10:00',
      endTime: '11:00',
      status: ReservationStatus.CONFIRMED,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };
    
    await repository.save(mockReservation);
    
    const result = await service.getReservationDetail(mockReservation.id);
    expect(result).toEqual(mockReservation);
  });
  
  test('存在しない予約IDでエラーが発生する', async () => {
    await expect(
      service.getReservationDetail('non-existent-id')
    ).rejects.toThrow(ReservationNotFoundError);
  });
});
```

## 9. セキュリティ考慮事項（将来の認証統合用）

```typescript
// 認証統合用のフック
interface SecurityContext {
  userId?: string;
  permissions?: string[];
}

// 将来の認証統合ポイント
function withAuth(
  handler: (req: Request, res: Response, context: SecurityContext) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    // 現在は認証なし
    const context: SecurityContext = {};
    
    // 将来的にはここで認証処理
    // const token = req.headers.authorization;
    // context = await verifyToken(token);
    
    await handler(req, res, context);
  };
}
```

## 10. 使用例

```typescript
// APIルートの設定
const router = express.Router();
const service = container.get<ReservationDetailService>('reservationDetailService');

router.get('/api/reservations/:id', async (req, res) => {
  try {
    const detail = await service.getReservationDetail(req.params.id);
    res.json({
      success: true,
      data: detail
    });
  } catch (error) {
    handleError(res, error);
  }
});

// クライアント側の使用例
async function fetchReservationDetail(reservationId: string): Promise<ReservationDetail> {
  const response = await fetch(`/api/reservations/${reservationId}`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error.message);
  }
  
  return result.data;
}
```