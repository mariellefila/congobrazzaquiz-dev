import { test, expect } from '@playwright/test';

test.describe('Modération des propositions de questions (back-office)', () => {
  async function mockSupabase(page, { submissions = [], categories = [{ id: 'cat-1', name: 'Géographie', slug: 'geographie' }] } = {}) {
    await page.route('**/supabase-config.js', async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `window.SUPABASE_URL = 'https://example.supabase.co'; window.SUPABASE_ANON_KEY = 'test-anon-key';`,
      });
    });

    await page.route('**/supabase-js/+esm', async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `
        window.__submissions = ${JSON.stringify(submissions)};
        window.__questions = [];
        window.__categories = ${JSON.stringify(categories)};
        window.__adminUsers = [{ user_id: 'admin-1', role: 'admin', active: true }];
        window.__rpcCalls = [];

        function makeBuilder(rows, { isCount = false } = {}) {
          let filtered = rows.slice();
          const builder = {
            eq(column, value) { filtered = filtered.filter((row) => row[column] === value); return builder; },
            order() { return builder; },
            limit(n) { filtered = filtered.slice(0, n); return builder; },
            single() { return Promise.resolve({ data: filtered[0] || null, error: null }); },
            maybeSingle() { return Promise.resolve({ data: filtered[0] || null, error: null }); },
            then(resolve, reject) {
              const payload = isCount ? { count: filtered.length, error: null } : { data: filtered, error: null };
              return Promise.resolve(payload).then(resolve, reject);
            },
          };
          return builder;
        }

        function rowsFor(table) {
          if (table === 'admin_users') return window.__adminUsers;
          if (table === 'categories') return window.__categories;
          if (table === 'question_submissions') return window.__submissions;
          if (table === 'questions') return window.__questions;
          return [];
        }

        export function createClient() {
          return {
            auth: {
              async getSession() { return { data: { session: { user: { id: 'admin-1' } } }, error: null }; },
            },
            storage: {
              from() {
                return { async createSignedUrl(path) { return { data: { signedUrl: 'https://signed.example/' + path }, error: null }; } };
              },
            },
            from(table) {
              return {
                select(fields, opts) {
                  return makeBuilder(rowsFor(table), { isCount: Boolean(opts && opts.count) });
                },
              };
            },
            async rpc(name, params) {
              window.__rpcCalls.push({ name, params });
              const submission = window.__submissions.find((s) => s.id === params.p_submission_id);
              if (!submission) {
                return { data: null, error: { message: 'Proposition introuvable', code: 'P0002' } };
              }
              if (submission.status !== 'pending') {
                return { data: null, error: { message: 'Cette proposition a déjà été traitée', code: 'P0001' } };
              }
              const reviewedAt = new Date().toISOString();
              if (name === 'approve_question_submission') {
                const publishedQuestionId = 'submission-' + submission.id;
                submission.status = 'approved';
                submission.reviewed_at = reviewedAt;
                submission.published_question_id = publishedQuestionId;
                window.__questions.push({ id: publishedQuestionId, category_id: 'cat-1', question: submission.question, options: submission.options, answer: submission.answer, image: null, created_at: reviewedAt, updated_at: reviewedAt, categories: { name: 'Géographie' } });
                return { data: [{ submission_id: submission.id, published_question_id: publishedQuestionId, reviewed_at: reviewedAt }], error: null };
              }
              if (name === 'reject_question_submission') {
                submission.status = 'rejected';
                submission.reviewed_at = reviewedAt;
                submission.rejection_reason = params.p_rejection_reason || null;
                return { data: [{ submission_id: submission.id, reviewed_at: reviewedAt }], error: null };
              }
              return { data: null, error: { message: 'RPC inconnue' } };
            },
          };
        }`,
      });
    });
  }

  test('approuve une proposition en attente et publie exactement une question', async ({ page }) => {
    await page.route('https://signed.example/**', (route) => route.fulfill({
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    }));
    await mockSupabase(page, {
      submissions: [
        { id: 'sub-1', player_id: 'player-1', category_slug: 'geographie', question: 'Quelle est la capitale ?', options: ['Brazzaville', 'A', 'B', 'C'], answer: 'Brazzaville', image: 'user-1/submission.png', status: 'pending', created_at: new Date().toISOString(), players: { display_name: 'Joueur Un' } },
      ],
    });

    await page.goto('/pages/admin/questions.html');
    await page.getByRole('button', { name: /Examiner/ }).click();

    const approveButton = page.locator('[data-approve-question]');
    await expect(approveButton).toBeEnabled();

    await approveButton.click();
    await expect(page.locator('[data-questions-status]')).toHaveText(/approuvée et publiée/i);

    const rpcCalls = await page.evaluate(() => window.__rpcCalls.filter((c) => c.name === 'approve_question_submission'));
    expect(rpcCalls).toHaveLength(1);
    const questions = await page.evaluate(() => window.__questions);
    expect(questions).toHaveLength(1);

    await expect(page.locator('[data-approve-question]')).toBeDisabled();
    await expect(page.locator('[data-reject-question]')).toBeDisabled();
    await expect(page.locator('.bo-question-detail-image')).toHaveAttribute('src', 'https://signed.example/user-1/submission.png');
  });

  test('refuse une proposition en attente et enregistre le motif', async ({ page }) => {
    await mockSupabase(page, {
      submissions: [
        { id: 'sub-2', player_id: 'player-2', category_slug: 'geographie', question: 'Question à refuser ?', options: ['A', 'B', 'C', 'D'], answer: 'A', status: 'pending', created_at: new Date().toISOString() },
      ],
    });

    await page.goto('/pages/admin/questions.html');
    await page.getByRole('button', { name: /Examiner/ }).click();

    await page.locator('[data-reject-question]').click();
    await expect(page.locator('[data-questions-status]')).toHaveText(/question refusée/i);

    const submissions = await page.evaluate(() => window.__submissions);
    expect(submissions[0].status).toBe('rejected');
    expect(submissions[0].rejection_reason).toBeTruthy();
    await expect(page.locator('[data-approve-question]')).toBeDisabled();
  });

  test('empêche une double approbation de la même proposition', async ({ page }) => {
    await mockSupabase(page, {
      submissions: [
        { id: 'sub-3', player_id: 'player-3', category_slug: 'geographie', question: 'Déjà approuvée ?', options: ['A', 'B', 'C', 'D'], answer: 'A', status: 'approved', created_at: new Date().toISOString(), published_question_id: 'submission-sub-3' },
      ],
    });

    await page.goto('/pages/admin/questions.html');
    await page.getByRole('button', { name: /Examiner/ }).click();

    // Une proposition déjà traitée ne doit plus exposer d'action de modération.
    await expect(page.locator('[data-approve-question]')).toBeDisabled();
    await expect(page.locator('[data-reject-question]')).toBeDisabled();

    const rpcCalls = await page.evaluate(() => window.__rpcCalls);
    expect(rpcCalls).toHaveLength(0);
  });
});
