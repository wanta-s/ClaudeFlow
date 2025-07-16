# 予約編集機能 詳細仕様書

## 概要
既存予約の編集機能（日時、内容、参加者の変更）を提供する。コア機能として実装し、認証機能への依存を避けたスタンドアロン設計とする。

## インターフェース定義

### 1. 予約編集リクエスト
```typescript
interface ReservationEditRequest {
  reservationId: string;
  changes: ReservationChanges;
  editorId?: string; // 将来の認証対応用（オプション）
}

interface ReservationChanges {
  title?: string;
  description?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  location?: string;
  participants?: ParticipantChange[];
  resourceId?: string;
  metadata?: Record<string, any>;
}

interface ParticipantChange {
  action: 'add' | 'remove' | 'update';
  participantId: string;
  name?: string;
  email?: string;
  role?: 'organizer' | 'attendee' | 'optional';
}
```

### 2. 予約編集レスポンス
```typescript
interface ReservationEditResponse {
  success: boolean;
  reservation?: UpdatedReservation;
  changes?: AppliedChanges;
  errors?: ValidationError[];
}

interface UpdatedReservation {
  id: string;
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  location: string;
  resourceId: string;
  participants: Participant[];
  status: 'active' | 'cancelled' | 'completed';
  version: number; // 楽観的ロック用
  updatedAt: Date;
  updatedBy?: string;
}

interface AppliedChanges {
  field: string;
  oldValue: any;
  newValue: any;
  appliedAt: Date;
}
```

### 3. 編集検証
```typescript
interface EditValidation {
  isValid: boolean;
  conflicts?: ConflictInfo[];
  warnings?: string[];
}

interface ConflictInfo {
  type: 'resource' | 'participant' | 'time';
  message: string;
  conflictingReservations?: string[];
}
```

## 主要メソッドのシグネチャ

### ReservationEditService
```typescript
class ReservationEditService {
  /**
   * 予約を編集する
   * @param request 編集リクエスト
   * @returns 編集結果
   */
  async editReservation(request: ReservationEditRequest): Promise<ReservationEditResponse>;

  /**
   * 編集内容を検証する
   * @param reservationId 予約ID
   * @param changes 変更内容
   * @returns 検証結果
   */
  async validateEdit(reservationId: string, changes: ReservationChanges): Promise<EditValidation>;

  /**
   * 編集履歴を取得する
   * @param reservationId 予約ID
   * @param limit 取得件数
   * @returns 編集履歴
   */
  async getEditHistory(reservationId: string, limit?: number): Promise<EditHistory[]>;

  /**
   * 編集をロールバックする
   * @param reservationId 予約ID
   * @param version ロールバック先のバージョン
   * @returns ロールバック結果
   */
  async rollbackEdit(reservationId: string, version: number): Promise<ReservationEditResponse>;
}
```

### EditValidationService
```typescript
class EditValidationService {
  /**
   * 時間変更の妥当性を検証
   * @param reservation 現在の予約
   * @param newStart 新しい開始時刻
   * @param newEnd 新しい終了時刻
   * @returns 検証結果
   */
  validateTimeChange(
    reservation: Reservation,
    newStart?: Date,
    newEnd?: Date
  ): ValidationResult;

  /**
   * リソースの利用可能性を確認
   * @param resourceId リソースID
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @param excludeReservationId 除外する予約ID
   * @returns 利用可能かどうか
   */
  async checkResourceAvailability(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: string
  ): Promise<boolean>;

  /**
   * 参加者の変更を検証
   * @param changes 参加者の変更リスト
   * @returns 検証結果
   */
  validateParticipantChanges(changes: ParticipantChange[]): ValidationResult;
}
```

### DataPersistenceService
```typescript
class DataPersistenceService {
  /**
   * 予約を更新する
   * @param id 予約ID
   * @param updates 更新内容
   * @param version 現在のバージョン（楽観的ロック）
   * @returns 更新された予約
   */
  async updateReservation(
    id: string,
    updates: Partial<Reservation>,
    version: number
  ): Promise<Reservation>;

  /**
   * 編集履歴を保存する
   * @param history 編集履歴
   */
  async saveEditHistory(history: EditHistory): Promise<void>;

  /**
   * 予約のスナップショットを保存する
   * @param reservation 予約データ
   * @param version バージョン番号
   */
  async saveSnapshot(reservation: Reservation, version: number): Promise<void>;
}
```

## エラーケース

