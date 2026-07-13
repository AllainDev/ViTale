import { test, expect } from '@playwright/test';

test.describe('ViTale Showcase E2E Integration', () => {
  test('should load the showcase page and display products', async ({ page }) => {
    // Navigate to the showcase page
    await page.goto('/showcase');

    // Check if the page title is correct
    await expect(page).toHaveTitle(/ViTale/);

    // Verify the header is visible
    const header = page.getByRole('heading', { name: /Khám Phá Sản Phẩm/i });
    await expect(header).toBeVisible();

    // Verify that products are rendered (assuming at least 1 product exists)
    // The products are fetched from the backend so this is a true integration test
    // We wait for the product grid to populate
    const productCards = page.locator('.group.relative.bg-white');
    
    // Wait for at least one card to be visible (timeout after 10s if backend is slow)
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });

    // Ensure the price tag is formatted correctly (contains currency symbol)
    const priceText = productCards.first().locator('.font-bold.text-blue-600');
    await expect(priceText).toContainText(/₫|VND/);
  });
});
