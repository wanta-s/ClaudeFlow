# 予約一覧表示機能詳細仕様書

## 概要
ユーザーの予約一覧を表示する機能。フィルタリング、ソート、ページネーション機能を提供し、スタンドアロンで動作する設計とする。

## インターフェース定義

### 予約データモデル
```typescript
interface Reservation {
  id: string;
  resourceId: string;
  resourceName: string;
  startDateTime: Date;
  endDateTime: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  purpose?: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string; // 認証機能追加時に使用
}

interface ReservationListFilter {
  status?: Reservation['status'] | Reservation['status'][];
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  searchText?: string; // リソース名、目的での検索
}

interface SortOptions {
  field: 'startDateTime' | 'createdAt' | 'resourceName' | 'status';
  order: 'asc' | 'desc';
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface ReservationListResult {
  reservations: Reservation[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```

## 主要メソッドのシグネチャ

### ReservationListService
```typescript
class ReservationListService {
  /**
   * 予約一覧を取得
   * @param filter フィルタリング条件
   * @param sort ソート条件
   * @param pagination ページネーション設定
   * @returns 予約一覧結果
   */
  async getReservations(
    filter?: ReservationListFilter,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<ReservationListResult>;

  /**
   * 利用可能なリソース一覧を取得（フィルタ用）
   * @returns リソースID配列
   */
  async getAvailableResources(): Promise<Array<{id: string, name: string}>>;

  /**
   * 予約ステータス一覧を取得（フィルタ用）
   * @returns ステータス配列
   */
  getReservationStatuses(): Array<{value: Reservation['status'], label: string}>;
}
```

### ReservationRepository
```typescript
interface ReservationRepository {
  /**
   * 条件に基づいて予約を検索
   */
  find(
    filter: ReservationListFilter,
    sort: SortOptions,
    pagination: PaginationOptions
  ): Promise<{data: Reservation[], total: number}>;

  /**
   * 全リソースを取得
   */
  getAllResources(): Promise<Array<{id: string, name: string}>>;
}
```

## エラーケース

### エラーコード定義
```typescript
enum ReservationListErrorCode {
  INVALID_FILTER = 'INVALID_FILTER',
  INVALID_PAGINATION = 'INVALID_PAGINATION',
  INVALID_SORT = 'INVALID_SORT',
  DATA_ACCESS_ERROR = 'DATA_ACCESS_ERROR',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE'
}

interface ReservationListError {
  code: ReservationListErrorCode;
  message: string;
  details?: any;
}
```

### エラーケース一覧
1. **無効なフィルタパラメータ**
   - 不正な日付範囲（開始日 > 終了日）
   - 存在しないステータス値
   - 不正なリソースID

2. **無効なページネーション**
   - ページ番号が0以下
   - 取得件数が範囲外（1-100）

3. **無効なソート条件**
   - 存在しないフィールド名
   - 不正なソート順序

4. **データアクセスエラー**
   - ストレージ読み取りエラー
   - データ整合性エラー

## 依存関係

### 必須依存
- なし（スタンドアロン動作）

### オプション依存
```typescript
interface OptionalDependencies {
  // 認証機能追加時
  authService?: {
    getCurrentUserId(): string | null;
  };
  
  // ロギング
  logger?: {
    info(message: string, data?: any): void;
    error(message: string, error?: any): void;
  };
}
```

## データストレージ

### メモリ内ストレージ実装
```typescript
class InMemoryReservationStore implements ReservationRepository {
  private reservations: Map<string, Reservation> = new Map();
  private resources: Map<string, {id: string, name: string}> = new Map();

  constructor() {
    // サンプルデータの初期化
    this.initializeSampleData();
  }

  async find(
    filter: ReservationListFilter,
    sort: SortOptions,
    pagination: PaginationOptions
  ): Promise<{data: Reservation[], total: number}> {
    // フィルタリング、ソート、ページネーション処理
  }
}
```

### ファイルベースストレージ実装（オプション）
```typescript
class FileBasedReservationStore implements ReservationRepository {
  private dataFile: string = './data/reservations.json';
  
  async find(
    filter: ReservationListFilter,
    sort: SortOptions,
    pagination: PaginationOptions
  ): Promise<{data: Reservation[], total: number}> {
    // JSONファイルからの読み取りと処理
  }
}
```

## 実装例

### 基本的な使用例
```typescript
const service = new ReservationListService();

// フィルタなしで全件取得
const allReservations = await service.getReservations();

// ステータスでフィルタリング
const confirmedReservations = await service.getReservations(
  { status: 'confirmed' },
  { field: 'startDateTime', order: 'asc' },
  { page: 1, limit: 20 }
);

// 日付範囲でフィルタリング
const weekReservations = await service.getReservations({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-07')
});

// テキスト検索
const searchResults = await service.getReservations({
  searchText: '会議室'
});
```

## パフォーマンス考慮事項

1. **ページネーション必須**
   - デフォルト: 20件/ページ
   - 最大: 100件/ページ

2. **インデックス設計**
   - startDateTime
   - status
   - resourceId

3. **キャッシュ戦略**
   - リソース一覧のキャッシュ（5分）
   - フィルタ結果のキャッシュ（オプション）

## セキュリティ考慮事項

1. **入力検証**
   - SQLインジェクション対策（パラメータ化クエリ）
   - XSS対策（出力エスケープ）

2. **アクセス制御**
   - 認証機能追加時のユーザー別フィルタリング準備
   - 公開/非公開リソースの概念（将来拡張）

## テスト要件

1. **単体テスト**
   - フィルタリングロジック
   - ソートロジック
   - ページネーション計算

2. **統合テスト**
   - 複合フィルタ条件
   - 大量データでのパフォーマンス
   - エラーハンドリング

## 拡張性

1. **カスタムフィルタ**
   - フィルタプラグイン機構
   - 動的フィルタ条件

2. **エクスポート機能**
   - CSV/Excel出力（将来実装）
   - PDF出力（将来実装）

3. **リアルタイム更新**
   - WebSocket連携（将来実装）
   - ポーリング更新（オプション）