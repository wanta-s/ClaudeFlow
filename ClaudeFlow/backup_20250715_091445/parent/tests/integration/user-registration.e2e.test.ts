import { test, expect } from '@playwright/test';

test.describe('ユーザー登録 E2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test.describe('正常系シナリオ', () => {
    test('新規ユーザーが正常に登録してダッシュボードにアクセスできる', async ({ page }) => {
      const timestamp = Date.now();
      const testData = {
        email: `test${timestamp}@example.com`,
        password: 'TestPass123!',
        name: 'テストユーザー',
      };

      await page.fill('input[type="email"]', testData.email);
      await page.fill('input[type="password"]', testData.password);
      await page.fill('input[name="name"]', testData.name);

      await page.click('button[type="submit"]');

      await page.waitForURL('/dashboard', { timeout: 5000 });

      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('h1')).toContainText('ダッシュボード');
    });

    test('登録後にログアウトして再ログインできる', async ({ page }) => {
      const timestamp = Date.now();
      const testData = {
        email: `test${timestamp}@example.com`,
        password: 'TestPass123!',
        name: 'テストユーザー',
      };

      await page.fill('input[type="email"]', testData.email);
      await page.fill('input[type="password"]', testData.password);
      await page.fill('input[name="name"]', testData.name);
      await page.click('button[type="submit"]');

      await page.waitForURL('/dashboard');

      await page.goto('/login');
      await page.fill('input[type="email"]', testData.email);
      await page.fill('input[type="password"]', testData.password);
      await page.click('button[type="submit"]');

      await page.waitForURL('/dashboard');
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('異常系シナリオ', () => {
    test('既に登録されているメールアドレスではエラーが表示される', async ({ page }) => {
      const testData = {
        email: 'existing@example.com',
        password: 'TestPass123!',
        name: 'テストユーザー',
      };

      await page.fill('input[type="email"]', testData.email);
      await page.fill('input[type="password"]', testData.password);
      await page.fill('input[name="name"]', testData.name);
      await page.click('button[type="submit"]');

      await page.waitForURL('/dashboard', { timeout: 5000 }).catch(() => {});

      await page.goto('/register');
      await page.fill('input[type="email"]', testData.email);
      await page.fill('input[type="password"]', testData.password);
      await page.fill('input[name="name"]', testData.name);
      await page.click('button[type="submit"]');

      await expect(page.locator('text=このメールアドレスは既に登録されています')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('必須項目が未入力の場合はエラーが表示される', async ({ page }) => {
      await page.click('button[type="submit"]');

      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const nameInput = page.locator('input[name="name"]');

      await expect(emailInput).toHaveAttribute('required', '');
      await expect(passwordInput).toHaveAttribute('required', '');
      await expect(nameInput).toHaveAttribute('required', '');
    });

    test('パスワードが8文字未満の場合はバリデーションエラーになる', async ({ page }) => {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '1234567');
      await page.fill('input[name="name"]', 'テストユーザー');

      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toHaveAttribute('minLength', '8');

      const isValid = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBe(false);
    });
  });

  test.describe('UIインタラクションテスト', () => {
    test('ログインページへのリンクが機能する', async ({ page }) => {
      await page.click('text=ログイン');
      await expect(page).toHaveURL('/login');
    });

    test('登録ボタンが送信中に無効化される', async ({ page }) => {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'TestPass123!');
      await page.fill('input[name="name"]', 'テストユーザー');

      const submitButton = page.locator('button[type="submit"]');

      await Promise.all([
        page.waitForResponse('/api/auth/register'),
        submitButton.click(),
      ]);

      await expect(submitButton).toContainText('登録中...');
      await expect(submitButton).toBeDisabled();
    });

    test('フォーム入力値が保持される', async ({ page }) => {
      const testData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        name: 'テストユーザー',
      };

      await page.fill('input[type="email"]', testData.email);
      await page.fill('input[type="password"]', testData.password);
      await page.fill('input[name="name"]', testData.name);

      await expect(page.locator('input[type="email"]')).toHaveValue(testData.email);
      await expect(page.locator('input[type="password"]')).toHaveValue(testData.password);
      await expect(page.locator('input[name="name"]')).toHaveValue(testData.name);
    });
  });

  test.describe('境界値テスト', () => {
    test('名前が50文字まで入力できる', async ({ page }) => {
      const longName = 'あ'.repeat(50);

      await page.fill('input[name="name"]', longName);
      await expect(page.locator('input[name="name"]')).toHaveValue(longName);
    });

    test('メールアドレスが255文字まで入力できる', async ({ page }) => {
      const localPart = 'a'.repeat(243);
      const longEmail = `${localPart}@example.com`;

      await page.fill('input[type="email"]', longEmail);
      await expect(page.locator('input[type="email"]')).toHaveValue(longEmail);
    });

    test('パスワードに特殊文字を含めて登録できる', async ({ page }) => {
      const timestamp = Date.now();
      const testData = {
        email: `special${timestamp}@example.com`,
        password: 'Test@Pass#123!$%',
        name: 'テストユーザー',
      };

      await page.fill('input[type="email"]', testData.email);
      await page.fill('input[type="password"]', testData.password);
      await page.fill('input[name="name"]', testData.name);

      await page.click('button[type="submit"]');

      await page.waitForURL('/dashboard', { timeout: 5000 });
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('アクセシビリティテスト', () => {
    test('フォーム要素に適切なラベルが設定されている', async ({ page }) => {
      const emailLabel = await page.locator('label[for="email"]');
      const passwordLabel = await page.locator('label[for="password"]');
      const nameLabel = await page.locator('label[for="name"]');

      await expect(emailLabel).toContainText('メールアドレス');
      await expect(passwordLabel).toContainText('パスワード');
      await expect(nameLabel).toContainText('名前');
    });

    test('キーボードナビゲーションが正しく機能する', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="email"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="name"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });
  });

  test.describe('レスポンシブデザインテスト', () => {
    test('モバイル画面でも正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('タブレット画面でも正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('form')).toBeVisible();
    });
  });
});