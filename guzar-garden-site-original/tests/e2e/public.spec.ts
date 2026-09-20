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

test('homepage intro does not update an unmounted component', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await page.waitForTimeout(800);

  expect(errors).not.toContain(
    expect.stringContaining(
      "Can't perform a React state update on a component that hasn't mounted yet",
    ),
  );
});
