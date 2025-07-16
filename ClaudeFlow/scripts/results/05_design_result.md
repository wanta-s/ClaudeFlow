# 詳細設計書 - オフラインオセロアプリ

## アーキテクチャ設計

### システム構成図
```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        A[App Component]
        B[Board Component]
        C[Cell Component]
        D[GameInfo Component]
    end
    
    subgraph "State Management"
        E[React State]
        F[LocalStorage]
    end
    
    subgraph "Business Logic"
        G[Game Logic Service]
        H[Storage Service]
    end
    
    subgraph "PWA Layer"
        I[Service Worker]
        J[Manifest]
    end
    
    A --> B
    A --> D
    B --> C
    A --> E
    E <--> F
    A --> G
    A --> H
    H --> F
    I --> J
```

### 技術スタック詳細
- **Frontend**: 
  - React 18.3 (関数コンポーネント + Hooks)
  - TypeScript 5.6 (厳密な型チェック)
  - Vite 6.0 (高速ビルドツール)
  - CSS Modules (スタイル管理)
- **State Management**: 
  - React State (useState, useEffect)
  - LocalStorage API (永続化)
- **オフライン対応**:
  - Progressive Web App (PWA)
  - Service Worker (キャッシュ戦略)
  - LocalStorage (ゲーム状態の自動保存)
- **ビルド・開発ツール**:
  - Vite (開発サーバー、ビルド)
  - ESLint (コード品質)
  - TypeScript Compiler (型チェック)

## API設計（将来のオンライン機能用）

### エンドポイント一覧
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | /api/games | 新規ゲーム作成 | 任意 |
| GET | /api/games/:id | ゲーム状態取得 | 不要 |
| PUT | /api/games/:id/moves | 手を打つ | 要 |
| GET | /api/games/:id/history | ゲーム履歴取得 | 不要 |
| GET | /api/players/:id/stats | プレイヤー統計 | 要 |
| POST | /api/players | プレイヤー登録 | 不要 |

### API詳細

#### POST /api/games
- **説明**: 新規オンラインゲームを作成
- **リクエスト**: 
  ```json
  {
    "playerName": "Player1",
    "roomCode": "ABC123" // オプション：既存ルームに参加
  }
  ```
- **レスポンス**:
  ```json
  {
    "gameId": "550e8400-e29b-41d4-a716-446655440000",
    "roomCode": "ABC123",
    "players": {
      "black": "Player1",
      "white": null // 対戦相手待ち
    },
    "gameState": {
      "board": [[...]],
      "currentPlayer": "black",
      "blackCount": 2,
      "whiteCount": 2
    }
  }
  ```

#### PUT /api/games/:id/moves
- **説明**: 手を打つ
- **リクエスト**:
  ```json
  {
    "playerId": "550e8400-e29b-41d4-a716-446655440001",
    "position": {
      "row": 3,
      "col": 2
    }
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "gameState": {
      "board": [[...]],
      "currentPlayer": "white",
      "blackCount": 4,
      "whiteCount": 1,
      "lastMove": { "row": 3, "col": 2 }
    }
  }
  ```


## データベース設計

### ER図
```mermaid
erDiagram
    Players ||--o{ Games : plays
    Games ||--o{ Moves : contains
    Players ||--o{ GameStats : has
    
    Players {
        uuid id PK
        string name UK
        string email
        datetime created_at
        datetime last_active
    }
    
    Games {
        uuid id PK
        uuid black_player_id FK
        uuid white_player_id FK
        string room_code
        enum status
        uuid winner_id FK
        int black_count
        int white_count
        json final_board
        datetime started_at
        datetime finished_at
    }
    
    Moves {
        uuid id PK
        uuid game_id FK
        int move_number
        enum player
        int row
        int col
        json board_after
        datetime played_at
    }
    
    GameStats {
        uuid player_id PK FK
        int total_games
        int wins_as_black
        int wins_as_white
        int draws
        int total_discs_captured
        float avg_game_duration
        datetime updated_at
    }
```

### インデックス設計
- Games: room_code (UNIQUE), status, started_at DESC
- Moves: (game_id, move_number)
- GameStats: player_id (PRIMARY)

### LocalStorage スキーマ（現在の実装）
```typescript
interface LocalStorageSchema {
  'othello-game-state': GameState;
  'othello-game-history': GameHistory[];
  'othello-preferences': {
    showPossibleMoves: boolean;
    soundEnabled: boolean;
    theme: 'light' | 'dark';
  };
}
```

## クラス設計

