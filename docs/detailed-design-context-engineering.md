# 詳細設計書のためのコンテキストエンジニアリング

## 概要
AIが効率的に実装を理解し、どのファイルに何を実装すべきかを把握できるよう、圧縮された形式で詳細設計を記述する方法。

## 1. ファイルマッピング記法

### 基本構文
```yaml
# ファイル名: 主要責務 [タグ]
src/controllers/UserController.ts: ユーザー管理API [API, AUTH]
  実装:
    - createUser(): ユーザー作成
    - updateUser(): ユーザー更新
    - deleteUser(): ユーザー削除
  依存:
    → UserService [ビジネスロジック]
    → AuthMiddleware [認証]
    ← routes/user.ts [ルーティング]
```

### 圧縮記法の凡例
- `→` : このファイルが依存している（使用する）
- `←` : このファイルに依存されている（使用される）
- `↔` : 相互依存
- `[タグ]` : ファイルの役割カテゴリ
- `()` : メソッド/関数
- `{}` : インターフェース/型
- `#` : プライベートメソッド
- `$` : 静的メソッド

## 2. 実装配置マトリックス

### コンパクトな機能配置表
```markdown
| 機能 | Controller | Service | Repository | Model | Utils |
|------|------------|---------|------------|-------|-------|
| ユーザー登録 | UC.create | US.register | UR.save | User{} | validate() |
| 認証 | AC.login | AS.auth | UR.find | Token{} | hash() |
| 商品検索 | PC.search | PS.filter | PR.query | Product{} | sanitize() |

凡例:
- UC: UserController, US: UserService, UR: UserRepository
- AC: AuthController, AS: AuthService
- PC: ProductController, PS: ProductService, PR: ProductRepository
```

## 3. 依存関係グラフ記法

### レイヤー構造の圧縮表現
```
[API Layer]
  ├─ UserController → UserService → UserRepository → DB
  ├─ AuthController → AuthService ↘
  └─ ProductController → ProductService → ProductRepository → DB
                                    ↗
[Shared]
  ├─ AuthMiddleware ←──────────────┘
  ├─ ValidationUtils ← [All Services]
  └─ Logger ← [All Layers]
```

## 4. 詳細設計テンプレート

### 4.1 機能単位の設計記述
```yaml
機能: ユーザー認証システム
概要: JWT基盤の認証・認可

実装ファイル:
  API層:
    auth/controller.ts:
      - login(email, password) → token
      - refresh(token) → newToken
      - logout(token) → void
      
  ビジネス層:
    auth/service.ts:
      - authenticate(credentials) → user
      - generateToken(user) → token
      - validateToken(token) → claims
      
  データ層:
    auth/repository.ts:
      - findUserByEmail(email) → user
      - saveRefreshToken(userId, token) → void
      - revokeToken(token) → void

依存関係:
  controller → service → repository → prisma
  controller → middleware/auth → service
  service → utils/crypto, utils/jwt

インターフェース:
  types/auth.ts:
    - LoginRequest{email, password}
    - AuthResponse{token, refreshToken, user}
    - JWTClaims{userId, email, roles, exp}
```

### 4.2 クロスカッティング機能の記述
```yaml
横断的機能:
  ロギング:
    影響: [全レイヤー]
    実装: utils/logger.ts
    使用: @Log デコレータ or logger.info()
    
  検証:
    影響: [Controller, Service]
    実装: middleware/validation.ts
    使用: @Validate(schema) デコレータ
    
  エラーハンドリング:
    影響: [全レイヤー]
    実装: middleware/errorHandler.ts
    型: errors/AppError.ts
```

## 5. 実装順序の最適化

### 依存関係に基づく実装順
```markdown
実装フェーズ:
  1. 基盤層:
     - types/*.ts (型定義)
     - config/*.ts (設定)
     - utils/*.ts (ユーティリティ)
     
  2. データ層:
     - models/*.ts (データモデル)
     - repositories/*.ts (リポジトリ)
     
  3. ビジネス層:
     - services/*.ts (ビジネスロジック)
     
  4. API層:
     - controllers/*.ts (コントローラー)
     - routes/*.ts (ルーティング)
     
  5. ミドルウェア:
     - middleware/*.ts (横断的処理)
```