### 1. 検証エラー
```typescript
enum EditValidationError {
  RESERVATION_NOT_FOUND = 'RESERVATION_NOT_FOUND',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  PARTICIPANT_CONFLICT = 'PARTICIPANT_CONFLICT',
  PAST_DATE_EDIT = 'PAST_DATE_EDIT',
  INVALID_PARTICIPANT_ACTION = 'INVALID_PARTICIPANT_ACTION',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS'
}

interface EditError {
  code: EditValidationError;
  message: string;
  field?: string;
  details?: any;
}
```

### 2. エラーレスポンス例
```typescript
// 日時の妥当性エラー
{
  success: false,
  errors: [{
    code: 'INVALID_DATE_RANGE',
    message: '終了時刻は開始時刻より後である必要があります',
    field: 'endDateTime'
  }]
}

// リソース競合エラー
{
  success: false,
  errors: [{
    code: 'RESOURCE_CONFLICT',
    message: '指定されたリソースは既に予約されています',
    field: 'resourceId',
    details: {
      conflictingReservations: ['res_123', 'res_456']
    }
  }]
}

// バージョン競合エラー（楽観的ロック）
{
  success: false,
  errors: [{
    code: 'VERSION_CONFLICT',
    message: '予約が他のユーザーによって更新されています。最新の情報を取得してください',
    details: {
      currentVersion: 5,
      requestedVersion: 3
    }
  }]
}
```

## 依存関係

### 1. 内部依存
```typescript
// 最小限の内部依存
import { ValidationService } from './validation';
import { DataStore } from './datastore';
import { EventEmitter } from './events';

// インターフェースによる疎結合
interface IDataStore {
  get(id: string): Promise<any>;
  update(id: string, data: any, version: number): Promise<any>;
  query(filter: any): Promise<any[]>;
}

interface IValidator {
  validate(data: any, rules: any): ValidationResult;
}
```

### 2. 外部依存（最小限）
```typescript
// 日付処理
import { isAfter, isBefore, differenceInMinutes } from 'date-fns';

// データ永続化（プラガブル）
interface IPersistenceAdapter {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
}

// メモリ内実装（デフォルト）
class InMemoryPersistence implements IPersistenceAdapter {
  private store = new Map<string, any>();
  
  async save(key: string, data: any): Promise<void> {
    this.store.set(key, JSON.parse(JSON.stringify(data)));
  }
  
  async load(key: string): Promise<any> {
    return this.store.get(key);
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
```

### 3. 将来の拡張ポイント
```typescript
// 認証連携用インターフェース（将来実装）
interface IAuthContext {
  userId?: string;
  permissions?: string[];
}

// 通知連携用インターフェース（将来実装）
interface INotificationService {
  notify(event: string, data: any): Promise<void>;
}

// 監査ログ用インターフェース（将来実装）
interface IAuditLogger {
  log(action: string, details: any): Promise<void>;
}
```

## 実装上の考慮事項

### 1. 楽観的ロック
- 予約データにバージョン番号を付与
- 更新時にバージョンをチェック
- 競合時は適切なエラーを返す

### 2. 部分更新
- 送信されたフィールドのみを更新
- 未送信フィールドは現在の値を維持
- 明示的なnull/undefinedの扱いを定義

### 3. 履歴管理
- 各編集操作を履歴として記録
- ロールバック機能の提供
- 容量制限による古い履歴の自動削除

### 4. パフォーマンス考慮
- 大量の参加者変更のバッチ処理
- インデックスによる検索最適化
- キャッシュによる頻繁なアクセスの高速化

## 使用例

```typescript
// 基本的な編集
const editRequest: ReservationEditRequest = {
  reservationId: 'res_001',
  changes: {
    title: '更新された会議',
    startDateTime: new Date('2024-01-20T14:00:00'),
    endDateTime: new Date('2024-01-20T15:30:00'),
    participants: [
      { action: 'add', participantId: 'user_003', name: '新規参加者' },
      { action: 'remove', participantId: 'user_002' }
    ]
  }
};

const result = await editService.editReservation(editRequest);

if (result.success) {
  console.log('予約が更新されました:', result.reservation);
  console.log('適用された変更:', result.changes);
} else {
  console.error('エラー:', result.errors);
}

// 検証のみ実行
const validation = await editService.validateEdit('res_001', editRequest.changes);
if (!validation.isValid) {
  console.warn('競合:', validation.conflicts);
}
```