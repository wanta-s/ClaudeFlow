import { test, expect, Page } from '@playwright/test';

const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'E2E Test User',
};

test.describe('Authentication Flow', () => {
  test('user can register, login, and logout', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="name"]', testUser.name);
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(testUser.name);
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Login with created account
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Should be back at dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('registration validation', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.error-message')).toContainText('Email is required');
    await expect(page.locator('.error-message')).toContainText('Password is required');
    
    // Test invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('Invalid email format');
    
    // Test password mismatch
    await page.fill('input[name="email"]', 'valid@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('Passwords do not match');
  });

  test('login validation', async ({ page }) => {
    await page.goto('/login');
    
    // Try invalid credentials
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message')).toContainText('Invalid email or password');
  });

  test('protected routes redirect to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/tasks');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Should show redirect message
    await expect(page.locator('.info-message')).toContainText('Please login to continue');
  });

  test('remember me functionality', async ({ page }) => {
    await page.goto('/login');
    
    // Login with remember me checked
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.check('input[name="rememberMe"]');
    await page.click('button[type="submit"]');
    
    // Close and reopen browser (simulated by clearing session storage)
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL('/dashboard');
  });
});