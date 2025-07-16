# 予約削除機能 詳細仕様書

## 概要
予約のキャンセル・削除機能を提供する。コア機能として実装し、認証機能への依存を最小限に抑える。

## インターフェース定義

### IReservation
```typescript
interface IReservation {
  id: string;
  resourceId: string;
  userId?: string; // 認証機能追加時に使用
  startTime: Date;
  endTime: Date;
  status: 'active' | 'cancelled' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // ソフトデリート用
}
```

### IReservationDeleteService
```typescript
interface IReservationDeleteService {
  // 予約をキャンセル（ソフトデリート）
  cancelReservation(reservationId: string): Promise<DeleteResult>;
  
  // 予約を完全に削除（ハードデリート）
  deleteReservation(reservationId: string, force?: boolean): Promise<DeleteResult>;
  
  // 複数予約の一括削除
  bulkDeleteReservations(reservationIds: string[]): Promise<BulkDeleteResult>;
  
  // 削除済み予約の復元
  restoreReservation(reservationId: string): Promise<RestoreResult>;
}
```

### 結果オブジェクト
```typescript
interface DeleteResult {
  success: boolean;
  deletedId?: string;
  error?: DeleteError;
  deletedAt?: Date;
}

interface BulkDeleteResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: DeleteError;
  }>;
  totalProcessed: number;
}

interface RestoreResult {
  success: boolean;
  restoredId?: string;
  error?: RestoreError;
}
```

## 主要メソッドのシグネチャ

### cancelReservation
```typescript
async cancelReservation(reservationId: string): Promise<DeleteResult> {
  // 1. 予約の存在確認
  // 2. 削除可能性チェック（ビジネスルール）
  // 3. ステータスを'cancelled'に更新
  // 4. deletedAtにタイムスタンプを設定
  // 5. 結果を返す
}
```

### deleteReservation
```typescript
async deleteReservation(
  reservationId: string, 
  force: boolean = false
): Promise<DeleteResult> {
  // 1. 予約の存在確認
  // 2. forceがfalseの場合、削除制約チェック
  // 3. 物理削除またはステータス更新
  // 4. 関連データのクリーンアップ
  // 5. 結果を返す
}
```

### bulkDeleteReservations
```typescript
async bulkDeleteReservations(
  reservationIds: string[]
): Promise<BulkDeleteResult> {
  // 1. バッチサイズの検証（最大100件）
  // 2. 各予約に対して削除処理を実行
  // 3. 成功/失敗を集計
  // 4. 結果サマリを返す
}
```

## エラーケース

### DeleteError
```typescript
enum DeleteErrorCode {
  NOT_FOUND = 'RESERVATION_NOT_FOUND',
  ALREADY_DELETED = 'RESERVATION_ALREADY_DELETED',
  PAST_RESERVATION = 'CANNOT_DELETE_PAST_RESERVATION',
  IN_PROGRESS = 'CANNOT_DELETE_IN_PROGRESS',
  NO_PERMISSION = 'NO_DELETE_PERMISSION',
  CONSTRAINT_VIOLATION = 'DELETE_CONSTRAINT_VIOLATION'
}

interface DeleteError {
  code: DeleteErrorCode;
  message: string;
  reservationId?: string;
  details?: any;
}
```

### RestoreError
```typescript
enum RestoreErrorCode {
  NOT_FOUND = 'DELETED_RESERVATION_NOT_FOUND',
  NOT_DELETED = 'RESERVATION_NOT_DELETED',
  EXPIRED = 'RESTORE_PERIOD_EXPIRED',
  CONFLICT = 'RESTORE_CONFLICT'
}

interface RestoreError {
  code: RestoreErrorCode;
  message: string;
  reservationId?: string;
}
```

## ビジネスルール

1. **削除可能条件**
   - 予約開始時刻の24時間前まで削除可能
   - 進行中の予約は削除不可
   - 過去の予約は force フラグが必要

2. **ソフトデリート**
   - デフォルトではソフトデリート（status='deleted'）
   - 30日間は復元可能
   - 30日経過後に物理削除

3. **カスケード処理**
   - 予約削除時に関連する通知も削除
   - リソースの利用可能状態を更新

## 依存関係

### 最小限の依存
```typescript
interface Dependencies {
  // データストア（メモリまたはファイルベース）
  dataStore: IReservationDataStore;
  
  // ロガー（オプション）
  logger?: ILogger;
  
  // イベントエミッター（オプション）
  eventEmitter?: IEventEmitter;
}
```

### IReservationDataStore
```typescript
interface IReservationDataStore {
  findById(id: string): Promise<IReservation | null>;
  update(id: string, data: Partial<IReservation>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  findByIds(ids: string[]): Promise<IReservation[]>;
}
```

## 実装例（メモリストア使用）

```typescript
class ReservationDeleteService implements IReservationDeleteService {
  constructor(private dataStore: IReservationDataStore) {}

  async cancelReservation(reservationId: string): Promise<DeleteResult> {
    try {
      const reservation = await this.dataStore.findById(reservationId);
      
      if (!reservation) {
        return {
          success: false,
          error: {
            code: DeleteErrorCode.NOT_FOUND,
            message: `Reservation ${reservationId} not found`
          }
        };
      }

      if (reservation.status === 'deleted' || reservation.status === 'cancelled') {
        return {
          success: false,
          error: {
            code: DeleteErrorCode.ALREADY_DELETED,
            message: 'Reservation is already deleted or cancelled'
          }
        };
      }

      // ビジネスルールチェック
      const now = new Date();
      if (reservation.startTime <= now) {
        return {
          success: false,
          error: {
            code: DeleteErrorCode.IN_PROGRESS,
            message: 'Cannot delete reservation that has already started'
          }
        };
      }

      // ソフトデリート実行
      const deletedAt = new Date();
      const updated = await this.dataStore.update(reservationId, {
        status: 'cancelled',
        deletedAt,
        updatedAt: deletedAt
      });

      return {
        success: updated,
        deletedId: reservationId,
        deletedAt
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: DeleteErrorCode.CONSTRAINT_VIOLATION,
          message: 'Unexpected error during deletion',
          details: error
        }
      };
    }
  }
}
```

## 拡張ポイント

1. **認証統合**
   - userId によるアクセス制御を追加
   - 管理者権限での強制削除

2. **監査ログ**
   - 削除操作の記録
   - 削除理由の保存

3. **通知連携**
   - 削除時の通知送信
   - 関係者への通知

4. **バックアップ**
   - 削除前の自動バックアップ
   - 復元用データの保持