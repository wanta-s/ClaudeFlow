export enum ErrorCode {
  // Authentication errors
  AUTH001 = 'AUTH001',
  AUTH002 = 'AUTH002',
  AUTH003 = 'AUTH003',
  
  // User errors
  USER001 = 'USER001',
  USER002 = 'USER002',
  
  // Task errors
  TASK001 = 'TASK001',
  TASK002 = 'TASK002',
  TASK003 = 'TASK003',
  
  // System errors
  SYSTEM001 = 'SYSTEM001',
  
  // Validation errors
  VALIDATION001 = 'VALIDATION001',
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.AUTH001]: 'メールアドレスまたはパスワードが正しくありません',
  [ErrorCode.AUTH002]: '無効なトークンです',
  [ErrorCode.AUTH003]: 'トークンの有効期限が切れています',
  [ErrorCode.USER001]: 'ユーザー登録に失敗しました',
  [ErrorCode.USER002]: 'このメールアドレスは既に登録されています',
  [ErrorCode.TASK001]: 'タスクの作成に失敗しました',
  [ErrorCode.TASK002]: 'タスクが見つかりません',
  [ErrorCode.TASK003]: 'このタスクへのアクセス権限がありません',
  [ErrorCode.SYSTEM001]: '内部サーバーエラーが発生しました',
  [ErrorCode.VALIDATION001]: '入力値が正しくありません',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message?: string
  ) {
    super(message || ErrorMessages[code])
    this.name = 'AppError'
  }
}