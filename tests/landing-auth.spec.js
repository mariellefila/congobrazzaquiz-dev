import { test, expect } from '@playwright/test';

test.describe('Landing et authentification', () => {
  test('protège les destinations et ferme la modale sans naviguer', async ({ page }) => {
    await page.goto('/index.html');

    const categoryButton = page.getByRole('link', { name: 'Catégorie' });
    await categoryButton.click();

    await expect(page).toHaveURL(/\/index\.html$/);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter avec Facebook' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter avec Google' })).toBeVisible();

    await page.getByRole('button', { name: 'Fermer la fenêtre de connexion' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).toHaveURL(/\/index\.html$/);
  });

  test('adapte la modale aux écrans de téléphone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Mode' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveCSS('width', '343px');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/index\.html$/);
  });
});