### クラス図
```mermaid
classDiagram
    class App {
        -gameState: GameState
        -isSaving: boolean
        +handleCellClick(position: Position)
        +handleNewGame()
        +loadGame()
        +saveGame()
    }
    
    class Board {
        +board: CellState[][]
        +possibleMoves: Position[]
        +lastMove: Position
        +onCellClick: Function
        +render()
    }
    
    class Cell {
        +state: CellState
        +isValidMove: boolean
        +isLastMove: boolean
        +onClick: Function
        +render()
    }
    
    class GameInfo {
        +gameState: GameState
        +onNewGame: Function
        +render()
    }
    
    class GameLogicService {
        +initializeBoard(): Board
        +createInitialGameState(): GameState
        +isValidMove(board, player, position): boolean
        +getPossibleMoves(board, player): Position[]
        +makeMove(gameState, position): GameState
        -flipDiscs(board, player, position): Board
        -countDiscs(board): DiscCount
        -getOpponent(player): Player
    }
    
    class StorageService {
        +saveGameState(state: GameState): void
        +loadGameState(): GameState
        +saveGameHistory(history: GameHistory): void
        +loadGameHistory(): GameHistory[]
    }
    
    App --> Board
    App --> GameInfo
    App --> GameLogicService
    App --> StorageService
    Board --> Cell
```

### 主要な型定義
```typescript
// 基本型
type Player = 'black' | 'white';
type CellState = Player | null;
type Board = CellState[][];

// ゲーム関連の型
interface Position {
  row: number;
  col: number;
}

interface GameState {
  board: Board;
  currentPlayer: Player;
  blackCount: number;
  whiteCount: number;
  isGameOver: boolean;
  winner: Player | 'draw' | null;
  possibleMoves: Position[];
  lastMove: Position | null;
}

interface GameHistory {
  id: string;
  date: Date;
  winner: Player | 'draw';
  blackCount: number;
  whiteCount: number;
  moves: Position[];
}

// コンポーネントProps
interface BoardProps {
  board: Board;
  possibleMoves: Position[];
  lastMove: Position | null;
  onCellClick: (position: Position) => void;
}

interface CellProps {
  state: CellState;
  isValidMove: boolean;
  isLastMove: boolean;
  onClick: () => void;
}

interface GameInfoProps {
  gameState: GameState;
  onNewGame: () => void;
}
```

## シーケンス図

### ゲーム開始フロー
```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant S as StorageService
    participant G as GameLogic
    
    U->>A: アプリ起動
    A->>S: loadGameState()
    alt 保存データあり
        S-->>A: 保存されたGameState
        A->>A: setGameState(saved)
    else 保存データなし
        A->>G: createInitialGameState()
        G-->>A: 初期GameState
        A->>A: setGameState(initial)
    end
    A->>U: ゲーム画面表示
```

### 手を打つフロー
```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant B as Board
    participant G as GameLogic
    participant S as StorageService
    
    U->>B: セルクリック
    B->>A: handleCellClick(position)
    A->>G: makeMove(gameState, position)
    
    alt 有効な手
        G->>G: isValidMove()
        G->>G: flipDiscs()
        G->>G: countDiscs()
        G->>G: checkGameOver()
        G-->>A: 新しいGameState
        A->>A: setGameState(newState)
        A->>S: saveGameState(newState)
        S->>S: LocalStorageに保存
        A->>B: 再レンダリング
        B->>U: 更新された盤面表示
    else 無効な手
        G-->>A: 現在のGameState（変更なし）
    end
```

### ゲーム終了フロー
```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant G as GameLogic
    participant S as StorageService
    participant I as GameInfo
    
    Note over G: 両プレイヤーに有効な手がない
    G->>G: checkGameOver()
    G->>G: determineWinner()
    G-->>A: GameState (isGameOver: true)
    A->>I: 勝者表示
    I->>U: ゲーム結果表示
    A->>S: saveGameHistory()
    S->>S: 履歴をLocalStorageに追加
    
    U->>I: 新規ゲームボタン
    I->>A: handleNewGame()
    A->>G: createInitialGameState()
    G-->>A: 初期GameState
    A->>A: setGameState(initial)
    A->>S: saveGameState(initial)
```

## パフォーマンス最適化

### レンダリング最適化
- React.memoによるコンポーネントの再レンダリング防止
- useCallbackによるイベントハンドラのメモ化
- 盤面の差分更新のみ実行

### ストレージ最適化
- デバウンスによる保存頻度の制限（500ms）
- 必要最小限のデータのみ保存
- 古い履歴の自動削除（最新10ゲーム）

## セキュリティ考慮事項

### クライアントサイド
- XSS対策: Reactの自動エスケープ機能を活用
- LocalStorageデータの検証とサニタイズ
- 不正な入力値のバリデーション

### 将来のオンライン機能
- JWT認証の実装
- APIレート制限
- WebSocket通信のセキュア化
- ゲームロジックのサーバーサイド検証

## エラー処理設計

### エラーケース
1. **LocalStorage アクセスエラー**
   - フォールバック: メモリ内でのゲーム継続
   - ユーザー通知: 保存機能の一時的な無効化を通知

2. **不正なゲーム状態**
   - 検証: ゲーム状態の整合性チェック
   - 復旧: 初期状態へのリセット

3. **PWAインストールエラー**
   - グレースフルデグレード: 通常のWebアプリとして動作継続

## 次のステップ

1. **実装フェーズ**
   - コンポーネントの詳細実装
   - ユニットテストの作成
   - E2Eテストの実装

2. **最適化フェーズ**
   - パフォーマンスチューニング
   - アクセシビリティ対応
   - 多言語対応

3. **拡張フェーズ**
   - AI対戦機能
   - オンライン対戦機能
   - リプレイ機能