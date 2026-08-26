// Tests PHASE 3 — Attribution des badges (règles métier réelles).
// Vérifie qu'un badge n'est obtenu que si sa condition est satisfaite par les
// données persistées, et que earned_at correspond à la première satisfaction.
// Usage: SUPABASE_DATABASEPASSWORD=... node scripts/test-phase3-badges.cjs
const postgres = require('postgres');
const { requireDevDbUrl } = require('./lib/devDbUrl.cjs');

const DB_URL = requireDevDbUrl();

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    failures += 1;
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function withPlayer(sql, fn) {
  const userId = crypto.randomUUID();
  const email = `p3-${Date.now()}-${Math.floor(Math.random() * 1e4)}@cbq.dev`;
  await sql`
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (${userId}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email},
            crypt('x', gen_salt('bf')), now(), '{}'::jsonb, now(), now())`;
  const [player] = await sql`
    INSERT INTO public.players (user_id, display_name) VALUES (${userId}, 'P3 Test') RETURNING id`;
  try {
    return await fn(userId, player);
  } finally {
    await sql`DELETE FROM public.players WHERE id = ${player.id}`;
    await sql`DELETE FROM auth.users WHERE id = ${userId}`;
  }
}

// Joue une partie via le RPC authentifié (badges rafraîchis dans la transaction).
async function playGame(sql, userId, { slug = 'geographie', name = 'Géographie', results }) {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    const resultsSql = 'ARRAY[' + results.map((b) => (b ? 'true' : 'false')).join(',') + ']::boolean[]';
    const score = results.filter(Boolean).length;
    const r = await tx.unsafe(
      `SELECT * FROM public.record_solo_game($1, $2, $3, ${resultsSql}, NULL)`,
      [slug, name, score],
    );
    return r[0];
  });
}

async function badgesOf(sql, playerId) {
  const rows = await sql`SELECT badge_id, earned_at FROM public.player_badges WHERE player_id = ${playerId}`;
  return new Map(rows.map((r) => [r.badge_id, r.earned_at]));
}

const streak = (n) => Array.from({ length: n }, () => true);

