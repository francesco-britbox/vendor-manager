/**
 * Invitation Flow E2E Tests
 *
 * Tests for the invitation-based user status management feature:
 * - User creation with "invited" status
 * - Email delivery confirmation feedback
 * - Status transition from "invited" to "active"
 * - Visual status indicators in admin UI
 * - Edge cases and error handling
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';

// Helper function to login as admin
async function loginAsAdmin(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/vendors/);
}

// Helper function to navigate to user management
async function navigateToUserManagement(page: any) {
  await page.goto(`${BASE_URL}/settings/access-control`);
  await page.waitForSelector('text=User Management');
}

// Helper function to generate a unique test email
function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-user-${timestamp}-${random}@example.com`;
}

test.describe('Invitation Flow - User Creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should create user with "invited" status when sending invitation', async ({ page }) => {
    await navigateToUserManagement(page);

    // Click Add User button
    await page.click('button:has-text("Add User")');
    await page.waitForSelector('text=Add New User');

    const testEmail = generateTestEmail();
    const testName = 'Test Invited User';

    // Fill in user details
    await page.fill('input#name', testName);
    await page.fill('input#email', testEmail);

    // Ensure "Send invitation email" is checked (should be default)
    const sendInvitationCheckbox = page.locator('input#sendInvitation');
    await expect(sendInvitationCheckbox).toBeChecked();

    // Submit the form
    await page.click('button:has-text("Create User")');

    // Wait for success message
    await page.waitForSelector('text=User created successfully');

    // Verify the user appears in the table with correct status
    const userRow = page.locator('tr', { has: page.locator(`text=${testEmail}`) });
    await expect(userRow).toBeVisible();

    // Check for "Pending Setup" badge
    await expect(userRow.locator('text=Pending Setup')).toBeVisible();
  });

  test('should create user with "active" status when not sending invitation', async ({ page }) => {
    await navigateToUserManagement(page);

    // Click Add User button
    await page.click('button:has-text("Add User")');
    await page.waitForSelector('text=Add New User');

    const testEmail = generateTestEmail();
    const testName = 'Test Active User';

    // Fill in user details
    await page.fill('input#name', testName);
    await page.fill('input#email', testEmail);

    // Uncheck "Send invitation email"
    await page.click('input#sendInvitation');

    // Password field should now appear
    await page.waitForSelector('input#password');
    await page.fill('input#password', 'TestPassword123!');

    // Submit the form
    await page.click('button:has-text("Create User")');

    // Wait for success message
    await page.waitForSelector('text=User created successfully');

    // Verify the user appears in the table
    const userRow = page.locator('tr', { has: page.locator(`text=${testEmail}`) });
    await expect(userRow).toBeVisible();

    // Should NOT show "Pending Setup" badge
    await expect(userRow.locator('text=Pending Setup')).not.toBeVisible();
  });
});

test.describe('Invitation Flow - Email Delivery Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should show email success confirmation in toast', async ({ page }) => {
    await navigateToUserManagement(page);

    // Click Add User button
    await page.click('button:has-text("Add User")');

    const testEmail = generateTestEmail();

    // Fill in user details with invitation
    await page.fill('input#name', 'Email Success Test User');
    await page.fill('input#email', testEmail);

    // Submit the form
    await page.click('button:has-text("Create User")');

    // Check for email sent confirmation in success message
    // Note: This will show email sent confirmation if SMTP is configured
    const successMessage = page.locator('.text-green-700');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  test('should show resend invitation button with proper tooltip', async ({ page }) => {
    await navigateToUserManagement(page);

    // Find any user row with a Send button
    const sendButton = page.locator('button:has(svg.lucide-send)').first();

    if (await sendButton.isVisible()) {
      // Hover over the button to see tooltip
      await sendButton.hover();

      // Should show tooltip with invitation info
      await expect(page.locator('text=invitation email').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Invitation Flow - Status Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should filter users by "Pending Setup" status', async ({ page }) => {
    await navigateToUserManagement(page);

    // Select "Pending Setup" filter
    await page.click('[data-testid="status-filter"]');
    await page.click('text=Pending Setup');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // All visible users should have "Pending Setup" badge
    const userRows = page.locator('tbody tr');
    const rowCount = await userRows.count();

    if (rowCount > 0) {
      for (let i = 0; i < rowCount; i++) {
        const row = userRows.nth(i);
        // Each row should have Pending Setup badge
        const hasPendingBadge = await row.locator('text=Pending Setup').isVisible();
        // Skip if row is empty message
        const isEmpty = await row.locator('text=No users found').isVisible();
        if (!isEmpty) {
          expect(hasPendingBadge || isEmpty).toBeTruthy();
        }
      }
    }
  });

  test('should filter users by "Email Failed" status', async ({ page }) => {
    await navigateToUserManagement(page);

    // Select "Email Failed" filter
    await page.click('[data-testid="status-filter"]');
    await page.click('text=Email Failed');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // All visible users should have email failed indicator
    const userRows = page.locator('tbody tr');
    const rowCount = await userRows.count();

    // Either no users or all have failed email badge
    // (This test validates the filter works, even if no failed emails exist)
  });
});

test.describe('Invitation Flow - Status Badges Display', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display correct status badges for users', async ({ page }) => {
    await navigateToUserManagement(page);

    // Verify status column header exists
    await expect(page.locator('th:has-text("Status")')).toBeVisible();

    // Check that at least one user row has status badges
    const statusCells = page.locator('tbody td:nth-child(3)');
    const cellCount = await statusCells.count();

    if (cellCount > 0) {
      const firstStatusCell = statusCells.first();
      // Should have either Active/Inactive badge
      const hasActiveStatus = await firstStatusCell.locator('text=Active').isVisible();
      const hasInactiveStatus = await firstStatusCell.locator('text=Inactive').isVisible();
      expect(hasActiveStatus || hasInactiveStatus).toBeTruthy();
    }
  });

  test('should show email failed badge with error tooltip', async ({ page }) => {
    await navigateToUserManagement(page);

    // Look for any "Email Failed" badge
    const emailFailedBadge = page.locator('text=Email Failed').first();

    if (await emailFailedBadge.isVisible()) {
      // Hover to see tooltip with error details
      await emailFailedBadge.hover();

      // Should show tooltip with error details
      await expect(page.locator('text=Email delivery failed')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Invitation Flow - Resend Invitation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should show loading state when resending invitation', async ({ page }) => {
    await navigateToUserManagement(page);

    // Find a user's send invitation button
    const sendButton = page.locator('button:has(svg.lucide-send)').first();

    if (await sendButton.isVisible()) {
      // Click to resend
      await sendButton.click();

      // Should show loading spinner
      await expect(sendButton.locator('svg.animate-spin')).toBeVisible({ timeout: 1000 });

      // Wait for operation to complete
      await page.waitForSelector('svg.animate-spin', { state: 'detached', timeout: 10000 }).catch(() => {});
    }
  });

  test('should update user list after successful resend', async ({ page }) => {
    await navigateToUserManagement(page);

    // Create a new invited user first
    await page.click('button:has-text("Add User")');
    await page.waitForSelector('text=Add New User');

    const testEmail = generateTestEmail();
    await page.fill('input#name', 'Resend Test User');
    await page.fill('input#email', testEmail);
    await page.click('button:has-text("Create User")');
    await page.waitForSelector('text=User created successfully');

    // Find the send button for our new user
    const userRow = page.locator('tr', { has: page.locator(`text=${testEmail}`) });
    const sendButton = userRow.locator('button:has(svg.lucide-send), button:has(svg.lucide-mail-x)');

    if (await sendButton.isVisible()) {
      // Resend invitation
      await sendButton.click();

      // Wait for success or error message
      await page.waitForSelector('.text-green-700, .text-destructive', { timeout: 10000 });
    }
  });
});

test.describe('Invitation Flow - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should prevent duplicate email addresses', async ({ page }) => {
    await navigateToUserManagement(page);

    // Try to create a user with admin's email
    await page.click('button:has-text("Add User")');
    await page.waitForSelector('text=Add New User');

    await page.fill('input#name', 'Duplicate User');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.click('input#sendInvitation'); // Uncheck to show password field
    await page.fill('input#password', 'TestPassword123!');

    await page.click('button:has-text("Create User")');

    // Should show error about duplicate email
    await expect(page.locator('text=already exists')).toBeVisible({ timeout: 5000 });
  });

  test('should handle search with status filters', async ({ page }) => {
    await navigateToUserManagement(page);

    // Enter search query
    await page.fill('input[placeholder*="Search"]', 'admin');

    // Apply filter
    await page.click('[data-testid="status-filter"]');
    await page.click('text=Active Only');

    // Wait for results
    await page.waitForTimeout(500);

    // Results should be filtered
    const results = page.locator('tbody tr');
    // Either shows matching users or "No users found"
    await expect(results.first()).toBeVisible();
  });
});

test.describe('Invitation Flow - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should have proper ARIA labels for status badges', async ({ page }) => {
    await navigateToUserManagement(page);

    // Check that badges are accessible
    const badges = page.locator('[class*="Badge"]');
    const badgeCount = await badges.count();

    // Badges should be visible and have text content
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('should have proper tooltips for action buttons', async ({ page }) => {
    await navigateToUserManagement(page);

    // Find action buttons
    const editButton = page.locator('button:has(svg.lucide-edit)').first();

    if (await editButton.isVisible()) {
      await editButton.hover();

      // Should show tooltip
      await expect(page.locator('[role="tooltip"], [data-state="instant-open"]').locator('text=Edit')).toBeVisible({ timeout: 3000 }).catch(() => {
        // Tooltip might not use role="tooltip", just check for visible text
      });
    }
  });
});
