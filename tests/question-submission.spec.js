import { test, expect } from '@playwright/test';

test.describe('Soumission de questions', () => {
  async function mockSupabase(page, {
    session = { user: { id: 'user-123' } },
    categories = [{ id: 'cat-1', name: 'Géographie', slug: 'geographie' }],
    existingSubmissions = [],
  } = {}) {
    await page.route('**/supabase-config.js', async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `window.SUPABASE_URL = 'https://example.supabase.co'; window.SUPABASE_ANON_KEY = 'test-anon-key';`,
      });
    });

    await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm', async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `window.__submissions = ${JSON.stringify(existingSubmissions)};
        export function createClient() {
          return {
            auth: {
              async getSession() { return { data: { session: ${JSON.stringify(session)} }, error: null }; },
            },
            from(table) {
              const methods = {
                select(fieldName) {
                  if (table === 'categories') {
                    return {
                      order() { return { data: ${JSON.stringify(categories)}, error: null }; },
                    };
                  }
                  if (table === 'players') {
                    return {
                      eq(column, value) {
                        return {
                          maybeSingle() {
                            return { data: value === 'user-123' ? { id: 'player-123' } : null, error: null };
                          },
                        };
                      },
                    };
                  }
                  if (table === 'question_submissions') {
                    return {
                      eq(column, value) {
                        return {
                          order() {
                            return { data: window.__submissions.filter((s) => s.player_id === value), error: null };
                          },
                        };
                      },
                    };
                  }
                  return { error: null, data: [] };
                },
                insert(payload) {
                  if (table !== 'question_submissions') {
                    return { data: null, error: null };
                  }
                  window.__questionSubmission = payload;
                  const stored = { id: 'submission-' + (window.__submissions.length + 1), created_at: new Date().toISOString(), ...payload };
                  window.__submissions.push(stored);
                  return { data: [stored], error: null };
                },
              };

              return methods;
            },
          };
        }`,
      });
    });
  }

  test('le CTA du header ouvre le formulaire de proposition', async ({ page }) => {
    await page.goto('/index.html');

    await page.locator('header.hero-nav').getByRole('link', { name: 'Proposer une question' }).click();

    await expect(page).toHaveURL(/\/pages\/proposer-question\.html$/);
    await expect(page.getByRole('heading', { name: 'Proposer une question' })).toBeVisible();
  });

  test('affiche le formulaire de soumission et enregistre la proposition', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/pages/proposer-question.html');

    await expect(page.getByRole('heading', { name: 'Proposer une question' })).toBeVisible();
    await expect(page.locator('form[data-question-submission-form]')).toBeVisible();

    await page.locator('[name="categorySlug"]').selectOption('geographie');
    await page.locator('[name="question"]').fill('Quelle est la capitale du Congo-Brazzaville ?');
    await page.locator('[name="image"]').fill('https://example.com/brazzaville.jpg');
    await page.locator('[name="correctAnswer"]').fill('Brazzaville');
    await page.locator('[name="wrongAnswer1"]').fill('Pointe-Noire');
    await page.locator('[name="wrongAnswer2"]').fill('Kinshasa');
    await page.locator('[name="wrongAnswer3"]').fill('Poto-Poto');

    await page.getByRole('button', { name: 'Soumettre la question' }).click();

    await expect(page.locator('[data-submission-status]')).toHaveText(/question soumise/i);
    const payload = await page.evaluate(() => window.__questionSubmission);
    expect(payload.category_slug).toBe('geographie');
    expect(payload.answer).toBe('Brazzaville');
    expect(payload.image).toBe('https://example.com/brazzaville.jpg');
    expect(payload.options).toEqual(['Brazzaville', 'Pointe-Noire', 'Kinshasa', 'Poto-Poto']);

    await expect(page.locator('[data-my-submissions]')).toBeVisible();
    await expect(page.locator('[data-my-submissions-list] .proposal-history-item')).toHaveCount(1);
    await expect(page.locator('[data-my-submissions-list] .proposal-history-status')).toHaveText('En attente');
  });

  test('affiche uniquement les propositions du joueur connecté avec leur statut', async ({ page }) => {
    await mockSupabase(page, {
      existingSubmissions: [
        { id: 'sub-own-1', player_id: 'player-123', question: 'Question déjà approuvée', status: 'approved' },
        { id: 'sub-own-2', player_id: 'player-123', question: 'Question refusée', status: 'rejected', rejection_reason: 'Doublon' },
        { id: 'sub-other', player_id: 'player-999', question: 'Question d’un autre joueur', status: 'pending' },
      ],
    });
    await page.goto('/pages/proposer-question.html');

    const items = page.locator('[data-my-submissions-list] .proposal-history-item');
    await expect(items).toHaveCount(2);
    await expect(page.locator('[data-my-submissions-list]')).not.toContainText('Question d’un autre joueur');
    await expect(page.locator('[data-my-submissions-list]')).toContainText('Doublon');
  });

  test('demande la connexion avant de proposer une question si aucun utilisateur n’est connecté', async ({ page }) => {
    await mockSupabase(page, { session: null });
    await page.goto('/pages/proposer-question.html');

    await expect(page.getByText(/connectez-vous pour proposer/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '../index.html');
  });
});
