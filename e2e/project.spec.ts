import { test, expect } from '@playwright/test';

/**
 * Project Management E2E Tests
 * Tests creating projects and viewing project details
 */

// Generate unique user data for each test run
const generateTestUser = () => ({
  name: `Test User ${Date.now()}`,
  email: `testuser${Date.now()}@example.com`,
  password: 'TestPassword123!',
});

// Helper to authenticate before tests
async function authenticateUser(page: any) {
  const user = generateTestUser();
  await page.goto('/register');
  await page.locator('#name').fill(user.name);
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('#confirmPassword').fill(user.password);
  await page.locator('#terms').check();
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  return user;
}

test.describe('Project Management', () => {
  test.describe('Dashboard', () => {
    test('should display dashboard with project list', async ({ page }) => {
      await authenticateUser(page);

      // Verify dashboard elements
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByText(/recent projects/i)).toBeVisible();
    });

    test('should display stats cards on dashboard', async ({ page }) => {
      await authenticateUser(page);

      // Verify stats cards
      await expect(page.getByText(/total projects/i)).toBeVisible();
    });
  });

  test.describe('Create Project', () => {
    test('should open create project modal', async ({ page }) => {
      await authenticateUser(page);

      // Click new project button
      await page.getByRole('button', { name: /new/i }).click();

      // Verify modal is open
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/create project/i)).toBeVisible();
    });

    test('should create a new project successfully', async ({ page }) => {
      await authenticateUser(page);

      const projectName = `Test Project ${Date.now()}`;
      const projectDescription = 'This is a test project created by E2E tests';

      // Open create modal
      await page.getByRole('button', { name: /new/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Fill project details
      await page.getByPlaceholder(/my awesome project/i).fill(projectName);
      await page.getByPlaceholder(/what's this project about/i).fill(projectDescription);

      // Submit form
      await page.getByRole('button', { name: /create project/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Verify project appears in the list
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });
    });

    test('should cancel project creation', async ({ page }) => {
      await authenticateUser(page);

      // Open create modal
      await page.getByRole('button', { name: /new/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Fill some data
      await page.getByPlaceholder(/my awesome project/i).fill('Test Project');

      // Cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // Modal should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should not create project without name', async ({ page }) => {
      await authenticateUser(page);

      // Open create modal
      await page.getByRole('button', { name: /new/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Button should be disabled when name is empty
      const submitButton = page.getByRole('button', { name: /create project/i });
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Project Details', () => {
    test('should navigate to project page', async ({ page }) => {
      await authenticateUser(page);

      const projectName = `Test Project ${Date.now()}`;

      // Create a project first
      await page.getByRole('button', { name: /new/i }).click();
      await page.getByPlaceholder(/my awesome project/i).fill(projectName);
      await page.getByRole('button', { name: /create project/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });

      // Click on the project - use heading to avoid strict mode violation
      await page.getByRole('heading', { name: projectName }).click();

      // Should navigate to project page
      await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9]+/);
      await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    });

    test('should display project stats', async ({ page }) => {
      await authenticateUser(page);

      const projectName = `Test Project ${Date.now()}`;

      // Create and navigate to project
      await page.getByRole('button', { name: /new/i }).click();
      await page.getByPlaceholder(/my awesome project/i).fill(projectName);
      await page.getByRole('button', { name: /create project/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Click on the project - use heading to avoid strict mode violation
      await page.getByRole('heading', { name: projectName }).click();

      // Verify stats are displayed
      await expect(page.getByText(/boards/i)).toBeVisible();
      await expect(page.getByText(/members/i)).toBeVisible();
    });

    test('should show boards section', async ({ page }) => {
      await authenticateUser(page);

      const projectName = `Test Project ${Date.now()}`;

      // Create and navigate to project
      await page.getByRole('button', { name: /new/i }).click();
      await page.getByPlaceholder(/my awesome project/i).fill(projectName);
      await page.getByRole('button', { name: /create project/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Click on the project - use heading to avoid strict mode violation
      await page.getByRole('heading', { name: projectName }).click();

      // Verify boards section - Main Board should exist
      await expect(page.getByText(/main board/i)).toBeVisible();
    });

    test('should show team members section', async ({ page }) => {
      await authenticateUser(page);

      const projectName = `Test Project ${Date.now()}`;

      // Create and navigate to project
      await page.getByRole('button', { name: /new/i }).click();
      await page.getByPlaceholder(/my awesome project/i).fill(projectName);
      await page.getByRole('button', { name: /create project/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Click on the project - use heading to avoid strict mode violation
      await page.getByRole('heading', { name: projectName }).click();

      // Verify team members section
      await expect(page.getByText(/team members/i)).toBeVisible();
      await expect(page.getByText(/manager/i)).toBeVisible();
    });

    test('should navigate back to dashboard', async ({ page }) => {
      await authenticateUser(page);

      const projectName = `Test Project ${Date.now()}`;

      // Create and navigate to project
      await page.getByRole('button', { name: /new/i }).click();
      await page.getByPlaceholder(/my awesome project/i).fill(projectName);
      await page.getByRole('button', { name: /create project/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Click on the project - use heading to avoid strict mode violation
      await page.getByRole('heading', { name: projectName }).click();
      await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9]+/);

      // Click dashboard link
      await page.getByRole('link', { name: /dashboard/i }).click();

      // Should be back at dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Project Boards', () => {
    test('should navigate to board when clicking on it', async ({ page }) => {
      await authenticateUser(page);

      const projectName = `Test Project ${Date.now()}`;

      // Create and navigate to project
      await page.getByRole('button', { name: /new/i }).click();
      await page.getByPlaceholder(/my awesome project/i).fill(projectName);
      await page.getByRole('button', { name: /create project/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Click on the project - use heading to avoid strict mode violation
      await page.getByRole('heading', { name: projectName }).click();

      // Click on Main Board
      await page.getByText(/main board/i).click();
      
      // Should navigate to board page
      await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9]+\/boards\/[a-zA-Z0-9]+/);
    });
  });
});
