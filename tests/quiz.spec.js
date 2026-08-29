import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test(`le gamepad mobile affiche les quatre réponses sans défilement (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await page.evaluate(() => {
      document.body.classList.add('solo-quiz-active');
      const overlay = document.querySelector('[data-category-overlay]');
      const modal = document.querySelector('[data-category-modal]');
      const stage = document.querySelector('[data-quiz-stage]');
      overlay.hidden = false;
      modal.hidden = false;
      modal.classList.add('is-quiz-active');
      stage.hidden = false;
      document.querySelector('#soloQuiz').innerHTML = `
        <div class="solo-quiz-category">Histoire</div>
        <div class="solo-quiz-content">
          <h3 class="solo-quiz-question">En quelle année le Congo-Brazzaville a-t-il obtenu son indépendance ?</h3>
          <p id="soloTimer">00:30 seconde</p>
          <div class="solo-quiz-answers">
            ${['A', 'B', 'C', 'D'].map((letter) => `<button class="quiz-option-btn"><span class="quiz-option-index">${letter}</span><span class="quiz-option-text">Réponse ${letter}</span></button>`).join('')}
          </div>
        </div>`;
    });

    const fourthAnswer = page.locator('.solo-quiz-answers .quiz-option-btn').nth(3);
    await expect(fourthAnswer).toBeVisible();
    expect((await fourthAnswer.boundingBox())?.y + (await fourthAnswer.boundingBox())?.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height);
  });
}

test.describe('Congo-Brazza Quizz', () => {
  test('loads the menu and completes a quiz session', async ({ page }) => {
    await page.goto('/pages/categorie.html');

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

    await expect(page.locator('.solo-result-title')).toBeVisible();
    await expect(page.locator('.solo-result-score strong')).toHaveText(/\d+/);
    await expect(page.locator('.solo-result-stats article').first()).toContainText(/\d+\/10/);
    await expect(page.getByRole('link', { name: /Voir le classement/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Changer de catégorie' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fermer la fenêtre des catégories' })).toBeVisible();

    await page.getByRole('button', { name: /Rejouer/i }).click();
    await expect(page.locator('.quiz-category-badge')).toContainText('Géographie');
    await expect(page.locator('.quiz-option-btn')).toHaveCount(4);
  });

  test('le résultat permet de revenir au choix de catégorie', async ({ page }) => {
    await page.goto('/pages/categorie.html');
    await page.getByRole('button', { name: 'Géographie' }).click();

    for (let index = 0; index < 10; index += 1) {
      await page.locator('.quiz-option-btn').first().click();
    }

    await expect(page.locator('.solo-result-title')).toBeVisible();
    await page.getByRole('button', { name: 'Changer de catégorie' }).click();
    await expect(page.locator('#menu h3')).toHaveText('CHOISISSEZ VOTRE CATÉGORIE');
  });

  test('smoke: reads all categories and starts a quiz with questions', async ({ page }) => {
    await page.goto('/pages/categorie.html');
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

      await page.goto('/pages/categorie.html');
      await expect(page.getByRole('heading', { name: /Quiz : Congo-Brazzaville/i })).toBeVisible();
    }
  });
});
