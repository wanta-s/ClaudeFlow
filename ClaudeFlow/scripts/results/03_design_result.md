# 詳細設計書

## アーキテクチャ設計
### システム構成図
```mermaid
graph TB
    subgraph "Client Layer"
        A[Next.js Frontend<br/>React Components]
        B[Mobile Browser<br/>Responsive UI]
    end
    
    subgraph "Application Layer"
        C[Next.js App Router<br/>Server Components]
        D[API Routes<br/>RESTful Endpoints]
        E[NextAuth.js<br/>Authentication]
    end
    
    subgraph "Business Logic Layer"
        F[Reservation Service]
        G[User Service]
        H[Resource Service]
        I[Notification Service]
    end
    
    subgraph "Data Access Layer"
        J[Prisma ORM]
        K[Redis Cache]
    end
    
    subgraph "Database Layer"
        L[(PostgreSQL<br/>Main Database)]
        M[(Redis<br/>Session Store)]
    end
    
    A --> C
    B --> C
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    F --> J
    G --> J
    H --> J
    I --> K
    J --> L
    K --> M
    E --> M
```

### 技術スタック詳細
- **Frontend**: 
  - Next.js 14 (App Router)
  - React 18
  - TypeScript 5
  - Tailwind CSS 3
  - React Query (データフェッチング)
  - React Hook Form (フォーム管理)
  - FullCalendar (カレンダーUI)
  
- **Backend**: 
  - Next.js API Routes
  - TypeScript 5
  - Prisma ORM
  - Zod (バリデーション)
  - bcrypt (パスワード暗号化)
  - jsonwebtoken (JWT)
  
- **インフラ**: 
  - Vercel (アプリケーションホスティング)
  - Vercel Postgres (データベース)
  - Vercel KV (Redis互換キャッシュ)
  - GitHub Actions (CI/CD)

## API設計
### エンドポイント一覧
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | /api/auth/login | ユーザーログイン | 不要 |
| POST | /api/auth/logout | ユーザーログアウト | 要 |
| POST | /api/auth/refresh | トークンリフレッシュ | 要 |
| GET | /api/users | ユーザー一覧取得 | 要(管理者) |
| GET | /api/users/:id | ユーザー詳細取得 | 要 |
| POST | /api/users | ユーザー作成 | 要(管理者) |
| PUT | /api/users/:id | ユーザー更新 | 要 |
| DELETE | /api/users/:id | ユーザー削除 | 要(管理者) |
| GET | /api/reservations | 予約一覧取得 | 要 |
| GET | /api/reservations/:id | 予約詳細取得 | 要 |
| POST | /api/reservations | 予約作成 | 要 |
| PUT | /api/reservations/:id | 予約更新 | 要 |
| DELETE | /api/reservations/:id | 予約削除 | 要 |
| GET | /api/resources | リソース一覧取得 | 要 |
| GET | /api/resources/:id | リソース詳細取得 | 要 |
| POST | /api/resources | リソース作成 | 要(管理者) |
| PUT | /api/resources/:id | リソース更新 | 要(管理者) |
| DELETE | /api/resources/:id | リソース削除 | 要(管理者) |

