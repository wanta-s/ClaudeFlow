# タスク作成機能 詳細仕様書

## 1. 概要
タスク管理アプリケーションの中核機能である「タスク作成」機能の詳細仕様を定義する。

### 1.1 機能ID
- **ID**: feature_003
- **名称**: タスク作成
- **優先度**: 2
- **コア機能**: true
- **依存関係**: feature_002 (ユーザーログイン)

## 2. インターフェース定義

### 2.1 API エンドポイント
```typescript
POST /api/tasks
```

### 2.2 リクエストインターフェース
```typescript
interface CreateTaskRequest {
  title: string;           // タスクタイトル（必須、1-255文字）
  description?: string;    // タスク詳細（任意、最大1000文字）
  dueDate?: string;       // 期限日（任意、ISO8601形式）
  priority?: 'low' | 'medium' | 'high';  // 優先度（任意、デフォルト: 'medium'）
  tags?: string[];        // タグ（任意、最大10個、各20文字以内）
}
```

### 2.3 レスポンスインターフェース
```typescript
interface CreateTaskResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    dueDate: string | null;
    tags: string[];
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
```

## 3. サービス層

### 3.1 TaskService インターフェース
```typescript
interface ITaskService {
  createTask(userId: string, taskData: CreateTaskRequest): Promise<Task>;
  validateTaskData(taskData: CreateTaskRequest): ValidationResult;
}
```

### 3.2 主要メソッドのシグネチャ
```typescript
class TaskService implements ITaskService {
  constructor(
    private taskRepository: ITaskRepository,
    private userRepository: IUserRepository
  ) {}

  async createTask(userId: string, taskData: CreateTaskRequest): Promise<Task> {
    // 1. バリデーション
    const validation = this.validateTaskData(taskData);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // 2. ユーザー存在確認
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 3. タスクエンティティ作成
    const task = new Task({
      id: generateId(),
      userId,
      title: taskData.title,
      description: taskData.description || null,
      status: 'pending',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      tags: taskData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 4. 永続化
    return await this.taskRepository.create(task);
  }

  validateTaskData(taskData: CreateTaskRequest): ValidationResult {
    const errors: Record<string, string> = {};

    // タイトルのバリデーション
    if (!taskData.title || taskData.title.trim().length === 0) {
      errors.title = 'タイトルは必須項目です';
    } else if (taskData.title.length > 255) {
      errors.title = 'タイトルは255文字以内で入力してください';
    }

    // 説明のバリデーション
    if (taskData.description && taskData.description.length > 1000) {
      errors.description = '説明は1000文字以内で入力してください';
    }

    // 期限日のバリデーション
    if (taskData.dueDate) {
      const date = new Date(taskData.dueDate);
      if (isNaN(date.getTime())) {
        errors.dueDate = '有効な日付形式で入力してください';
      }
    }

    // タグのバリデーション
    if (taskData.tags) {
      if (taskData.tags.length > 10) {
        errors.tags = 'タグは最大10個まで設定できます';
      } else {
        taskData.tags.forEach((tag, index) => {
          if (tag.length > 20) {
            errors[`tags.${index}`] = `タグ「${tag}」は20文字以内で入力してください`;
          }
        });
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
```

## 4. リポジトリ層

### 4.1 TaskRepository インターフェース
```typescript
interface ITaskRepository {
  create(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findByUserId(userId: string): Promise<Task[]>;
}
```

### 4.2 実装例
```typescript
class TaskRepository implements ITaskRepository {
  constructor(private db: Database) {}

  async create(task: Task): Promise<Task> {
    const query = `
      INSERT INTO tasks (
        id, user_id, title, description, status, 
        priority, due_date, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(query, [
      task.id,
      task.userId,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.dueDate,
      JSON.stringify(task.tags),
      task.createdAt,
      task.updatedAt
    ]);

    return task;
  }
}
```

## 5. コントローラー層

### 5.1 APIルートハンドラー
```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TaskService } from '@/services/TaskService';
import { TaskRepository } from '@/repositories/TaskRepository';

