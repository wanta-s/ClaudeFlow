# テストフェーズ

## 目的
実装したコードの品質を保証し、要件を満たしていることを確認する。

## タスク
1. 単体テスト作成・実行
2. 統合テスト作成・実行
3. E2Eテスト作成・実行
4. パフォーマンステスト
5. セキュリティテスト

## 入力
- 実装結果（04_implementation_result.md）
- テスト基準（オプション）

## 出力フォーマット
```markdown
# テスト結果レポート

## テストサマリー
| テスト種別 | 総数 | 成功 | 失敗 | カバレッジ |
|-----------|------|------|------|------------|
| 単体テスト | 50 | 48 | 2 | 85% |
| 統合テスト | 20 | 20 | 0 | - |
| E2Eテスト | 10 | 9 | 1 | - |

## 単体テスト

### UserService テスト
```typescript
// backend/src/services/__tests__/UserService.test.ts
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const user = await userService.createUser(userData);
      
      expect(user.email).toBe(userData.email);
      expect(user.id).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      const userData = { email: 'existing@example.com', name: 'Test' };
      await userService.createUser(userData);
      
      await expect(userService.createUser(userData))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

## 統合テスト

### API統合テスト
```typescript
// backend/src/__tests__/api.integration.test.ts
describe('User API', () => {
  it('POST /api/users should create user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'new@example.com', name: 'New User' })
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('new@example.com');
  });
});
```

## E2Eテスト

### ユーザー登録フロー
```typescript
// e2e/user-registration.spec.ts
test('User can register and login', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[name="email"]', 'e2e@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

## パフォーマンステスト結果
- **API応答時間**: 平均 50ms (目標: <100ms) ✅
- **ページ読み込み時間**: 1.2秒 (目標: <2秒) ✅
- **同時接続数**: 1000接続で安定動作 ✅

## セキュリティテスト結果
- **SQLインジェクション**: 対策済み ✅
- **XSS**: 対策済み ✅
- **CSRF**: 対策済み ✅
- **認証/認可**: 適切に実装 ✅

## 修正が必要な項目
1. UserServiceの重複チェック処理の修正
2. E2Eテストのタイムアウト設定の調整
3. カバレッジ90%達成のためのテスト追加

## 推奨事項
- CI/CDパイプラインでのテスト自動化
- 負荷テストの定期実行
- セキュリティスキャンの導入
```

## 実行例
```bash
claude --file 05_testing.md --file ../results/04_implementation_result.md > ../results/05_testing_result.md
```