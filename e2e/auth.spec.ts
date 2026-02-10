import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests user registration, login, and logout flows
 */

// Generate unique user data for each test run
const generateTestUser = () => ({
  name: `Test User ${Date.now()}`,
  email: `testuser${Date.now()}@example.com`,
  password: 'TestPassword123!',
});

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');

      // Verify form elements are visible
      await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
      await expect(page.locator('#name')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#confirmPassword')).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('should show validation error for mismatched passwords', async ({ page }) => {
      await page.goto('/register');

      // Fill form with mismatched passwords
      await page.locator('#name').fill('Test User');
      await page.locator('#email').fill('test@example.com');
      await page.locator('#password').fill('password123');
      await page.locator('#confirmPassword').fill('differentpassword');
      await page.locator('#terms').check();
      await page.getByRole('button', { name: /create account/i }).click();

      // Expect validation error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should show validation error for short password', async ({ page }) => {
      await page.goto('/register');

      // Fill form with short password
      await page.locator('#name').fill('Test User');
      await page.locator('#email').fill('test@example.com');
      await page.locator('#password').fill('short');
      await page.locator('#confirmPassword').fill('short');
      await page.locator('#terms').check();
      await page.getByRole('button', { name: /create account/i }).click();

      // Expect validation error
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test('should register a new user successfully', async ({ page }) => {
      const user = generateTestUser();
      await page.goto('/register');

      // Fill registration form
      await page.locator('#name').fill(user.name);
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill(user.password);
      await page.locator('#confirmPassword').fill(user.password);
      await page.locator('#terms').check();

      // Submit form
      await page.getByRole('button', { name: /create account/i }).click();

      // Should redirect to dashboard after successful registration
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    });

    test('should navigate to login page from registration', async ({ page }) => {
      await page.goto('/register');

      // Click sign in link
      await page.getByRole('link', { name: /sign in/i }).click();

      // Should navigate to login page
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Login', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Verify form elements are visible
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill form with invalid credentials
      await page.locator('#email').fill('invalid@example.com');
      await page.locator('#password').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Expect error message (from API)
      await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 });
    });

    test('should login with valid credentials', async ({ page }) => {
      // First register a user
      const user = generateTestUser();
      await page.goto('/register');
      await page.locator('#name').fill(user.name);
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill(user.password);
      await page.locator('#confirmPassword').fill(user.password);
      await page.locator('#terms').check();
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Logout by clearing storage and going to login
      await page.evaluate(() => localStorage.clear());
      await page.goto('/login');

      // Login with registered credentials
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill(user.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    });

    test('should navigate to registration page from login', async ({ page }) => {
      await page.goto('/login');

      // Click sign up link
      await page.getByRole('link', { name: /sign up|create|register/i }).click();

      // Should navigate to registration page
      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Clear any stored auth state
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should allow authenticated user to access dashboard', async ({ page }) => {
      // Register a user first
      const user = generateTestUser();
      await page.goto('/register');
      await page.locator('#name').fill(user.name);
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill(user.password);
      await page.locator('#confirmPassword').fill(user.password);
      await page.locator('#terms').check();
      await page.getByRole('button', { name: /create account/i }).click();
      
      // Should be on dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      // Verify dashboard content
      await expect(page.getByText(/welcome back/i)).toBeVisible();
    });
  });
});
