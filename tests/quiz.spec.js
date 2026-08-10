const { test, expect } = require('@playwright/test');

test.describe('Congo-Brazza Quizz', () => {
  test('loads the menu and completes a quiz session', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Quiz : Congo-Brazzaville/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Géographie' })).toBeVisible();

    await page.getByRole('button', { name: 'Géographie' }).click();
    await expect(page.locator('#timer')).toHaveText(/Temps restant : \d+ secondes/);
    await expect(page.locator('.quiz-option-btn')).toHaveCount(4);

    for (let index = 0; index < 10; index += 1) {
      await page.locator('.quiz-option-btn').first().click();
      if (index < 9) {
        await expect(page.locator('.quiz-option-btn')).toHaveCount(4);
      }
    }

    await expect(page.getByRole('heading', { name: /Quiz terminé !/ })).toBeVisible();
    await expect(page.locator('#score')).toHaveText(/Score : \d+ \/ 10/);

    await page.getByRole('button', { name: /Rejouer/i }).click();
    await expect(page.getByRole('heading', { name: /Quiz : Congo-Brazzaville/i })).toBeVisible();
  });
});
