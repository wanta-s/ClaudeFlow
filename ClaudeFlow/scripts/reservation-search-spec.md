# 予約検索機能 詳細仕様書

## 機能概要
キーワード、日付範囲、ステータスを使用した予約検索機能を提供する。

## インターフェース定義

### 検索条件インターフェース
```typescript
interface ReservationSearchCriteria {
  keyword?: string;           // 検索キーワード（予約名、説明、リソース名を対象）
  startDate?: Date;          // 検索期間開始日
  endDate?: Date;            // 検索期間終了日
  status?: ReservationStatus[]; // ステータス（複数選択可）
  limit?: number;            // 取得件数（デフォルト: 20、最大: 100）
  offset?: number;           // オフセット（ページネーション用）
}

interface ReservationStatus {
  value: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  label: string;
}

interface SearchResult {
  reservations: Reservation[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

interface Reservation {
  id: string;
  resourceId: string;
  resourceName: string;
  reservationName: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus['value'];
  createdAt: Date;
  updatedAt: Date;
}
```

## 主要メソッドのシグネチャ

### ReservationSearchService
```typescript
class ReservationSearchService {
  /**
   * 予約を検索する
   * @param criteria 検索条件
   * @returns 検索結果
   */
  async search(criteria: ReservationSearchCriteria): Promise<SearchResult> {
    // 実装
  }

  /**
   * 検索条件をバリデートする
   * @param criteria 検索条件
   * @returns バリデーション結果
   */
  validateCriteria(criteria: ReservationSearchCriteria): ValidationResult {
    // 実装
  }

  /**
   * キーワード検索用のインデックスを構築する
   * @param reservation 予約データ
   */
  private buildSearchIndex(reservation: Reservation): string {
    // 実装
  }
}
```

### SearchRepository
```typescript
interface SearchRepository {
  /**
   * 条件に基づいて予約を検索
   */
  findByConditions(conditions: SearchConditions): Promise<Reservation[]>;
  
  /**
   * 検索条件に一致する件数を取得
   */
  countByConditions(conditions: SearchConditions): Promise<number>;
}

interface SearchConditions {
  keywords?: string[];
  dateRange?: { start: Date; end: Date };
  statuses?: string[];
  limit: number;
  offset: number;
}
```

## エラーケース

### エラーコード定義
```typescript
enum SearchErrorCode {
  INVALID_DATE_RANGE = 'SEARCH_001',
  INVALID_KEYWORD = 'SEARCH_002',
  INVALID_PAGINATION = 'SEARCH_003',
  SEARCH_TIMEOUT = 'SEARCH_004',
  DATA_ACCESS_ERROR = 'SEARCH_005'
}

interface SearchError {
  code: SearchErrorCode;
  message: string;
  details?: any;
}
```

### エラーケース詳細
1. **日付範囲エラー**
   - 開始日が終了日より後
   - 日付フォーマット不正
   - 検索可能期間超過（例：1年以上）

2. **キーワードエラー**
   - 最小文字数未満（2文字未満）
   - 最大文字数超過（100文字超）
   - 不正な文字列（SQLインジェクション対策）

3. **ページネーションエラー**
   - 負の値
   - 最大取得件数超過

4. **タイムアウトエラー**
   - 検索処理が設定時間を超過

## 依存関係

### 内部依存（スタンドアロン実装）
```typescript
// データストアインターフェース（メモリまたはファイルベース）
interface DataStore {
  find(predicate: (item: Reservation) => boolean): Reservation[];
  count(predicate: (item: Reservation) => boolean): number;
}

// 検索インデックスマネージャー
class SearchIndexManager {
  private index: Map<string, Set<string>>; // keyword -> reservation IDs
  
  addToIndex(reservation: Reservation): void;
  removeFromIndex(reservationId: string): void;
  search(keyword: string): string[];
}
```

### 外部依存（将来的な統合用）
```typescript
// 認証コンテキスト（オプショナル）
interface AuthContext {
  userId?: string;
  permissions?: string[];
}

// 監査ログインターフェース（オプショナル）
interface AuditLogger {
  logSearch(criteria: ReservationSearchCriteria, results: number): void;
}
```

## 実装詳細

### 検索ロジック
```typescript
class ReservationSearchEngine {
  /**
   * キーワード検索の実装
   * - 予約名、説明、リソース名を対象
   * - 部分一致検索
   * - 大文字小文字を区別しない
   */
  private searchByKeyword(reservations: Reservation[], keyword: string): Reservation[] {
    const normalizedKeyword = keyword.toLowerCase();
    return reservations.filter(r => 
      r.reservationName.toLowerCase().includes(normalizedKeyword) ||
      r.description?.toLowerCase().includes(normalizedKeyword) ||
      r.resourceName.toLowerCase().includes(normalizedKeyword)
    );
  }

  /**
   * 日付範囲検索の実装
   * - 開始時刻または終了時刻が指定範囲内
   */
  private searchByDateRange(
    reservations: Reservation[], 
    startDate: Date, 
    endDate: Date
  ): Reservation[] {
    return reservations.filter(r => 
      (r.startTime >= startDate && r.startTime <= endDate) ||
      (r.endTime >= startDate && r.endTime <= endDate) ||
      (r.startTime <= startDate && r.endTime >= endDate)
    );
  }

  /**
   * ステータス検索の実装
   */
  private searchByStatus(
    reservations: Reservation[], 
    statuses: string[]
  ): Reservation[] {
    return reservations.filter(r => statuses.includes(r.status));
  }
}
```

### バリデーションルール
```typescript
const searchValidationRules = {
  keyword: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.ぁ-んァ-ヶー一-龯]+$/
  },
  dateRange: {
    maxRangeDays: 365,
    minDate: new Date('2020-01-01'),
    maxDate: new Date('2030-12-31')
  },
  pagination: {
    maxLimit: 100,
    defaultLimit: 20
  }
};
```

### レスポンス例
```json
{
  "reservations": [
    {
      "id": "res_001",
      "resourceId": "room_001",
      "resourceName": "会議室A",
      "reservationName": "週次ミーティング",
      "description": "開発チーム定例会議",
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T11:00:00Z",
      "status": "confirmed",
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-10T09:00:00Z"
    }
  ],
  "totalCount": 25,
  "currentPage": 1,
  "totalPages": 2
}
```

## パフォーマンス考慮事項

1. **インデックス戦略**
   - キーワード検索用の転置インデックス
   - 日付でのソート済みリスト
   - ステータス別のグループ化

2. **ページネーション**
   - カーソルベースのページネーション対応
   - 大量データ対応

3. **キャッシュ戦略**
   - 頻繁な検索条件のキャッシュ
   - TTL: 5分

## セキュリティ考慮事項

1. **入力検証**
   - SQLインジェクション対策
   - XSS対策（HTMLエスケープ）

2. **レート制限**
   - 1分あたり60回の検索制限
   - IPベースの制限

3. **データアクセス制御**
   - 将来的な認証統合時の権限チェック準備