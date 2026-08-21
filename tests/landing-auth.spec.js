import { test, expect } from '@playwright/test';

test.describe('Landing et authentification', () => {
  async function mockSupabase(page, { session = null } = {}) {
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
              async getSession() { return { data: { session: ${JSON.stringify(session)} }, error: null }; },
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

  test('demande la connexion avant la modale mode puis enchaîne sur la modale catégorie', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page.locator('#heroVideo')).toBeVisible();
    await page.getByRole('link', { name: 'Jouer' }).click();

    await expect(page).toHaveURL(/\/index\.html$/);
    await expect(page.locator('[data-login-modal]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible();
    await expect(page.locator('[data-mode-modal]')).toBeHidden();

    await page.getByRole('link', { name: 'Continuer sans se connecter' }).click();

    await expect(page.locator('[data-login-modal]')).toBeHidden();
    await expect(page.locator('[data-mode-modal]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /MODE DE JEU/ })).toBeVisible();

    await page.locator('[data-mode-slug="solo"]').click();

    await expect(page).toHaveURL(/\/index\.html$/);
    await expect(page.locator('[data-category-overlay]')).toBeVisible();
    await expect(page.locator('[data-category-modal]')).toBeVisible();
    await expect(page.locator('#category-modal-title')).toHaveText('CHOISISSEZ VOTRE CATÉGORIE');
    await expect(page.locator('#heroVideo')).toBeVisible();

    await page.getByRole('button', { name: 'Fermer la fenêtre des catégories' }).click();
    await expect(page.locator('[data-category-overlay]')).toBeHidden();
    await expect(page.locator('#heroVideo')).toBeVisible();
  });

  test('ouvre directement la modale mode quand la session est déjà active', async ({ page }) => {
    await mockSupabase(page, { session: { user: { id: 'user-1' } } });
    await page.goto('/index.html');

    await page.getByRole('link', { name: 'Jouer' }).click();

    await expect(page.locator('[data-login-modal]')).toBeHidden();
    await expect(page.locator('[data-mode-modal]')).toBeVisible();
    await expect(page).toHaveURL(/\/index\.html$/);
  });

  test('JOUER connecté ouvre directement le choix du mode sans écran de connexion', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.getByRole('button', { name: 'Se connecter avec Google' }).click();
    await expect(page.locator('[data-auth-label]')).toHaveText('AMELIA.B');

    await page.getByRole('link', { name: 'Jouer' }).click();

    await expect(page.locator('[data-login-modal]')).toBeHidden();
    await expect(page.locator('[data-mode-modal]')).toBeVisible();
    await expect(page).toHaveURL(/\/index\.html$/);
  });

  test('JOUER non connecté redirige vers le choix du mode après connexion', async ({ page }) => {
    await page.goto('/index.html');

    await page.getByRole('link', { name: 'Jouer' }).click();
    await expect(page.locator('[data-login-modal]')).toBeVisible();

    await page.getByRole('button', { name: 'Se connecter avec Google' }).click();

    await expect(page.locator('[data-login-modal]')).toBeHidden();
    await expect(page.locator('[data-mode-modal]')).toBeVisible();
    await expect(page.locator('[data-auth-label]')).toHaveText('AMELIA.B');
    await expect(page).toHaveURL(/\/index\.html$/);
    expect(await page.evaluate(() => sessionStorage.getItem('cbq.pendingAction'))).toBeNull();
  });

  test('SE CONNECTER ramène à la landing sans ouvrir le choix du mode', async ({ page }) => {
    await page.goto('/index.html');

    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.getByRole('button', { name: 'Se connecter avec Google' }).click();

    await expect(page).toHaveURL(/\/index\.html$/);
    await expect(page.locator('[data-mode-modal]')).toBeHidden();
    await expect(page.locator('[data-auth-label]')).toHaveText('AMELIA.B');
  });

  test('Rejoindre affiche directement la modale des modes en réseaux et ferme sans naviguer', async ({ page }) => {
    await page.goto('/index.html');

    const joinButton = page.getByRole('link', { name: 'Rejoindre' });
    await joinButton.click();

    await expect(page).toHaveURL(/\/index\.html$/);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'EN RÉSEAUX' })).toBeVisible();
    await expect(page.getByText('ARRIVENT BIENTÔT !')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Restez connecté')).toBeVisible();

    await page.getByRole('button', { name: 'Fermer la fenêtre des modes en réseaux' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).toHaveURL(/\/index\.html$/);
  });

  test('adapte la modale Rejoindre aux écrans de téléphone', async ({ page }) => {
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

  test('affiche la modale catégorie par-dessus la landing sans vider la vidéo ni naviguer', async ({ page }) => {
    await mockSupabase(page, { session: { user: { id: 'user-1' } } });
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Jouer' }).click();
    await page.locator('[data-mode-slug="solo"]').click();

    await expect(page.locator('[data-category-overlay]')).toBeVisible();
    await expect(page.locator('[data-category-modal]')).toBeVisible();
    await expect(page.locator('#category-modal-title')).toHaveText('CHOISISSEZ VOTRE CATÉGORIE');
    await expect(page.locator('#heroVideo')).toBeVisible();
    await expect(page.locator('[data-category-modal] .category-card')).toHaveCount(8);

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(page.locator('#category-modal-title')).toBeVisible();
    await expect(page.locator('.category-modal')).toHaveCSS('max-width', '1200px');

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]) {
      await page.setViewportSize(viewport);
      const modal = page.locator('[data-category-modal]');
      const scrollArea = page.locator('.category-modal__scroll');
      const closeButton = page.getByRole('button', { name: 'Fermer la fenêtre des catégories' });

      await expect(modal).toBeVisible();
      await expect(page.locator('[data-category-modal] .category-card')).toHaveCount(8);
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
      await expect(scrollArea).toHaveCSS('overflow-y', 'auto');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

      const modalBox = await modal.boundingBox();
      const closeBox = await closeButton.boundingBox();
      expect(modalBox?.y).toBeGreaterThanOrEqual(0);
      expect((modalBox?.y ?? 0) + (modalBox?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
      expect(closeBox?.y).toBeGreaterThanOrEqual(modalBox?.y ?? 0);
      expect((closeBox?.y ?? 0) + (closeBox?.height ?? 0)).toBeLessThanOrEqual((modalBox?.y ?? 0) + (modalBox?.height ?? 0));

      const beforeScrollY = await page.evaluate(() => window.scrollY);
      await scrollArea.evaluate((element) => { element.scrollTop = element.scrollHeight; });
      await expect(page.locator('[data-category-slug="aleatoire"]')).toBeInViewport();
      expect(await page.evaluate(() => window.scrollY)).toBe(beforeScrollY);
    }

    await expect(page.locator('[data-category-overlay]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.6)');
  });

  // La connexion réelle est temporairement simulée (MOCK AUTH) : le provider
  // OAuth cliqué ouvre directement la session « AMELIA.B » sur la landing.
  test('simule la connexion et affiche AMELIA.B sur la landing après login', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.getByRole('button', { name: 'Se connecter avec Google' }).click();

    await expect(page).toHaveURL(/\/index\.html$/);
    await expect(page.locator('[data-login-modal]')).toBeHidden();
    await expect(page.locator('[data-auth-trigger]')).toHaveAttribute('data-auth-state', 'signed-in');
    await expect(page.locator('[data-auth-label]')).toHaveText('AMELIA.B');
    await expect(page.locator('[data-auth-avatar]')).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-auth-label]')).toHaveText('AMELIA.B');

    await page.locator('[data-auth-trigger]').click();
    await expect(page.locator('[data-profile-modal]')).toBeVisible();
    await expect(page.locator('[data-profile-name]')).toHaveText('Amelia B');
  });

  test('affiche le nouvel écran de résultat en mode solo', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('link', { name: 'Jouer' }).click();
    await page.getByRole('link', { name: 'Continuer sans se connecter' }).click();
    await page.locator('[data-mode-slug="solo"]').click();
    await page.getByRole('button', { name: 'Géographie' }).click();

    for (let index = 0; index < 10; index += 1) {
      await page.locator('.quiz-option-btn').first().click();
    }

    await expect(page.locator('.solo-result-title')).toBeVisible();
    await expect(page.getByText('Quiz terminé', { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-solo-quiz-next]')).toBeHidden();
    await expect(page.locator('.solo-result-score strong')).toHaveText(/\d+/);
    await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Changer de catégorie' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Voir le classement/i })).toBeVisible();
  });
});