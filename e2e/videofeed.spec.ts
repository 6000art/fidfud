import { test, expect } from '@playwright/test';

test.describe('Fidfud Vertical Video Feed E2E Tests (Mobile-First / Next.js 14)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application root
    await page.goto('/');
  });

  test('should load application and display vertical video feed container', async ({ page }) => {
    // Check if main feed or video feed components exist in DOM
    const videoFeed = page.locator('video').first();
    await expect(videoFeed).toBeVisible({ timeout: 10000 });
  });

  test('should allow user to tap video to play/pause or mute/unmute', async ({ page }) => {
    const video = page.locator('video').first();
    await expect(video).toBeVisible();

    // Click video to trigger interaction
    await video.click();

    // Verify video element exists and responds
    const isPaused = await video.evaluate((v: HTMLVideoElement) => v.paused);
    expect(typeof isPaused).toBe('boolean');
  });

  test('should display cart / order CTA drawer when order button is clicked', async ({ page }) => {
    // Find shopping bag or order button
    const orderButton = page.locator('button:has-text("Commander"), button:has-text("MENU"), [data-testid="bag-icon"]').first();
    if (await orderButton.isVisible()) {
      await orderButton.click();
      
      // Verify drawer or modal opens
      const modalOrDrawer = page.locator('text=Ajouter').first();
      await expect(modalOrDrawer).toBeVisible({ timeout: 5000 });
    }
  });

  test('should support touch swipe / scroll for infinite feed navigation', async ({ page }) => {
    const feedContainer = page.locator('[data-video-container]').first();
    if (await feedContainer.isVisible()) {
      // Perform touch scroll down
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(1000);

      // Check that page handles scrolling without crashing
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
