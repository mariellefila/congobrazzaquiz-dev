import { test, expect } from '@playwright/test';

const player = {
  id: 'player-1',
  user_id: 'user-1',
  display_name: 'Michel Bakala',
  avatar_url: null,
  score: 1240,
  games_played: 18,
  current_streak: 7,
  best_streak: 12,
};

const soloGames = [
  { id: 'g1', category_slug: 'geographie', category_name: 'Géographie', score: 9, correct_answers: 9, total_questions: 10, xp_earned: 90, played_at: '2026-08-18T10:00:00Z' },
  { id: 'g2', category_slug: 'histoire', category_name: 'Histoire', score: 7, correct_answers: 7, total_questions: 10, xp_earned: 70, played_at: '2026-08-17T10:00:00Z' },
  { id: 'g3', category_slug: 'gastronomie', category_name: 'Gastronomie', score: 10, correct_answers: 10, total_questions: 10, xp_earned: 150, played_at: '2026-08-16T10:00:00Z' },
  { id: 'g4', category_slug: 'politique', category_name: 'Politique', score: 6, correct_answers: 6, total_questions: 10, xp_earned: 60, played_at: '2026-08-15T10:00:00Z' },
  { id: 'g5', category_slug: 'tourisme', category_name: 'Tourisme', score: 8, correct_answers: 8, total_questions: 10, xp_earned: 80, played_at: '2026-08-14T10:00:00Z' },
];

const playerBadges = [
  { badge_id: 'serie-10', earned_at: '2026-08-18T10:00:00Z', badges: { id: 'serie-10', name: 'Série de 10', condition_label: "10 bonnes réponses d'affilée", icon_url: null, sort_order: 1 } },
];

async function mockSupabase(page, { session = null } = {}) {
  await page.route('**/supabase-config.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.SUPABASE_URL = 'https://example.supabase.co'; window.SUPABASE_ANON_KEY = 'test-anon-key';`,
    });
  });

  const tables = { players: player, solo_games: soloGames, player_badges: playerBadges };

  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `const TABLES = ${JSON.stringify(tables)};
        let session = ${JSON.stringify(session)};
        export function createClient() {
          function table(name) {
            const result = () => Promise.resolve({ data: TABLES[name] ?? null, error: null });
            const builder = {
              upsert: () => builder,
              select: () => builder,
              eq: () => builder,
              order: () => builder,
              limit: result,
              maybeSingle: result,
              then: (onFulfilled, onRejected) => result().then(onFulfilled, onRejected),
            };
            return builder;
          }
          return {
            auth: {
              async getSession() { return { data: { session }, error: null }; },
              onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
              async signInWithOAuth({ provider, options }) {
                window.__oauthCall = { provider, redirectTo: options.redirectTo };
                return { data: { provider }, error: null };
              },
              async signOut() { session = null; window.__signedOut = true; return { error: null }; },
            },
            from: table,
            async rpc(name, params) {
              window.__rpcCalls = [...(window.__rpcCalls || []), { name, params }];
              if (name === 'get_player_rank') return { data: 12, error: null };
              return { data: [{ xp_earned: 90, current_streak: 7, best_streak: 12, total_points: 1240, player_rank: 12 }], error: null };
            },
          };
        }`,
    });
  });
}

