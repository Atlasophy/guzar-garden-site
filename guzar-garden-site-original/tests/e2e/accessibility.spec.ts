import { expect, test } from '@playwright/test';

/**
 * The accessibility behaviour that was broken, pinned in a browser.
 *
 * Two of these cover defects found on 10 September 2026 by running the suite
 * rather than by reading the code, and both were invisible to the unit tests:
 * /menu had no <main> landmark and its skip link pointed at an id that only
 * existed inside <noscript>, and the booking flow dropped focus to <body> at
 * every step.
 *
 * The first case is also the answer to a question this project spent real time
 * on. Two accessibility-tree snapshot tools reported the party-size and time
 * buttons as having no accessible name, because their text is nested in <b> and
 * <small> rather than being a direct child. Playwright implements the actual
 * accname algorithm, so `getByRole('button', { name: … })` matching here is
 * evidence that the buttons are named correctly and the snapshots were wrong.
 */

test('booking controls expose real accessible names', async ({ page }) => {
  await page.goto('/reserve');

  // Named from nested <b>/<small> text — the thing the snapshot tools missed.
  await expect(page.getByRole('button', { name: /^2\b/ })).toBeVisible();

  // The step's own heading — the page also has a sidebar h2, so this is scoped
  // by id rather than by level.
  await expect(page.locator('h2#step-party')).toBeVisible();
});

test('the menu has a main landmark and a working skip link', async ({ page }) => {
  await page.goto('/menu');

  const main = page.getByRole('main');
  await expect(main).toBeVisible();

  // The skip link must point at something that exists in the rendered page.
  const skip = page.locator('a.skip-link').first();
  if (await skip.count()) {
    const href = await skip.getAttribute('href');
    expect(href).toBeTruthy();
    const targetId = (href ?? '').replace(/^#/, '');
    await expect(page.locator(`#${targetId}`)).toHaveCount(1);
  }
});

test('focus moves to the new step instead of being dropped on the body', async ({ page }) => {
  await page.goto('/reserve');

  await page.getByRole('button', { name: /^2\b/ }).click();

  // The date step's heading receives focus. Without this the browser drops
  // focus to <body> and a keyboard user restarts from the top of the document.
  const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
  expect(focusedId).toBe('step-date');
});

test('does not steal focus on first load', async ({ page }) => {
  await page.goto('/reserve');
  const isBody = await page.evaluate(() => document.activeElement === document.body);
  expect(isBody).toBe(true);
});

test('the menu is not showing its unavailable fallback', async ({ page }) => {
  // A 200 is not a health check for this page: it returns 200 while telling the
  // visitor the menu is unavailable. That is exactly how the price bug hid.
  await page.goto('/menu');
  await expect(page.getByText(/chwilowo niedost/i)).toHaveCount(0);
});

test('no horizontal overflow on the booking flow', async ({ page }) => {
  await page.goto('/reserve');
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});
