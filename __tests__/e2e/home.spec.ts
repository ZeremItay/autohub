/**
 * Example E2E test for home page
 * Demonstrates Playwright testing setup
 */
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if page title is correct
    await expect(page).toHaveTitle(/מועדון האוטומטורים/);
  });

  test('should display reports ticker', async ({ page }) => {
    await page.goto('/');
    
    // Check if reports section exists
    const reportsSection = page.locator('text=דיווחים');
    await expect(reportsSection).toBeVisible();
  });

  test('should navigate to profile when clicking friend', async ({ page }) => {
    await page.goto('/');
    
    // Wait for friends list to load
    await page.waitForSelector('text=חברים', { timeout: 5000 });
    
    // Click on first friend if exists
    const firstFriend = page.locator('[class*="cursor-pointer"]').first();
    if (await firstFriend.isVisible()) {
      await firstFriend.click();
      // Should navigate to profile page
      await expect(page).toHaveURL(/\/profile/);
    }
  });
});



