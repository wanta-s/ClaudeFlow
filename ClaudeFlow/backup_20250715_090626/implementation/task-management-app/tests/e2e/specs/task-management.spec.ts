import { test, expect, Page } from '@playwright/test';

// Helper function to login
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Task Management', () => {
  const testUser = {
    email: `task-user-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Task Test User',
  };

  test.beforeEach(async ({ page }) => {
    // Register and login test user
    await page.goto('/register');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="name"]', testUser.name);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('create and manage tasks', async ({ page }) => {
    // Navigate to tasks page
    await page.click('[data-testid="nav-tasks"]');
    await expect(page).toHaveURL('/tasks');

    // Create a new task
    await page.click('[data-testid="create-task-button"]');
    
    // Fill task form
    await page.fill('input[name="title"]', 'E2E Test Task');
    await page.fill('textarea[name="description"]', 'This is a test task created by E2E test');
    await page.selectOption('select[name="priority"]', 'HIGH');
    await page.fill('input[name="dueDate"]', '2024-12-31');
    
    // Submit task
    await page.click('button[data-testid="save-task"]');
    
    // Verify task appears in list
    await expect(page.locator('[data-testid="task-list"]')).toContainText('E2E Test Task');
    await expect(page.locator('[data-testid="task-priority-HIGH"]')).toBeVisible();
    
    // Edit task
    await page.click('[data-testid="task-edit-button"]');
    await page.fill('input[name="title"]', 'Updated E2E Test Task');
    await page.selectOption('select[name="status"]', 'IN_PROGRESS');
    await page.click('button[data-testid="save-task"]');
    
    // Verify updates
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Updated E2E Test Task');
    await expect(page.locator('[data-testid="task-status-IN_PROGRESS"]')).toBeVisible();
    
    // Complete task
    await page.click('[data-testid="task-complete-button"]');
    await expect(page.locator('[data-testid="task-status-DONE"]')).toBeVisible();
    
    // Delete task
    await page.click('[data-testid="task-delete-button"]');
    await page.click('[data-testid="confirm-delete"]');
    
    // Verify task is removed
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Updated E2E Test Task');
  });

  test('filter and sort tasks', async ({ page }) => {
    // Create multiple tasks
    const tasks = [
      { title: 'High Priority Task', priority: 'HIGH', status: 'TODO' },
      { title: 'Medium Priority Task', priority: 'MEDIUM', status: 'IN_PROGRESS' },
      { title: 'Low Priority Task', priority: 'LOW', status: 'DONE' },
    ];

    await page.goto('/tasks');
    
    for (const task of tasks) {
      await page.click('[data-testid="create-task-button"]');
      await page.fill('input[name="title"]', task.title);
      await page.selectOption('select[name="priority"]', task.priority);
      await page.selectOption('select[name="status"]', task.status);
      await page.click('button[data-testid="save-task"]');
    }

    // Filter by status
    await page.selectOption('[data-testid="filter-status"]', 'TODO');
    await expect(page.locator('[data-testid="task-list"]')).toContainText('High Priority Task');
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Medium Priority Task');
    
    // Filter by priority
    await page.selectOption('[data-testid="filter-status"]', '');
    await page.selectOption('[data-testid="filter-priority"]', 'HIGH');
    await expect(page.locator('[data-testid="task-list"]')).toContainText('High Priority Task');
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Low Priority Task');
    
    // Sort by priority
    await page.selectOption('[data-testid="filter-priority"]', '');
    await page.selectOption('[data-testid="sort-by"]', 'priority');
    
    const taskTitles = await page.locator('[data-testid="task-title"]').allTextContents();
    expect(taskTitles[0]).toBe('High Priority Task');
    expect(taskTitles[2]).toBe('Low Priority Task');
  });

  test('task search functionality', async ({ page }) => {
    await page.goto('/tasks');
    
    // Create tasks with searchable content
    const searchTasks = [
      { title: 'Fix login bug', description: 'Users cannot login with email' },
      { title: 'Add search feature', description: 'Implement full-text search' },
      { title: 'Update documentation', description: 'Add API endpoints info' },
    ];

    for (const task of searchTasks) {
      await page.click('[data-testid="create-task-button"]');
      await page.fill('input[name="title"]', task.title);
      await page.fill('textarea[name="description"]', task.description);
      await page.click('button[data-testid="save-task"]');
    }

    // Search by title
    await page.fill('[data-testid="search-input"]', 'login');
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Fix login bug');
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Add search feature');
    
    // Search by description
    await page.fill('[data-testid="search-input"]', 'API');
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Update documentation');
    await expect(page.locator('[data-testid="task-list"]')).not.toContainText('Fix login bug');
    
    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    expect(await page.locator('[data-testid="task-title"]').count()).toBe(3);
  });
});