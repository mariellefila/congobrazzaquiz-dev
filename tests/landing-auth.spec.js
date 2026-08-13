import { test, expect } from '@playwright/test';

test.describe('Landing et authentification', () => {
  async function mockSupabase(page) {
    await page.route('**/supabase-config.js', async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `window.SUPABASE_URL = 'https://example.supabase.co'; window.SUPABASE_ANON_KEY = 'test-anon-key';`,
      });
    });
    await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm', async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `export function createClient() {
          return {
            auth: {
              async getSession() { return { data: { session: null }, error: null }; },
              async signInWithOAuth({ provider, options }) {
                window.__oauthCall = { provider, redirectTo: options.redirectTo };
                return { data: { provider }, error: null };
              },
            },
          };
        }`,
      });
    });
  }

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

  test('permet de continuer sans authentification vers la destination demandée', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Mode' }).click();
    await page.getByRole('link', { name: 'Continuer sans se connecter' }).click();

    await expect(page).toHaveURL(/\/pages\/mode\.html$/);
  });

  test('appelle le provider OAuth sélectionné avec la landing comme callback', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Catégorie' }).click();
    await page.getByRole('button', { name: 'Se connecter avec Google' }).click();

    await expect.poll(() => page.evaluate(() => window.__oauthCall)).toEqual({
      provider: 'google',
      redirectTo: 'http://127.0.0.1:4173/index.html',
    });

    await page.reload();
    await page.getByRole('link', { name: 'Mode' }).click();
    await page.getByRole('button', { name: 'Se connecter avec Facebook' }).click();

    await expect.poll(() => page.evaluate(() => window.__oauthCall)).toEqual({
      provider: 'facebook',
      redirectTo: 'http://127.0.0.1:4173/index.html',
    });
  });
});