# 実装結果

## プロジェクト構造
```
task-management-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   └── taskService.ts
│   │   ├── store/
│   │   │   ├── index.ts
│   │   │   └── slices/
│   │   │       ├── authSlice.ts
│   │   │       ├── taskSlice.ts
│   │   │       └── uiSlice.ts
│   │   ├── utils/
│   │   │   └── theme.ts
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Tasks.tsx
│   │   │   └── Profile.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── userController.ts
│   │   │   └── taskController.ts
│   │   ├── services/
│   │   │   ├── userService.ts
│   │   │   └── taskService.ts
│   │   ├── repositories/
│   │   │   ├── userRepository.ts
│   │   │   └── taskRepository.ts
│   │   ├── models/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── errors.ts
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts
│   │   │   └── errorMiddleware.ts
│   │   ├── config/
│   │   │   └── index.ts
│   │   ├── app.ts
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── Dockerfile
├── database/
└── docker-compose.yml
```

## 実装コード例

### バックエンド - UserController
```typescript
// backend/src/controllers/userController.ts
export class UserController {
  constructor(private userService: UserService) {}

  getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      const user = await this.userService.findById(req.user.userId)
      if (!user) {
        throw new AppError(ErrorCode.AUTH002, 401)
      }

      res.json(user)
    } catch (error) {
      next(error)
    }
  }
}
```

### バックエンド - TaskService
```typescript
// backend/src/services/taskService.ts
export class TaskService {
  constructor(private taskRepository: TaskRepository) {}

  async getTasks(
    userId: string,
    filters: TaskFilters & { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Task>> {
    return this.taskRepository.findAll(userId, filters)
  }

  async createTask(
    taskData: {
      title: string
      description?: string
      status?: string
      priority?: string
      dueDate?: string
    },
    userId: string
  ): Promise<Task> {
    const data = {
      userId,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status?.toUpperCase() as TaskStatus | undefined,
      priority: taskData.priority?.toUpperCase() as TaskPriority | undefined,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
    }

    try {
      return await this.taskRepository.create(data)
    } catch (error) {
      throw new AppError(ErrorCode.TASK001, 400)
    }
  }
}
```

### フロントエンド - Redux Store
```tsx
// frontend/src/store/slices/taskSlice.ts
const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action) => {
      state.tasks = action.payload.tasks
      state.pagination = action.payload.pagination
    },
    addTask: (state, action) => {
      state.tasks.unshift(action.payload)
      state.pagination.total += 1
    },
    updateTask: (state, action) => {
      const index = state.tasks.findIndex(
        (task) => task.id === action.payload.id
      )
      if (index !== -1) {
        state.tasks[index] = action.payload
      }
    },
  },
})
```

### フロントエンド - API Service
```tsx
// frontend/src/services/taskService.ts
export const taskService = {
  async getTasks(filters?: TaskFilters): Promise<TasksResponse> {
    const response = await api.get<TasksResponse>('/tasks', {
      params: filters,
    })
    return response.data
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    const response = await api.post<Task>('/tasks', data)
    return response.data
  },

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const response = await api.put<Task>(`/tasks/${id}`, data)
    return response.data
  },
}
```

## セットアップ手順
1. **依存関係インストール**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **環境変数設定**
   ```bash
   cd backend
   cp .env.example .env
   # .envファイルを編集して必要な値を設定
   ```

3. **データベース初期化**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **開発サーバー起動（Docker使用）**
   ```bash
   docker-compose up -d
   ```

5. **開発サーバー起動（ローカル）**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## 実装済み機能
- ✅ プロジェクト構造とセットアップ
- ✅ データベーススキーマ（Prisma）
- ✅ バックエンドAPI実装
  - ✅ 認証API（登録、ログイン、ログアウト）
  - ✅ ユーザーAPI（情報取得、更新）
  - ✅ タスクAPI（CRUD操作）
- ✅ JWT認証ミドルウェア
- ✅ エラーハンドリング
- ✅ 入力検証（Joi）
- ✅ フロントエンド基本構造
  - ✅ Redux Toolkit設定
  - ✅ API統合レイヤー
  - ✅ 認証フロー
  - ✅ Material-UI設定
- ✅ Docker環境設定
- ⬜ フロントエンドコンポーネント実装（次フェーズ）
- ⬜ テスト実装（次フェーズ）

## 技術的特徴
1. **型安全性**: TypeScriptを全面的に使用
2. **レイヤードアーキテクチャ**: Controller → Service → Repository パターン
3. **エラーハンドリング**: 統一されたエラーコード体系
4. **セキュリティ**: JWT認証、Rate Limiting、入力検証
5. **状態管理**: Redux Toolkitによる予測可能な状態管理
6. **開発環境**: Docker Composeによる環境構築の簡素化