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

    const categoryButton = page.getByRole('link', { name: 'Jouer' });
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
    await page.getByRole('link', { name: 'Rejoindre' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveCSS('width', '343px');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/index\.html$/);
  });

  test('active les CTA au clic et au clavier sur mobile et desktop', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Jouer' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 375, height: 667 });
    await page.getByRole('link', { name: 'Jouer' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('link', { name: 'Rejoindre' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('permet de continuer sans authentification vers la destination demandée', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Rejoindre' }).click();
    await page.getByRole('link', { name: 'Continuer sans se connecter' }).click();

    await expect(page).toHaveURL(/\/pages\/mode\.html$/);
  });

  test('affiche le contenu de la modale de mode sans le vider au clic ou au resize', async ({ page }) => {
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
              async getSession() {
                return {
                  data: {
                    session: {
                      user: {
                        id: 'user-1',
                        email: 'user@example.com',
                        user_metadata: { full_name: 'Test User' }
                      }
                    }
                  },
                  error: null
                };
              },
              async signInWithOAuth({ provider, options }) {
                window.__oauthCall = { provider, redirectTo: options.redirectTo };
                return { data: { provider }, error: null };
              },
            },
          };
        }`,
      });
    });

    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Jouer' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('CHOISISSEZ VOTRE')).toBeVisible();
    await expect(page.getByText('MODE DE JEU')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'JOUER SEUL' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'JOUER À PLUSIEURS' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'JOUER EN SALLE' })).toBeVisible();

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(page.getByRole('heading', { name: 'JOUER SEUL' })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'JOUER EN SALLE' })).toBeVisible();
    await expect(page.locator('.mode-card--solo')).toHaveCSS('min-height', '180px');
    await expect(page.locator('.mode-card--solo .mode-card-divider')).toBeHidden();
    await expect(page.locator('.mode-card--solo .mode-card-button')).toBeHidden();
    await expect(page.locator('.mode-card--solo')).toHaveCSS('grid-template-columns', /102px .* 16px/);
  });

  test('appelle le provider OAuth sélectionné avec la landing comme callback', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Jouer' }).click();
    await page.getByRole('button', { name: 'Se connecter avec Google' }).click();

    await expect.poll(() => page.evaluate(() => window.__oauthCall)).toEqual({
      provider: 'google',
      redirectTo: 'http://127.0.0.1:4173/index.html',
    });

    await page.reload();
    await page.getByRole('link', { name: 'Rejoindre' }).click();
    await page.getByRole('button', { name: 'Se connecter avec Facebook' }).click();

    await expect.poll(() => page.evaluate(() => window.__oauthCall)).toEqual({
      provider: 'facebook',
      redirectTo: 'http://127.0.0.1:4173/index.html',
    });
  });
});