async function main() {
  const sql = postgres(DB_URL, { ssl: 'require', connect_timeout: 20 });

  console.log('\n=== TEST 1 : joueur sans aucune partie ===');
  await withPlayer(sql, async (userId, player) => {
    await sql`SELECT public.refresh_player_badges(${player.id})`;
    const badges = await badgesOf(sql, player.id);
    check('aucun badge lié au jeu', badges.size === 0, `reçu ${[...badges.keys()].join(', ')}`);
  });

  console.log('\n=== TEST 2 : 9 bonnes réponses consécutives ===');
  await withPlayer(sql, async (userId, player) => {
    await playGame(sql, userId, { results: [...streak(9), false] });
    const badges = await badgesOf(sql, player.id);
    check('badge serie-10 non attribué', !badges.has('serie-10'));
  });

  console.log('\n=== TEST 3 : 10 bonnes réponses consécutives ===');
  await withPlayer(sql, async (userId, player) => {
    const game = await playGame(sql, userId, { results: streak(10) });
    const badges = await badgesOf(sql, player.id);
    check('badge serie-10 attribué', badges.has('serie-10'));
    const [row] = await sql`SELECT played_at FROM public.solo_games WHERE id = ${game.game_id}`;
    check(
      'earned_at = date de la partie déclenchante',
      badges.get('serie-10')?.getTime() === row.played_at.getTime(),
      `${badges.get('serie-10')?.toISOString()} vs ${row.played_at.toISOString()}`,
    );
  });

  console.log('\n=== TEST 4 : série interrompue avant 10 (5 + faux + 5) ===');
  await withPlayer(sql, async (userId, player) => {
    await playGame(sql, userId, { results: [...streak(5), false, ...streak(5)] });
    const badges = await badgesOf(sql, player.id);
    check('badge serie-10 non attribué', !badges.has('serie-10'));
  });

  console.log('\n=== TEST 5 : Expert Brazzaville — 3 puis 4 parties à >= 90 % ===');
  await withPlayer(sql, async (userId, player) => {
    // 3 parties à 90 % (9/10) : la mauvaise réponse casse aussi la série.
    for (let i = 0; i < 3; i += 1) {
      await playGame(sql, userId, { results: [false, ...streak(9)] });
    }
    let badges = await badgesOf(sql, player.id);
    check('3 parties >= 90 % → badge éteint', !badges.has('expert-brazzaville'));
    check('aucune série de 10 (parties de 9)', !badges.has('serie-10'));

    const fourth = await playGame(sql, userId, { results: [false, ...streak(9)] });
    badges = await badgesOf(sql, player.id);
    check('4 parties >= 90 % → badge obtenu', badges.has('expert-brazzaville'));
    const [row] = await sql`SELECT played_at FROM public.solo_games WHERE id = ${fourth.game_id}`;
    check(
      'earned_at = date de la 4e partie qualifiante',
      badges.get('expert-brazzaville')?.getTime() === row.played_at.getTime(),
    );

    // Une 5e partie sous le seuil ne doit pas retirer le badge acquis.
    await playGame(sql, userId, { results: [false, ...streak(4), ...Array(5).fill(false)] });
    badges = await badgesOf(sql, player.id);
    check('badge conservé après une partie faible', badges.has('expert-brazzaville'));
  });

  console.log('\n=== TEST 6 : parties sous le seuil (8/10) ===');
  await withPlayer(sql, async (userId, player) => {
    for (let i = 0; i < 5; i += 1) {
      await playGame(sql, userId, { results: [false, false, ...streak(8)] });
    }
    const badges = await badgesOf(sql, player.id);
    check('5 parties à 80 % → Expert Brazzaville éteint', !badges.has('expert-brazzaville'));
  });

  console.log('\n=== TEST 7 : Contributeur ===');
  await withPlayer(sql, async (userId, player) => {
    let badges = await badgesOf(sql, player.id);
    check('sans contribution → badge éteint', !badges.has('contributeur'));

    const [submission] = await sql`
      INSERT INTO public.question_submissions (player_id, category_slug, question, options, answer)
      VALUES (${player.id}, 'histoire', 'Question test ?', ${sql.json(['a', 'b', 'c', 'd'])}, 'a')
      RETURNING id`;
    badges = await badgesOf(sql, player.id);
    check('proposition en attente → badge éteint', !badges.has('contributeur'));

    await sql`UPDATE public.question_submissions SET status = 'rejected', reviewed_at = now() WHERE id = ${submission.id}`;
    badges = await badgesOf(sql, player.id);
    check('proposition rejetée → badge éteint', !badges.has('contributeur'));

    const reviewedAt = new Date('2026-08-20T09:30:00Z');
    await sql`UPDATE public.question_submissions SET status = 'approved', reviewed_at = ${reviewedAt} WHERE id = ${submission.id}`;
    badges = await badgesOf(sql, player.id);
    check('proposition approuvée → badge obtenu', badges.has('contributeur'));
    check(
      'earned_at = date d’approbation',
      badges.get('contributeur')?.getTime() === reviewedAt.getTime(),
      `${badges.get('contributeur')?.toISOString()}`,
    );
  });

  console.log('\n=== TEST 8 : un badge non mérité inséré à tort est retiré ===');
  await withPlayer(sql, async (userId, player) => {
    await sql`INSERT INTO public.player_badges (player_id, badge_id) VALUES (${player.id}, 'serie-10')`;
    await sql`SELECT public.refresh_player_badges(${player.id})`;
    const badges = await badgesOf(sql, player.id);
    check('badge sans condition satisfaite supprimé', !badges.has('serie-10'));
  });

  await sql.end();
  console.log(`\n${failures === 0 ? '✅ TOUS LES TESTS PASSENT' : '❌ ' + failures + ' TEST(S) EN ÉCHEC'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('💥', e); process.exit(1); });
