import { expect, test } from '@playwright/test';

test('public language choice carries into the staff login and can change there', async ({
  page,
}) => {
  await page.goto('/');

  const languageSelect = page.locator('select.lang-select');
  if (await languageSelect.isVisible()) {
    await languageSelect.selectOption('en');
  } else {
    await page.getByRole('button', { name: 'EN', exact: true }).click();
  }

  const staffLink = page.getByRole('link', { name: 'Staff login', exact: true });
  const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await staffLink.click();

  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Reservations and menu panel', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();

  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('link', { name: 'RU', exact: true }).click(),
  ]);
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru', { timeout: 15_000 });
  await expect(page.getByText('Панель бронирований и меню', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
});

test('staff account management requires an authenticated administrator', async ({ page }) => {
  await page.goto('/staff/team');

  await expect(page).toHaveURL(/\/staff\/login\?next=%2Fstaff%2Fteam$/);
  await expect(page.getByRole('button', { name: /zaloguj|sign in|войти|kirish/i })).toBeVisible();
});
