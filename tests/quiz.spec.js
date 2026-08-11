import { test, expect } from '@playwright/test';

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

  test('smoke: reads all categories and starts a quiz with questions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Quiz : Congo-Brazzaville/i })).toBeVisible();
    await expect(page.locator('#menu h2')).toHaveText(/Choisissez une catégorie/i);

    const categoryButtons = page.locator('#menu button');
    await expect(categoryButtons.first()).toBeVisible();
    const totalButtons = await categoryButtons.count();
    expect(totalButtons).toBeGreaterThan(1);

    const categoryNames = [];
    for (let index = 0; index < totalButtons; index += 1) {
      const name = (await categoryButtons.nth(index).textContent())?.trim() || '';
      if (name && !/aléatoire/i.test(name)) {
        categoryNames.push(name);
      }
    }

    expect(categoryNames.length).toBeGreaterThan(0);

    for (const categoryName of categoryNames) {
      await page.getByRole('button', { name: categoryName, exact: true }).click();

      await expect(page.locator('#categoryTitle')).toHaveText(new RegExp(`^Quiz : ${categoryName}$`, 'i'));
      await expect(page.locator('#timer')).toHaveText(/Temps restant : \d+ secondes/);

      const questionTitle = page.locator('#quiz h3').first();
      await expect(questionTitle).toBeVisible();
      await expect(questionTitle).not.toHaveText(/^\s*$/);

      const options = page.locator('.quiz-option-btn');
      await expect(options).toHaveCount(4);

      await page.goto('/');
      await expect(page.getByRole('heading', { name: /Quiz : Congo-Brazzaville/i })).toBeVisible();
    }
  });
});
