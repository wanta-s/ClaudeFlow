# 予約詳細表示機能仕様書

## 機能ID: feature_007
## 機能名: 予約詳細表示
## 説明: 個別予約の詳細情報表示

## 1. 概要
選択された予約の詳細情報を表示する機能。予約ID、リソース情報、予約日時、ステータスなどの情報を表示し、編集・削除への導線を提供する。

## 2. インターフェース定義

### 2.1 予約詳細データモデル
```typescript
interface ReservationDetail {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'cancelled' | 'completed';
  purpose?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

interface ResourceInfo {
  id: string;
  name: string;
  type: string;
  location?: string;
  capacity?: number;
  description?: string;
  availability: boolean;
}
```

### 2.2 サービスインターフェース
```typescript
interface ReservationDetailService {
  getReservationDetail(reservationId: string): Promise<ReservationDetail>;
  getResourceInfo(resourceId: string): Promise<ResourceInfo>;
  checkEditPermission(reservationId: string): Promise<boolean>;
  checkDeletePermission(reservationId: string): Promise<boolean>;
}
```

### 2.3 ビューインターフェース
```typescript
interface ReservationDetailView {
  displayReservationDetail(reservation: ReservationDetail): void;
  displayResourceInfo(resource: ResourceInfo): void;
  showEditButton(enabled: boolean): void;
  showDeleteButton(enabled: boolean): void;
  showLoadingState(): void;
  showErrorState(error: Error): void;
  showNotFoundState(): void;
}
```

## 3. 主要メソッドのシグネチャ

### 3.1 データ取得メソッド
```typescript
class ReservationDetailServiceImpl implements ReservationDetailService {
  private dataStore: DataStore;

  async getReservationDetail(reservationId: string): Promise<ReservationDetail> {
    // バリデーション
    if (!reservationId || !isValidUUID(reservationId)) {
      throw new ValidationError('Invalid reservation ID');
    }

    // データ取得
    const reservation = await this.dataStore.findReservationById(reservationId);
    
    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    return this.mapToReservationDetail(reservation);
  }

  async getResourceInfo(resourceId: string): Promise<ResourceInfo> {
    // バリデーション
    if (!resourceId || !isValidUUID(resourceId)) {
      throw new ValidationError('Invalid resource ID');
    }

    // データ取得
    const resource = await this.dataStore.findResourceById(resourceId);
    
    if (!resource) {
      throw new NotFoundError('Resource not found');
    }

    return this.mapToResourceInfo(resource);
  }
}
```

### 3.2 権限チェックメソッド
```typescript
async checkEditPermission(reservationId: string): Promise<boolean> {
  try {
    const reservation = await this.getReservationDetail(reservationId);
    
    // ビジネスルール: アクティブな予約のみ編集可能
    if (reservation.status !== 'active') {
      return false;
    }
    
    // ビジネスルール: 開始時刻の1時間前まで編集可能
    const oneHourBefore = new Date(reservation.startTime.getTime() - 60 * 60 * 1000);
    if (new Date() > oneHourBefore) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

async checkDeletePermission(reservationId: string): Promise<boolean> {
  try {
    const reservation = await this.getReservationDetail(reservationId);
    
    // ビジネスルール: アクティブな予約のみ削除可能
    if (reservation.status !== 'active') {
      return false;
    }
    
    // ビジネスルール: 開始時刻の24時間前まで削除可能
    const twentyFourHoursBefore = new Date(reservation.startTime.getTime() - 24 * 60 * 60 * 1000);
    if (new Date() > twentyFourHoursBefore) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
```

### 3.3 データストアインターフェース
```typescript
interface DataStore {
  findReservationById(id: string): Promise<ReservationRecord | null>;
  findResourceById(id: string): Promise<ResourceRecord | null>;
}

// メモリ内実装
class InMemoryDataStore implements DataStore {
  private reservations: Map<string, ReservationRecord> = new Map();
  private resources: Map<string, ResourceRecord> = new Map();

  async findReservationById(id: string): Promise<ReservationRecord | null> {
    return this.reservations.get(id) || null;
  }

  async findResourceById(id: string): Promise<ResourceRecord | null> {
    return this.resources.get(id) || null;
  }
}
```

## 4. エラーケース

### 4.1 エラー定義
```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class DataAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataAccessError';
  }
}
```

### 4.2 エラーハンドリング
```typescript
class ReservationDetailController {
  private service: ReservationDetailService;
  private view: ReservationDetailView;

  async loadReservationDetail(reservationId: string): Promise<void> {
    try {
      this.view.showLoadingState();
      
      // 予約詳細取得
      const reservation = await this.service.getReservationDetail(reservationId);
      this.view.displayReservationDetail(reservation);
      
      // リソース情報取得
      const resource = await this.service.getResourceInfo(reservation.resourceId);
      this.view.displayResourceInfo(resource);
      
      // 権限チェック
      const canEdit = await this.service.checkEditPermission(reservationId);
      const canDelete = await this.service.checkDeletePermission(reservationId);
      
      this.view.showEditButton(canEdit);
      this.view.showDeleteButton(canDelete);
      
    } catch (error) {
      if (error instanceof NotFoundError) {
        this.view.showNotFoundState();
      } else if (error instanceof ValidationError) {
        this.view.showErrorState(new Error('Invalid reservation ID'));
      } else {
        this.view.showErrorState(new Error('Failed to load reservation details'));
      }
    }
  }
}
```

## 5. 依存関係

### 5.1 内部依存
- DataStore: データ永続化層
- バリデーションユーティリティ: UUID検証、日時検証
- エラークラス: カスタムエラー定義

### 5.2 外部依存（最小限）
- 日付操作ライブラリ（オプション）
- UUID生成/検証ライブラリ（オプション）

### 5.3 認証機能との統合ポイント
```typescript
// 将来の認証統合のためのインターフェース
interface AuthContext {
  userId?: string;
  permissions?: string[];
}

// 認証コンテキストを受け取れる拡張版
interface AuthAwareReservationDetailService extends ReservationDetailService {
  setAuthContext(context: AuthContext): void;
  checkEditPermission(reservationId: string, context?: AuthContext): Promise<boolean>;
  checkDeletePermission(reservationId: string, context?: AuthContext): Promise<boolean>;
}
```

## 6. 設定とカスタマイズ

### 6.1 ビジネスルール設定
```typescript
interface ReservationDetailConfig {
  editAllowedBeforeHours: number; // デフォルト: 1時間前
  deleteAllowedBeforeHours: number; // デフォルト: 24時間前
  showMetadata: boolean; // メタデータ表示の有無
  dateFormat: string; // 日付表示フォーマット
}

const defaultConfig: ReservationDetailConfig = {
  editAllowedBeforeHours: 1,
  deleteAllowedBeforeHours: 24,
  showMetadata: false,
  dateFormat: 'YYYY-MM-DD HH:mm'
};
```

## 7. テスト考慮事項

### 7.1 ユニットテスト対象
- 予約詳細取得の正常系/異常系
- リソース情報取得の正常系/異常系
- 権限チェックロジック（各種条件）
- エラーハンドリング

### 7.2 統合テスト対象
- コントローラーとサービスの連携
- ビューの更新処理
- エラー状態の表示

## 8. パフォーマンス考慮事項

- 予約とリソースの情報は並列取得可能
- 権限チェックはキャッシュ可能（TTL: 5分程度）
- 大量のメタデータがある場合は遅延読み込みを検討

## 9. セキュリティ考慮事項

- 予約IDの推測を防ぐためUUID v4を使用
- XSS対策: 全ての表示データをエスケープ
- 権限チェックは必ずサーバーサイドで実施