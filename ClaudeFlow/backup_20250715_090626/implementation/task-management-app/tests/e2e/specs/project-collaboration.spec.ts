import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Project Collaboration', () => {
  let ownerContext: BrowserContext;
  let memberContext: BrowserContext;
  let ownerPage: Page;
  let memberPage: Page;
  
  const owner = {
    email: `owner-${Date.now()}@example.com`,
    password: 'OwnerPass123!',
    name: 'Project Owner',
  };
  
  const member = {
    email: `member-${Date.now()}@example.com`,
    password: 'MemberPass123!',
    name: 'Team Member',
  };

  test.beforeEach(async ({ browser }) => {
    // Create two browser contexts for different users
    ownerContext = await browser.newContext();
    memberContext = await browser.newContext();
    
    ownerPage = await ownerContext.newPage();
    memberPage = await memberContext.newPage();
    
    // Register both users
    for (const [page, user] of [[ownerPage, owner], [memberPage, member]] as const) {
      await page.goto('/register');
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      await page.fill('input[name="confirmPassword"]', user.password);
      await page.fill('input[name="name"]', user.name);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');
    }
  });

  test.afterEach(async () => {
    await ownerContext.close();
    await memberContext.close();
  });

  test('create project and add team members', async () => {
    // Owner creates a project
    await ownerPage.click('[data-testid="nav-projects"]');
    await ownerPage.click('[data-testid="create-project-button"]');
    
    await ownerPage.fill('input[name="name"]', 'Collaborative Project');
    await ownerPage.fill('textarea[name="description"]', 'A project for team collaboration');
    await ownerPage.click('button[data-testid="save-project"]');
    
    // Verify project created
    await expect(ownerPage.locator('[data-testid="project-list"]')).toContainText('Collaborative Project');
    
    // Open project details
    await ownerPage.click('[data-testid="project-card-Collaborative Project"]');
    
    // Add member to project
    await ownerPage.click('[data-testid="manage-members-button"]');
    await ownerPage.fill('input[data-testid="member-email-input"]', member.email);
    await ownerPage.click('[data-testid="add-member-button"]');
    
    // Verify member added
    await expect(ownerPage.locator('[data-testid="member-list"]')).toContainText(member.name);
    
    // Member should see the project
    await memberPage.goto('/projects');
    await expect(memberPage.locator('[data-testid="project-list"]')).toContainText('Collaborative Project');
  });

  test('collaborate on tasks within project', async () => {
    // Setup: Owner creates project and adds member
    await ownerPage.goto('/projects');
    await ownerPage.click('[data-testid="create-project-button"]');
    await ownerPage.fill('input[name="name"]', 'Task Collaboration Project');
    await ownerPage.click('button[data-testid="save-project"]');
    await ownerPage.click('[data-testid="project-card-Task Collaboration Project"]');
    await ownerPage.click('[data-testid="manage-members-button"]');
    await ownerPage.fill('input[data-testid="member-email-input"]', member.email);
    await ownerPage.click('[data-testid="add-member-button"]');
    
    // Owner creates a task
    await ownerPage.click('[data-testid="project-tasks-tab"]');
    await ownerPage.click('[data-testid="create-task-button"]');
    await ownerPage.fill('input[name="title"]', 'Collaborative Task');
    await ownerPage.fill('textarea[name="description"]', 'Task for team member');
    await ownerPage.selectOption('[data-testid="assignee-select"]', member.email);
    await ownerPage.click('button[data-testid="save-task"]');
    
    // Member views assigned task
    await memberPage.goto('/tasks');
    await expect(memberPage.locator('[data-testid="task-list"]')).toContainText('Collaborative Task');
    await expect(memberPage.locator('[data-testid="assigned-to-me"]')).toBeVisible();
    
    // Member updates task status
    await memberPage.click('[data-testid="task-card-Collaborative Task"]');
    await memberPage.selectOption('select[name="status"]', 'IN_PROGRESS');
    await memberPage.click('button[data-testid="save-task"]');
    
    // Owner sees updated status
    await ownerPage.reload();
    await expect(ownerPage.locator('[data-testid="task-status-IN_PROGRESS"]')).toBeVisible();
  });

  test('project permissions', async () => {
    // Setup: Owner creates project
    await ownerPage.goto('/projects');
    await ownerPage.click('[data-testid="create-project-button"]');
    await ownerPage.fill('input[name="name"]', 'Permission Test Project');
    await ownerPage.click('button[data-testid="save-project"]');
    
    const projectUrl = ownerPage.url();
    
    // Member tries to access project without permission
    await memberPage.goto(projectUrl);
    await expect(memberPage.locator('.error-message')).toContainText('You do not have access to this project');
    
    // Owner adds member
    await ownerPage.click('[data-testid="manage-members-button"]');
    await ownerPage.fill('input[data-testid="member-email-input"]', member.email);
    await ownerPage.click('[data-testid="add-member-button"]');
    
    // Member can now access
    await memberPage.goto(projectUrl);
    await expect(memberPage.locator('h1')).toContainText('Permission Test Project');
    
    // Member cannot delete project
    await expect(memberPage.locator('[data-testid="delete-project-button"]')).not.toBeVisible();
    
    // Member cannot remove other members
    await memberPage.click('[data-testid="manage-members-button"]');
    await expect(memberPage.locator('[data-testid="remove-member-button"]')).not.toBeVisible();
  });

  test('real-time updates', async () => {
    // Setup: Create shared project
    await ownerPage.goto('/projects');
    await ownerPage.click('[data-testid="create-project-button"]');
    await ownerPage.fill('input[name="name"]', 'Real-time Project');
    await ownerPage.click('button[data-testid="save-project"]');
    await ownerPage.click('[data-testid="project-card-Real-time Project"]');
    await ownerPage.click('[data-testid="manage-members-button"]');
    await ownerPage.fill('input[data-testid="member-email-input"]', member.email);
    await ownerPage.click('[data-testid="add-member-button"]');
    
    // Both users on project page
    await memberPage.goto('/projects');
    await memberPage.click('[data-testid="project-card-Real-time Project"]');
    await memberPage.click('[data-testid="project-tasks-tab"]');
    await ownerPage.click('[data-testid="project-tasks-tab"]');
    
    // Owner creates a task
    await ownerPage.click('[data-testid="create-task-button"]');
    await ownerPage.fill('input[name="title"]', 'Real-time Task');
    await ownerPage.click('button[data-testid="save-task"]');
    
    // Member should see the task appear (with polling or websocket)
    await memberPage.waitForTimeout(1000); // Wait for real-time update
    await expect(memberPage.locator('[data-testid="task-list"]')).toContainText('Real-time Task');
  });
});