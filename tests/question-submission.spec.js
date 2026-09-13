import { test, expect } from '@playwright/test';

test.describe('Soumission de questions', () => {
  async function mockSupabase(page, {
    session = { user: { id: 'user-123' } },
    categories = [{ id: 'cat-1', name: 'Géographie', slug: 'geographie' }],
    existingSubmissions = [],
    insertFails = false,
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
            storage: {
              from(bucket) {
                return {
                  async upload(path, file) { window.__storageUpload = { bucket, path, type: file.type, size: file.size }; return { data: { path }, error: null }; },
                  async remove(paths) { window.__storageRemove = paths; return { data: paths, error: null }; },
                  async createSignedUrl(path) { return { data: { signedUrl: 'https://signed.example/' + path }, error: null }; },
                };
              },
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
                  if (${insertFails}) return { data: null, error: { message: 'Insertion refusée' } };
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
    await expect(page.getByRole('heading', { name: 'À toi de jouer !' })).toBeVisible();
  });

  test('affiche les quatre réponses verticalement sans débordement mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockSupabase(page);
    await page.goto('/pages/proposer-question.html');
    const boxes = await page.locator('.proposal-correct-answer, .proposal-wrong-answer').evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, left: box.left, right: box.right };
    }));
    expect(boxes).toHaveLength(4);
    expect(boxes[1].top).toBeGreaterThan(boxes[0].top);
    expect(boxes[2].top).toBeGreaterThan(boxes[1].top);
    expect(boxes[3].top).toBeGreaterThan(boxes[2].top);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('affiche le formulaire de soumission et enregistre la proposition', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/pages/proposer-question.html');

    await expect(page.getByRole('heading', { name: 'À toi de jouer !' })).toBeVisible();
    await expect(page.locator('form[data-question-submission-form]')).toBeVisible();

    await page.locator('[name="categorySlug"]').selectOption('geographie');
    await page.locator('[name="question"]').fill('Quelle est la capitale du Congo-Brazzaville ?');
    await page.getByRole('button', { name: /utiliser plutôt une url/i }).click();
    await page.locator('[name="image"]').fill('https://example.com/brazzaville.jpg');
    await page.locator('[name="correctAnswer"]').fill('Brazzaville');
    await page.locator('[name="wrongAnswer1"]').fill('Pointe-Noire');
    await page.locator('[name="wrongAnswer2"]').fill('Kinshasa');
    await page.locator('[name="wrongAnswer3"]').fill('Poto-Poto');
    await page.locator('[name="publicationConsent"]').check();

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
    await expect(page.locator('[name="publicationConsent"]')).not.toBeChecked();
  });

  test('valide, prévisualise, téléverse et supprime une image', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/pages/proposer-question.html');

    const imageFile = page.locator('[name="imageFile"]');
    await imageFile.setInputFiles({ name: 'congo.webp', mimeType: 'image/webp', buffer: Buffer.from('image') });
    await expect(page.locator('[data-image-preview]')).toBeVisible();
    await expect(page.locator('[data-image-error]')).toBeEmpty();
    await page.locator('[data-image-remove]').click();
    await expect(page.locator('[data-image-preview]')).toBeHidden();

    await imageFile.setInputFiles({ name: 'congo.png', mimeType: 'image/png', buffer: Buffer.from('image') });
    await page.locator('[name="categorySlug"]').selectOption('geographie');
    await page.locator('[name="question"]').fill('Quelle est la capitale du Congo-Brazzaville ?');
    await page.locator('[name="correctAnswer"]').fill('Brazzaville');
    await page.locator('[name="wrongAnswer1"]').fill('Pointe-Noire');
    await page.locator('[name="wrongAnswer2"]').fill('Kinshasa');
    await page.locator('[name="wrongAnswer3"]').fill('Poto-Poto');
    await page.locator('[name="publicationConsent"]').check();
    await page.getByRole('button', { name: /soumettre/i }).click();

    await expect(page.locator('[data-submission-status]')).toHaveText(/soumise/i);
    const upload = await page.evaluate(() => window.__storageUpload);
    expect(upload.bucket).toBe('question-submissions');
    expect(upload.path).toMatch(/^user-123\/.*\.png$/);
    expect(upload.type).toBe('image/png');
  });

  test('refuse les formats non supportés et les fichiers de plus de 5 Mo', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/pages/proposer-question.html');
    const imageFile = page.locator('[name="imageFile"]');

    await imageFile.setInputFiles({ name: 'script.gif', mimeType: 'image/gif', buffer: Buffer.from('gif') });
    await expect(page.locator('[data-image-error]')).toHaveText(/JPEG, PNG ou WebP/i);
    await imageFile.setInputFiles({ name: 'large.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await expect(page.locator('[data-image-error]')).toHaveText(/5 Mo/i);
  });

  test('bascule vers une URL HTTPS et vide le fichier sélectionné', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/pages/proposer-question.html');
    await page.locator('[name="imageFile"]').setInputFiles({ name: 'congo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('image') });
    await page.getByRole('button', { name: /utiliser plutôt une url/i }).click();
    await expect(page.locator('[name="imageFile"]')).toHaveValue('');
    await page.locator('[name="image"]').fill('http://example.com/image.jpg');
    await expect(page.locator('[data-image-error]')).toHaveText(/HTTPS/i);
    await page.locator('[name="image"]').fill('https://example.com/image.jpg');
    await expect(page.locator('[data-image-error]')).toBeEmpty();
  });

  test('supprime le fichier téléversé si la création de la proposition échoue', async ({ page }) => {
    await mockSupabase(page, { insertFails: true });
    await page.goto('/pages/proposer-question.html');
    await page.locator('[name="imageFile"]').setInputFiles({ name: 'congo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('image') });
    await page.locator('[name="categorySlug"]').selectOption('geographie');
    await page.locator('[name="question"]').fill('Quelle est la capitale du Congo-Brazzaville ?');
    await page.locator('[name="correctAnswer"]').fill('Brazzaville');
    await page.locator('[name="wrongAnswer1"]').fill('Pointe-Noire');
    await page.locator('[name="wrongAnswer2"]').fill('Kinshasa');
    await page.locator('[name="wrongAnswer3"]').fill('Poto-Poto');
    await page.locator('[name="publicationConsent"]').check();
    await page.getByRole('button', { name: /soumettre/i }).click();

    await expect(page.locator('[data-submission-status]')).toHaveText(/insertion refusée/i);
    const removed = await page.evaluate(() => window.__storageRemove);
    expect(removed).toEqual([expect.stringMatching(/^user-123\/.*\.jpg$/)]);
  });

  test('bloque la soumission sans consentement et réinitialise la case après succès', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/pages/proposer-question.html');
    await page.locator('[name="categorySlug"]').selectOption('geographie');
    await page.locator('[name="question"]').fill('Quelle est la capitale du Congo-Brazzaville ?');
    await page.locator('[name="correctAnswer"]').fill('Brazzaville');
    await page.locator('[name="wrongAnswer1"]').fill('Pointe-Noire');
    await page.locator('[name="wrongAnswer2"]').fill('Kinshasa');
    await page.locator('[name="wrongAnswer3"]').fill('Poto-Poto');

    const submitButton = page.getByRole('button', { name: /soumettre/i });
    await expect(submitButton).toBeDisabled();
    expect(await page.evaluate(() => window.__questionSubmission)).toBeUndefined();

    await page.locator('[name="publicationConsent"]').check();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    await expect(page.locator('[data-submission-status]')).toHaveText(/question soumise/i);
    await expect(page.locator('[name="publicationConsent"]')).not.toBeChecked();
  });

  test('affiche uniquement les propositions du joueur connecté avec leur statut', async ({ page }) => {
    await page.route('https://signed.example/**', (route) => route.fulfill({
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    }));
    await mockSupabase(page, {
      existingSubmissions: [
        { id: 'sub-own-1', player_id: 'player-123', question: 'Question déjà approuvée', status: 'approved' },
        { id: 'sub-own-2', player_id: 'player-123', question: 'Question refusée', status: 'rejected', rejection_reason: 'Doublon', image: 'user-123/archive.webp' },
        { id: 'sub-other', player_id: 'player-999', question: 'Question d’un autre joueur', status: 'pending' },
      ],
    });
    await page.goto('/pages/proposer-question.html');

    const items = page.locator('[data-my-submissions-list] .proposal-history-item');
    await expect(items).toHaveCount(2);
    await expect(page.locator('[data-my-submissions-list]')).not.toContainText('Question d’un autre joueur');
    await expect(page.locator('[data-my-submissions-list]')).toContainText('Doublon');
    await expect(page.locator('.proposal-history-image')).toHaveAttribute('src', 'https://signed.example/user-123/archive.webp');
  });

  test('demande la connexion avant de proposer une question si aucun utilisateur n’est connecté', async ({ page }) => {
    await mockSupabase(page, { session: null });
    await page.goto('/pages/proposer-question.html');

    await expect(page.getByText(/connectez-vous pour proposer/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '../index.html');
  });
});
