import { expect, test } from '@playwright/test';

test('public navigation exposes menu and online reservations', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Guzar Garden/);
  await expect(page.getByRole('link', { name: /rezerw|book/i }).first()).toBeVisible();

  await page.goto('/menu');
  await expect(page.getByRole('main')).toBeVisible();

  await page.goto('/reserve');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^2\b/ })).toBeVisible();
});
