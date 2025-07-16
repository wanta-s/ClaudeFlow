// 最小限の型定義
interface Reservation {
  id: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
  status: string;
}

interface DeleteResult {
  success: boolean;
  deletedId?: string;
}

interface BulkDeleteResult {
  successful: string[];
  failed: string[];
}

interface RestoreResult {
  success: boolean;
  restoredId?: string;
}

export { Reservation, DeleteResult, BulkDeleteResult, RestoreResult };