## 6. コンテキスト圧縮例

### 6.1 完全な記述（非圧縮）
```typescript
// src/controllers/UserController.ts
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { validate } from '../utils/validation';
import { logger } from '../utils/logger';

export class UserController {
  constructor(private userService: UserService) {}
  
  async createUser(req: Request, res: Response) {
    try {
      const validated = validate(req.body, userSchema);
      const user = await this.userService.create(validated);
      logger.info('User created', { userId: user.id });
      res.status(201).json(user);
    } catch (error) {
      logger.error('Failed to create user', error);
      res.status(400).json({ error: error.message });
    }
  }
}
```

### 6.2 圧縮された設計記述
```yaml
UserController: ユーザー管理 [API]
  createUser(body) → 201|400
    → validate(body, schema)
    → UserService.create()
    → logger.info/error()
  依存: UserService, validate, logger
```

## 7. AIへの指示テンプレート

### 実装指示の圧縮形式
```markdown
## 実装タスク: ユーザー認証API

### ファイル構造
```
src/
  auth/
    controller.ts [API: login, refresh, logout]
    service.ts [BIZ: authenticate, generateToken]
    repository.ts [DATA: findUser, saveToken]
  types/
    auth.ts [LoginRequest{}, AuthResponse{}, JWTClaims{}]
  utils/
    jwt.ts [sign(), verify()]
```

### 実装手順
1. types/auth.ts: 型定義
2. utils/jwt.ts: JWT処理
3. auth/repository.ts: DB操作
4. auth/service.ts: ビジネスロジック
5. auth/controller.ts: APIエンドポイント

### 依存関係
controller → service → repository → prisma
全層 → types/auth.ts
service → utils/jwt.ts
```

## 8. 関連性の可視化

### 8.1 機能間の関連マップ
```
[認証] ←影響→ [ユーザー管理]
  ↓              ↓
[権限] ←確認→ [リソースアクセス]
  ↓              ↓
[監査ログ] ←記録→ [全API操作]
```

### 8.2 データフローの圧縮表現
```
Request → [Middleware:認証] → [Controller:検証] → [Service:処理] → [Repository:永続化] → Response
             ↓失敗                ↓失敗              ↓失敗             ↓失敗
           401/403              400               500              500
```

## 9. 実装チェックリスト生成

### 機能完成度の追跡
```markdown
□ ユーザー認証
  □ controller.ts
    ☑ login()
    ☑ refresh()
    □ logout()
  □ service.ts
    ☑ authenticate()
    □ generateToken()
    □ validateToken()
  □ repository.ts
    □ findUserByEmail()
    □ saveRefreshToken()
    □ revokeToken()
  □ テスト
    □ ユニットテスト
    □ 統合テスト
```

## 10. ベストプラクティス

### 10.1 命名規則の統一
```yaml
命名パターン:
  Controller: [Entity]Controller (例: UserController)
  Service: [Entity]Service (例: UserService)
  Repository: [Entity]Repository (例: UserRepository)
  Interface: I[Name] (例: IUserService)
  Type: [Name]Type (例: UserType)
  DTO: [Name]DTO (例: CreateUserDTO)
```

### 10.2 ファイル配置規則
```
機能別構成:
  features/
    user/
      user.controller.ts
      user.service.ts
      user.repository.ts
      user.types.ts
      user.test.ts

レイヤー別構成:
  controllers/
    user.controller.ts
  services/
    user.service.ts
  repositories/
    user.repository.ts
```

## まとめ

この圧縮形式により：
1. **AIの理解効率向上**: 構造化された情報で素早く把握
2. **トークン使用量削減**: 必要最小限の情報のみ
3. **実装の一貫性**: 明確なパターンと規則
4. **依存関係の明確化**: 視覚的な関連性表現

各プロジェクトに合わせて記法をカスタマイズし、チームで統一することが重要です。