### API詳細
#### POST /api/auth/login
- **説明**: ユーザー認証を行い、JWTトークンを発行
- **リクエスト**: 
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **レスポンス**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "user"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
  ```

#### GET /api/reservations
- **説明**: 予約一覧を取得（フィルタリング・ページネーション対応）
- **クエリパラメータ**:
  - `resourceId`: リソースID（オプション）
  - `userId`: ユーザーID（オプション）
  - `startDate`: 開始日（ISO 8601形式）
  - `endDate`: 終了日（ISO 8601形式）
  - `status`: ステータス（active, cancelled, completed）
  - `page`: ページ番号（デフォルト: 1）
  - `limit`: 1ページあたりの件数（デフォルト: 20）
- **レスポンス**:
  ```json
  {
    "reservations": [
      {
        "id": "uuid",
        "resourceId": "uuid",
        "userId": "uuid",
        "title": "会議室予約",
        "startTime": "2024-01-15T10:00:00Z",
        "endTime": "2024-01-15T11:00:00Z",
        "status": "active",
        "createdAt": "2024-01-10T08:00:00Z",
        "resource": {
          "id": "uuid",
          "name": "会議室A",
          "type": "meeting_room"
        },
        "user": {
          "id": "uuid",
          "name": "User Name"
        }
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5
    }
  }
  ```

#### POST /api/reservations
- **説明**: 新規予約を作成
- **リクエスト**:
  ```json
  {
    "resourceId": "uuid",
    "title": "会議室予約",
    "description": "定例会議",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T11:00:00Z",
    "attendees": ["user1@example.com", "user2@example.com"],
    "notificationBefore": 15
  }
  ```
- **レスポンス**:
  ```json
  {
    "id": "uuid",
    "resourceId": "uuid",
    "userId": "uuid",
    "title": "会議室予約",
    "description": "定例会議",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T11:00:00Z",
    "status": "active",
    "attendees": ["user1@example.com", "user2@example.com"],
    "notificationBefore": 15,
    "createdAt": "2024-01-10T08:00:00Z"
  }
  ```

## データベース設計
### ER図
```mermaid
erDiagram
    User ||--o{ Reservation : creates
    User ||--o{ Notification : receives
    Resource ||--o{ Reservation : booked_for
    Reservation ||--o{ ReservationAttendee : has
    User ||--o{ ReservationAttendee : attends
    
    User {
        uuid id PK
        string email UK
        string password_hash
        string name
        enum role
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    Resource {
        uuid id PK
        string name
        enum type
        string description
        json metadata
        boolean is_active
        int capacity
        datetime created_at
        datetime updated_at
    }
    
    Reservation {
        uuid id PK
        uuid resource_id FK
        uuid user_id FK
        string title
        text description
        datetime start_time
        datetime end_time
        enum status
        int notification_before
        datetime created_at
        datetime updated_at
        datetime cancelled_at
    }
    
    ReservationAttendee {
        uuid id PK
        uuid reservation_id FK
        uuid user_id FK
        enum status
        datetime responded_at
    }
    
    Notification {
        uuid id PK
        uuid user_id FK
        uuid reservation_id FK
        enum type
        string title
        text message
        boolean is_read
        datetime sent_at
        datetime read_at
    }
```

### テーブル定義
#### users テーブル
| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | ユーザーID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| password_hash | VARCHAR(255) | NOT NULL | パスワードハッシュ |
| name | VARCHAR(100) | NOT NULL | ユーザー名 |
| role | ENUM('admin', 'user') | NOT NULL, DEFAULT 'user' | 権限 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | アクティブフラグ |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

#### resources テーブル
| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | リソースID |
| name | VARCHAR(100) | NOT NULL | リソース名 |
| type | ENUM('meeting_room', 'equipment', 'facility') | NOT NULL | リソース種別 |
| description | TEXT | | 説明 |
| metadata | JSONB | | メタデータ |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | アクティブフラグ |
| capacity | INTEGER | | 収容人数/数量 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

#### reservations テーブル
| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | 予約ID |
| resource_id | UUID | FK, NOT NULL | リソースID |
| user_id | UUID | FK, NOT NULL | ユーザーID |
| title | VARCHAR(200) | NOT NULL | 予約タイトル |
| description | TEXT | | 予約説明 |
| start_time | TIMESTAMP | NOT NULL | 開始時刻 |
| end_time | TIMESTAMP | NOT NULL | 終了時刻 |
| status | ENUM('active', 'cancelled', 'completed') | NOT NULL, DEFAULT 'active' | ステータス |
| notification_before | INTEGER | | 通知タイミング（分） |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| cancelled_at | TIMESTAMP | | キャンセル日時 |

### インデックス
- users.email (UNIQUE)
- reservations.resource_id
- reservations.user_id
- reservations.start_time
- reservations.end_time
- reservations.status
- (resource_id, start_time, end_time) - 予約重複チェック用複合インデックス

## クラス設計
### クラス図
```mermaid
classDiagram
    class AuthService {
        +login(email: string, password: string): Promise<AuthResult>
        +logout(token: string): Promise<void>
        +refreshToken(refreshToken: string): Promise<TokenPair>
        +validateToken(token: string): Promise<User>
        -generateTokens(user: User): TokenPair
        -verifyPassword(password: string, hash: string): Promise<boolean>
    }
    
    class UserService {
        -userRepository: UserRepository
        +getUsers(filter: UserFilter): Promise<PaginatedUsers>
        +getUserById(id: string): Promise<User>
        +createUser(data: CreateUserDto): Promise<User>
        +updateUser(id: string, data: UpdateUserDto): Promise<User>
        +deleteUser(id: string): Promise<void>
        -validateUserData(data: any): void
    }
    
    class ReservationService {
        -reservationRepository: ReservationRepository
        -resourceService: ResourceService
        -notificationService: NotificationService
        +getReservations(filter: ReservationFilter): Promise<PaginatedReservations>
        +getReservationById(id: string): Promise<Reservation>
        +createReservation(data: CreateReservationDto): Promise<Reservation>
        +updateReservation(id: string, data: UpdateReservationDto): Promise<Reservation>
        +cancelReservation(id: string): Promise<void>
        -checkAvailability(resourceId: string, start: Date, end: Date): Promise<boolean>
        -validateReservationTime(start: Date, end: Date): void
    }
    
    class ResourceService {
        -resourceRepository: ResourceRepository
        +getResources(filter: ResourceFilter): Promise<Resource[]>
        +getResourceById(id: string): Promise<Resource>
        +createResource(data: CreateResourceDto): Promise<Resource>
        +updateResource(id: string, data: UpdateResourceDto): Promise<Resource>
        +deleteResource(id: string): Promise<void>
        +checkResourceAvailability(id: string, start: Date, end: Date): Promise<boolean>
    }
    
    class NotificationService {
        -notificationRepository: NotificationRepository
        -emailService: EmailService
        +sendReservationConfirmation(reservation: Reservation): Promise<void>
        +sendReservationReminder(reservation: Reservation): Promise<void>
        +sendCancellationNotification(reservation: Reservation): Promise<void>
        +getNotifications(userId: string): Promise<Notification[]>
        +markAsRead(id: string): Promise<void>
    }
    
    class UserRepository {
        +findAll(filter: UserFilter): Promise<User[]>
        +findById(id: string): Promise<User>
        +findByEmail(email: string): Promise<User>
        +create(data: User): Promise<User>
        +update(id: string, data: Partial<User>): Promise<User>
        +delete(id: string): Promise<void>
    }
    
    class ReservationRepository {
        +findAll(filter: ReservationFilter): Promise<Reservation[]>
        +findById(id: string): Promise<Reservation>
        +findByResourceAndTime(resourceId: string, start: Date, end: Date): Promise<Reservation[]>
        +create(data: Reservation): Promise<Reservation>
        +update(id: string, data: Partial<Reservation>): Promise<Reservation>
        +delete(id: string): Promise<void>
    }
    
    AuthService --> UserService
    ReservationService --> ReservationRepository
    ReservationService --> ResourceService
    ReservationService --> NotificationService
    UserService --> UserRepository
    ResourceService --> ResourceRepository
    NotificationService --> NotificationRepository
```

## シーケンス図
### ユーザーログインフロー
```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Route
    participant Auth as AuthService
    participant US as UserService
    participant DB as Database
    participant Cache as Redis
    
    C->>A: POST /api/auth/login
    A->>Auth: login(email, password)
    Auth->>US: findByEmail(email)
    US->>DB: SELECT * FROM users
    DB-->>US: user
    US-->>Auth: user
    Auth->>Auth: verifyPassword(password, hash)
    Auth->>Auth: generateTokens(user)
    Auth->>Cache: SET session:token
    Cache-->>Auth: OK
    Auth-->>A: {user, token, refreshToken}
    A-->>C: 200 OK {user, token}
```

### 予約作成フロー
```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Route
    participant Auth as AuthMiddleware
    participant RS as ReservationService
    participant ResS as ResourceService
    participant NS as NotificationService
    participant DB as Database
    
    C->>A: POST /api/reservations
    A->>Auth: validateToken(token)
    Auth-->>A: user
    A->>RS: createReservation(data, user)
    RS->>RS: validateReservationTime(start, end)
    RS->>ResS: checkResourceAvailability(resourceId, start, end)
    ResS->>DB: SELECT reservations
    DB-->>ResS: existing reservations
    ResS-->>RS: available: true
    RS->>DB: BEGIN TRANSACTION
    RS->>DB: INSERT reservation
    DB-->>RS: reservation
    RS->>DB: INSERT attendees
    DB-->>RS: OK
    RS->>DB: COMMIT
    RS->>NS: sendReservationConfirmation(reservation)
    NS->>NS: Queue email
    RS-->>A: reservation
    A-->>C: 201 Created
```

### 予約検索フロー
```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Route
    participant Auth as AuthMiddleware
    participant RS as ReservationService
    participant DB as Database
    participant Cache as Redis
    
    C->>A: GET /api/reservations?date=2024-01-15
    A->>Auth: validateToken(token)
    Auth-->>A: user
    A->>Cache: GET reservations:2024-01-15
    alt Cache Hit
        Cache-->>A: cached data
        A-->>C: 200 OK (from cache)
    else Cache Miss
        A->>RS: getReservations(filter)
        RS->>DB: SELECT with JOINs
        DB-->>RS: reservations
        RS->>RS: Format response
        RS-->>A: formatted data
        A->>Cache: SET reservations:2024-01-15
        A-->>C: 200 OK
    end
```

### リアルタイム通知フロー
```mermaid
sequenceDiagram
    participant Scheduler as Cron Job
    participant NS as NotificationService
    participant DB as Database
    participant Email as Email Service
    participant WS as WebSocket
    
    Scheduler->>NS: checkUpcomingReservations()
    NS->>DB: SELECT reservations WHERE notification_time <= NOW
    DB-->>NS: upcoming reservations
    loop For each reservation
        NS->>NS: createNotification(reservation)
        NS->>DB: INSERT notification
        NS->>Email: sendEmail(user, reservation)
        NS->>WS: broadcast(userId, notification)
    end
    NS->>DB: UPDATE last_check_time
```

## セキュリティ設計
### 認証・認可
- JWT (JSON Web Token) によるステートレス認証
- アクセストークン有効期限: 1時間
- リフレッシュトークン有効期限: 7日間
- Role-Based Access Control (RBAC)

### データ保護
- パスワード: bcrypt (ラウンド数: 10)
- HTTPS通信の強制
- SQLインジェクション対策: Prisma ORM使用
- XSS対策: React自動エスケープ + Content Security Policy
- CSRF対策: SameSite Cookieとトークン検証

### 監査ログ
- 全APIアクセスログ記録
- 重要操作（作成・更新・削除）の記録
- ログ保持期間: 90日間

## パフォーマンス最適化
### キャッシュ戦略
- Redis使用によるセッション管理
- 予約一覧のキャッシュ (TTL: 5分)
- リソース情報のキャッシュ (TTL: 1時間)

### データベース最適化
- 適切なインデックスの設定
- N+1問題対策: Prisma includeの活用
- コネクションプーリング設定

### フロントエンド最適化
- Next.js Server Componentsによる初期表示高速化
- React Queryによるクライアントサイドキャッシュ
- 画像最適化: next/imageの使用
- Code Splitting: dynamic importの活用