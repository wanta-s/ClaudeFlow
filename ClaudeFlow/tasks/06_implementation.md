# 実装フェーズ

## 目的
詳細設計に基づいて、実際のコードを実装する。

## タスク
1. プロジェクトセットアップ
2. データベーススキーマ実装
3. バックエンドAPI実装
4. フロントエンド実装
5. 統合テスト環境構築

## 入力
- 詳細設計書（03_design_result.md）
- コーディング規約（オプション）

## 出力フォーマット
```markdown
# 実装結果

## プロジェクト構造
```
project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
├── database/
│   └── migrations/
└── docker-compose.yml
```

## 実装コード例

### バックエンド - UserController
```typescript
// backend/src/controllers/UserController.ts
export class UserController {
  constructor(private userService: UserService) {}

  async getUsers(req: Request, res: Response) {
    const users = await this.userService.getUsers();
    res.json(users);
  }

  async createUser(req: Request, res: Response) {
    const user = await this.userService.createUser(req.body);
    res.status(201).json(user);
  }
}
```

### フロントエンド - UserList Component
```tsx
// frontend/src/components/UserList.tsx
export const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};
```

## セットアップ手順
1. **依存関係インストール**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **データベース初期化**
   ```bash
   npm run db:migrate
   ```

3. **開発サーバー起動**
   ```bash
   docker-compose up -d
   npm run dev
   ```

## 実装済み機能
- ✅ ユーザー管理API
- ✅ 認証機能
- ✅ フロントエンド基本UI
- ⬜ 管理画面（次フェーズ）
```

## 実行例
```bash
claude --file 04_implementation.md --file ../results/03_design_result.md > ../results/04_implementation_result.md
```