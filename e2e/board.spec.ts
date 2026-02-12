import { test, expect } from '@playwright/test';

/**
 * Kanban Board E2E Tests
 * Tests board interactions including task creation, editing, and drag-drop
 */

// Generate unique user data for each test run
const generateTestUser = () => ({
  name: `Test User ${Date.now()}`,
  email: `testuser${Date.now()}@example.com`,
  password: 'TestPassword123!',
});

// Helper to authenticate and create a project with board
async function setupProjectWithBoard(page: any) {
  const user = generateTestUser();
  const projectName = `Test Project ${Date.now()}`;

  // Register user
  await page.goto('/register');
  await page.locator('#name').fill(user.name);
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('#confirmPassword').fill(user.password);
  await page.locator('#terms').check();
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  // Create project
  await page.getByRole('button', { name: /new/i }).click();
  await page.getByPlaceholder(/my awesome project/i).fill(projectName);
  await page.getByRole('button', { name: /create project/i }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

  // Navigate to project - use heading to avoid strict mode violation
  await page.getByRole('heading', { name: projectName }).click();
  await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9]+/);

  return { user, projectName };
}

// Helper to navigate to a board
async function navigateToBoard(page: any) {
  await setupProjectWithBoard(page);

  // Click on Main Board (auto-created)
  await page.getByText(/main board/i).click();

  // Wait for board page to load
  await expect(page).toHaveURL(/\/boards\//, { timeout: 10000 });
}

test.describe('Kanban Board', () => {
  test.describe('Board View', () => {
    test('should display board with columns', async ({ page }) => {
      await navigateToBoard(page);

      // Verify default columns exist
      await expect(page.getByRole('heading', { name: /to do/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /in progress/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /done/i })).toBeVisible();
    });

    test('should show board name in header', async ({ page }) => {
      await navigateToBoard(page);

      // Check for board header with "Main Board"
      await expect(page.getByRole('heading', { name: /main board/i })).toBeVisible();
    });

    test('should have add column button', async ({ page }) => {
      await navigateToBoard(page);

      // Look for add column button
      await expect(page.getByRole('button', { name: /add column/i })).toBeVisible();
    });
  });

  test.describe('Task Creation', () => {
    test('should show add task button in columns', async ({ page }) => {
      await navigateToBoard(page);

      // Look for add task buttons
      const addTaskButtons = page.getByRole('button', { name: /add task/i });
      await expect(addTaskButtons.first()).toBeVisible();
    });

    test('should create a new task', async ({ page }) => {
      await navigateToBoard(page);

      const taskTitle = `Test Task ${Date.now()}`;

      // Click add task button in first column
      await page.getByRole('button', { name: /add task/i }).first().click();

      // Fill task details in modal or inline form
      const taskInput = page.getByPlaceholder(/task title|enter task/i);
      if (await taskInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskInput.fill(taskTitle);
        await page.keyboard.press('Enter');
      } else {
        // Try modal input
        await page.locator('input[name="title"]').fill(taskTitle);
        await page.getByRole('button', { name: /create|add|save/i }).click();
      }

      // Verify task appears
      await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Task Interactions', () => {
    test('should click on task to view details', async ({ page }) => {
      await navigateToBoard(page);

      // Create a task first
      const taskTitle = `Click Test Task ${Date.now()}`;
      await page.getByRole('button', { name: /add task/i }).first().click();
      
      const taskInput = page.getByPlaceholder(/task title|enter task/i);
      if (await taskInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskInput.fill(taskTitle);
        await page.keyboard.press('Enter');
      } else {
        await page.locator('input[name="title"]').fill(taskTitle);
        await page.getByRole('button', { name: /create|add|save/i }).click();
      }

      await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });

      // Click on the task
      await page.getByText(taskTitle).click();

      // Should show task details (modal or page)
      await expect(page.getByRole('dialog').or(page.locator('[data-testid="task-details"]'))).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Board Navigation', () => {
    test('should have back button to project', async ({ page }) => {
      await navigateToBoard(page);

      // Look for back navigation
      const backLink = page.locator('a[href*="/projects/"]').first();
      await expect(backLink).toBeVisible();
    });

    test('should navigate back to project page', async ({ page }) => {
      await navigateToBoard(page);

      // Click back/project link
      const projectLink = page.locator('a[href*="/projects/"]').filter({ hasText: /test project/i }).first();
      if (await projectLink.isVisible().catch(() => false)) {
        await projectLink.click();
      } else {
        // Try the back arrow or breadcrumb
        await page.locator('a[href*="/projects/"]').first().click();
      }

      // Should be on project page
      await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9]+$/);
    });
  });
});

test.describe('Complete User Flow', () => {
  test('should complete full workflow: register, create project, view board', async ({ page }) => {
    const user = generateTestUser();
    const projectName = `Full Flow Project ${Date.now()}`;

    // Step 1: Register
    await page.goto('/register');
    await page.locator('#name').fill(user.name);
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);
    await page.locator('#confirmPassword').fill(user.password);
    await page.locator('#terms').check();
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Step 2: Create Project
    await page.getByRole('button', { name: /new/i }).click();
    await page.getByPlaceholder(/my awesome project/i).fill(projectName);
    await page.getByPlaceholder(/what's this project about/i).fill('E2E test project');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Step 3: Navigate to Project - use heading to avoid strict mode violation
    await page.getByRole('heading', { name: projectName }).click();
    await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9]+/);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    // Step 4: Navigate to Board
    await page.getByText(/main board/i).click();
    await expect(page).toHaveURL(/\/boards\//);

    // Step 5: Verify Board has columns
    await expect(page.getByRole('heading', { name: /to do/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /in progress/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /done/i })).toBeVisible();

    // Step 6: Create a Task
    const taskTitle = `Test Task ${Date.now()}`;
    await page.getByRole('button', { name: /add task/i }).first().click();
    
    const taskInput = page.getByPlaceholder(/task title|enter task/i);
    if (await taskInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await taskInput.fill(taskTitle);
      await page.keyboard.press('Enter');
    } else {
      await page.locator('input[name="title"]').fill(taskTitle);
      await page.getByRole('button', { name: /create|add|save/i }).click();
    }

    // Verify task was created
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
  });
});