export async function POST(request: NextRequest) {
  try {
    // 1. 認証確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'UNAUTHORIZED', 
            message: '認証が必要です' 
          } 
        },
        { status: 401 }
      );
    }

    // 2. リクエストボディ解析
    const body = await request.json();

    // 3. サービス呼び出し
    const taskService = new TaskService(
      new TaskRepository(db),
      new UserRepository(db)
    );

    const task = await taskService.createTask(session.user.id, body);

    // 4. レスポンス返却
    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString() || null,
        tags: task.tags,
        userId: task.userId,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
      }
    });

  } catch (error) {
    // エラーハンドリング
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
            details: error.errors
          }
        },
        { status: 400 }
      );
    }

    console.error('Task creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'タスクの作成に失敗しました'
        }
      },
      { status: 500 }
    );
  }
}
```

## 6. エラーケース

### 6.1 バリデーションエラー
- **コード**: VALIDATION_ERROR
- **HTTPステータス**: 400
- **ケース**:
  - タイトル未入力
  - タイトル文字数超過（255文字以上）
  - 説明文字数超過（1000文字以上）
  - 無効な日付形式
  - タグ数超過（10個以上）
  - タグ文字数超過（20文字以上）

### 6.2 認証エラー
- **コード**: UNAUTHORIZED
- **HTTPステータス**: 401
- **ケース**:
  - セッション未確立
  - トークン無効/期限切れ

### 6.3 サーバーエラー
- **コード**: INTERNAL_ERROR
- **HTTPステータス**: 500
- **ケース**:
  - データベース接続エラー
  - トランザクション失敗
  - 予期しない例外

## 7. 依存関係

### 7.1 外部ライブラリ
```json
{
  "next": "^15.0.0",
  "next-auth": "^4.24.0",
  "bcrypt": "^5.1.0",
  "zod": "^3.22.0",
  "sqlite3": "^5.1.0"
}
```

### 7.2 内部モジュール
- `@/lib/auth`: 認証設定
- `@/lib/db`: データベース接続
- `@/models/Task`: タスクエンティティ
- `@/models/User`: ユーザーエンティティ
- `@/services/TaskService`: タスクサービス
- `@/repositories/TaskRepository`: タスクリポジトリ
- `@/repositories/UserRepository`: ユーザーリポジトリ

## 8. セキュリティ考慮事項

### 8.1 入力検証
- SQLインジェクション対策（プリペアドステートメント使用）
- XSS対策（入力値のサニタイゼーション）
- 文字数制限の厳密な適用

### 8.2 認証・認可
- JWTトークンによる認証
- ユーザーIDの改ざん防止
- セッション管理

### 8.3 データ保護
- 個人情報の暗号化
- HTTPSによる通信の暗号化
- CORS設定による不正アクセス防止

## 9. パフォーマンス最適化

### 9.1 データベース
- インデックスの適切な設定（user_id, created_at）
- N+1問題の回避
- コネクションプーリング

### 9.2 キャッシング
- タスク一覧のキャッシュ戦略
- CDNによる静的コンテンツ配信

### 9.3 バリデーション
- クライアントサイドでの事前検証
- 非同期バリデーション

## 10. テスト要件

### 10.1 単体テスト
```typescript
describe('TaskService', () => {
  describe('createTask', () => {
    it('有効なデータでタスクを作成できる', async () => {
      // テストコード
    });

    it('タイトルが空の場合エラーを返す', async () => {
      // テストコード
    });
  });
});
```

### 10.2 統合テスト
- APIエンドポイントのE2Eテスト
- データベーストランザクションのテスト
- 認証フローのテスト

### 10.3 負荷テスト
- 同時リクエスト処理
- 大量データ作成時のパフォーマンス