test.describe('Profil joueur', () => {
  test('affiche SE CONNECTER tant que le joueur n’est pas connecté', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/index.html');

    const trigger = page.locator('[data-auth-trigger]');
    await expect(trigger).toHaveText('Se connecter');
    await expect(trigger).toHaveAttribute('data-auth-state', 'signed-out');

    await trigger.click();
    await expect(page.locator('[data-login-modal]')).toBeVisible();
    await expect(page.locator('[data-profile-modal]')).toBeHidden();
  });

  test('remplace SE CONNECTER par le pseudo et ouvre le profil au clic', async ({ page }) => {
    await mockSupabase(page, { session: { user: { id: 'user-1', user_metadata: { full_name: 'Michel Bakala' } } } });
    await page.goto('/index.html');

    const trigger = page.locator('[data-auth-trigger]');
    await expect(trigger).toHaveAttribute('data-auth-state', 'signed-in');
    await expect(page.locator('[data-auth-label]')).toHaveText('MICHEL.B');

    await trigger.click();

    await expect(page.locator('[data-profile-modal]')).toBeVisible();
    await expect(page.locator('#heroVideo')).toBeVisible();
    await expect(page.locator('[data-profile-name]')).toHaveText('Michel Bakala');
    await expect(page.locator('[data-profile-points]')).toHaveText('1240');
    await expect(page.locator('[data-profile-rank]')).toHaveText('#12');
    await expect(page.locator('[data-profile-streak]')).toHaveText('7');

    await expect(page.locator('.profile-game')).toHaveCount(5);
    const firstGame = page.locator('.profile-game').first();
    await expect(firstGame.locator('.profile-game-category')).toHaveText('Géographie');
    await expect(firstGame.locator('.profile-game-xp')).toHaveText('+90 XP');
    await expect(firstGame.locator('.profile-game-date')).toHaveText('18/08/2026');

    await expect(page.locator('.profile-badge')).toHaveCount(3);
    await expect(page.locator('.profile-badge-name').first()).toHaveText('Série de 10');
    await expect(page.locator('.profile-badge-condition').first()).toHaveText("10 bonnes réponses d'affilée");
    await expect(page.locator('.profile-badge').first()).toHaveClass(/is-earned/);
    await expect(page.locator('.profile-badge').first().locator('.profile-badge-icon')).toHaveCSS('opacity', '1');
    await expect(page.locator('.profile-badge').first().locator('.profile-badge-date')).toHaveText('Obtenu le 18/08/2026');
    await expect(page.locator('.profile-badge').nth(1)).toHaveClass(/is-locked/);
    await expect(page.locator('.profile-badge').nth(1).locator('.profile-badge-icon')).toHaveCSS('opacity', '0.07');
    await expect(page.locator('.profile-badge').nth(1).locator('.profile-badge-date')).toHaveCount(0);
    await expect(page.locator('.profile-badge').nth(1).locator('.profile-badge-condition')).toHaveCSS('opacity', '1');
  });

  test('relance une partie dans la catégorie de la partie choisie', async ({ page }) => {
    await mockSupabase(page, { session: { user: { id: 'user-1', user_metadata: { full_name: 'Michel Bakala' } } } });
    await page.goto('/index.html');

    await page.locator('[data-auth-trigger]').click();
    await page.locator('.profile-game').first().getByRole('button', { name: 'Rejouer' }).click();

    await expect(page.locator('[data-profile-modal]')).toBeHidden();
    await expect(page.locator('[data-category-overlay]')).toBeVisible();
    await expect(page.locator('[data-quiz-stage]')).toBeVisible();
    await expect(page.locator('#soloQuizTitle')).toHaveText('Quiz : Géographie');
    await expect(page.locator('.quiz-option-btn')).toHaveCount(4);
  });

  test('déconnecte le joueur et revient à la landing non connectée', async ({ page }) => {
    await mockSupabase(page, { session: { user: { id: 'user-1', user_metadata: { full_name: 'Michel Bakala' } } } });
    await page.goto('/index.html');

    await page.locator('[data-auth-trigger]').click();
    await page.getByRole('button', { name: 'Se déconnecter' }).click();

    await expect(page.locator('[data-profile-modal]')).toBeHidden();
    await expect(page.locator('[data-auth-trigger]')).toHaveAttribute('data-auth-state', 'signed-out');
    await expect(page.locator('[data-auth-label]')).toHaveText('Se connecter');
    await expect(page.locator('#heroVideo')).toBeVisible();
    await expect(page).toHaveURL(/\/index\.html$/);
  });

  test('enregistre la partie solo terminée pour alimenter le profil', async ({ page }) => {
    await mockSupabase(page, { session: { user: { id: 'user-1', user_metadata: { full_name: 'Michel Bakala' } } } });
    await page.goto('/index.html');

    await page.getByRole('link', { name: 'Jouer' }).click();
    await page.locator('[data-mode-slug="solo"]').click();
    await page.locator('[data-category-slug="geographie"]').click();

    for (let i = 0; i < 10; i += 1) {
      await page.locator('.quiz-option-btn').first().click();
      await page.waitForTimeout(1600);
    }

    await expect(page.locator('.solo-result-title')).toBeVisible();
    const call = await page.evaluate(() => (window.__rpcCalls || []).find((entry) => entry.name === 'record_solo_game'));
    expect(call?.params?.p_category_slug).toBe('geographie');
    expect(call?.params?.p_results).toHaveLength(10);
  });

  test('transmet le détail ordonné des réponses (p_answers) au RPC', async ({ page }) => {
    await mockSupabase(page, { session: { user: { id: 'user-1', user_metadata: { full_name: 'Michel Bakala' } } } });
    await page.goto('/index.html');

    await page.getByRole('link', { name: 'Jouer' }).click();
    await page.locator('[data-mode-slug="solo"]').click();
    await page.locator('[data-category-slug="geographie"]').click();

    const selectedOptions = [];
    for (let i = 0; i < 10; i += 1) {
      const option = page.locator('.quiz-option-btn').first();
      selectedOptions.push(await option.getAttribute('data-option'));
      await option.click();
      await page.waitForTimeout(1600);
    }

    await expect(page.locator('.solo-result-title')).toBeVisible();
    const call = await page.evaluate(() => (window.__rpcCalls || []).find((entry) => entry.name === 'record_solo_game'));
    const answers = call?.params?.p_answers;

    expect(answers).toHaveLength(10);
    answers.forEach((answer, index) => {
      expect(answer.question_order).toBe(index + 1);
      expect(typeof answer.question_id).toBe('string');
      expect(answer.question_id.length).toBeGreaterThan(0);
      expect(answer.selected_option).toBe(selectedOptions[index]);
      expect(typeof answer.is_correct).toBe('boolean');
      expect(typeof answer.elapsed_seconds).toBe('number');
      expect(answer.elapsed_seconds).toBeGreaterThanOrEqual(0);
      expect(answer.elapsed_seconds).toBeLessThanOrEqual(20);
    });

    // p_results reste l'agrégat dérivé du même détail : les deux doivent concorder.
    expect(call.params.p_results).toEqual(answers.map((answer) => answer.is_correct));
    expect(call.params.p_score).toBe(answers.filter((answer) => answer.is_correct).length);
  });

  test('transmet une réponse expirée avec son temps écoulé', async ({ page }) => {
    // La première question expire réellement (timer de 20 s) : d'où le budget étendu.
    test.setTimeout(120_000);
    await mockSupabase(page, { session: { user: { id: 'user-1', user_metadata: { full_name: 'Michel Bakala' } } } });
    await page.goto('/index.html');

    await page.getByRole('link', { name: 'Jouer' }).click();
    await page.locator('[data-mode-slug="solo"]').click();
    await page.locator('[data-category-slug="geographie"]').click();

    // Laisse le timer arriver à zéro sans cliquer, puis attend la transition.
    await expect(page.locator('.quiz-option-btn').first()).toBeDisabled({ timeout: 30_000 });
    await page.waitForTimeout(1600);

    for (let i = 1; i < 10; i += 1) {
      await page.locator('.quiz-option-btn').first().click();
      await page.waitForTimeout(1600);
    }

    await expect(page.locator('.solo-result-title')).toBeVisible();
    const call = await page.evaluate(() => (window.__rpcCalls || []).find((entry) => entry.name === 'record_solo_game'));
    const answers = call?.params?.p_answers;

    expect(answers).toHaveLength(10);
    const timedOut = answers[0];
    expect(timedOut.question_order).toBe(1);
    expect(timedOut.selected_option).toBeNull();
    expect(timedOut.is_correct).toBe(false);
    expect(typeof timedOut.elapsed_seconds).toBe('number');
    expect(timedOut.elapsed_seconds).toBeGreaterThanOrEqual(19);
    expect(timedOut.elapsed_seconds).toBeLessThanOrEqual(20);
    expect(call.params.p_results[0]).toBe(false);
  });
});
