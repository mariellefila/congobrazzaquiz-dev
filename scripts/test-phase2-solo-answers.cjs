// Tests PHASE 2 — Historique détaillé des parties solo (solo_game_answers).
// Exécutés contre le projet Supabase DEV via SQL authentifié.
// Usage: SUPABASE_DATABASEPASSWORD=... node scripts/test-phase2-solo-answers.cjs
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

async function withAuthUser(sql, fn) {
  const userId = crypto.randomUUID();
  const email = `p2-${Date.now()}-${Math.floor(Math.random() * 1e4)}@cbq.dev`;
  await sql`
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (${userId}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email},
            crypt('x', gen_salt('bf')), now(), '{}'::jsonb, now(), now())`;
  const [player] = await sql`
    INSERT INTO public.players (user_id, display_name) VALUES (${userId}, 'P2 Test') RETURNING id, score, games_played`;
  return fn(userId, player);
}

// Appelle record_solo_game avec le contexte auth.uid() posé (équivaut à un appel authentifié).
async function callRpc(tx, userId, { slug, name, score, results, answers }) {
  await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
  // p_results en littéral boolean[] ; p_answers via tx.json() pour un vrai JSONB (NULL SQL si absent)
  const resultsSql = 'ARRAY[' + results.map((b) => (b ? 'true' : 'false')).join(',') + ']::boolean[]';
  const r = answers == null
    ? await tx.unsafe(`SELECT * FROM public.record_solo_game($1, $2, $3, ${resultsSql}, NULL)`, [slug, name, score])
    : await tx.unsafe(`SELECT * FROM public.record_solo_game($1, $2, $3, ${resultsSql}, $4)`, [slug, name, score, tx.json(answers)]);
  return r[0];
}

async function main() {
  const sql = postgres(DB_URL, { ssl: 'require', connect_timeout: 20 });

  // ----------------------------------------------------------------------
  console.log('\n=== TEST 1 : partie de 10 questions avec détail des réponses ===');
  await withAuthUser(sql, async (userId, player) => {
    const questionIds = Array.from({ length: 10 }, (_, i) => `geographie-q${i + 1}`);
    // 8 bonnes réponses (index 3 et 6 faux), temps variés
    const answers = questionIds.map((qid, i) => ({
      question_id: qid,
      question_order: i + 1,
      selected_option: i === 3 || i === 6 ? 'Mauvaise' : `Bonne ${i}`,
      is_correct: !(i === 3 || i === 6),
      elapsed_seconds: 4.5 + i,
    }));
    const results = answers.map((a) => a.is_correct);

    const before = await sql`SELECT score, games_played FROM public.players WHERE id=${player.id}`;
    const res = await sql.begin((tx) => callRpc(tx, userId, {
      slug: 'geographie', name: 'Géographie', score: 8, results, answers,
    }));
    console.log('  RPC retour:', JSON.stringify(res));

    check('game_id retourné', Boolean(res.game_id));
    check('xp_earned = 80 (8 bonnes x10)', res.xp_earned === 80, `reçu ${res.xp_earned}`);

    const games = await sql`SELECT * FROM public.solo_games WHERE id=${res.game_id}`;
    check('1 ligne dans solo_games', games.length === 1);
    check('solo_games.score = 8 (inchangé)', games[0]?.score === 8);
    check('solo_games.correct_answers = 8', games[0]?.correct_answers === 8);
    check('solo_games.total_questions = 10', games[0]?.total_questions === 10);
    check('solo_games.xp_earned = 80 (inchangé)', games[0]?.xp_earned === 80);

    const rows = await sql`SELECT * FROM public.solo_game_answers WHERE solo_game_id=${res.game_id} ORDER BY question_order`;
    check('10 lignes dans solo_game_answers', rows.length === 10, `reçu ${rows.length}`);
    check('ordre 1..10', rows.every((r, i) => r.question_order === i + 1));
    check('question_id correct', rows.every((r, i) => r.question_id === questionIds[i]));
    check('selected_option correct', rows.every((r, i) => r.selected_option === answers[i].selected_option));
    check('is_correct correct', rows.every((r, i) => r.is_correct === answers[i].is_correct));
    check('elapsed_seconds renseigné', rows.every((r) => r.elapsed_seconds !== null && Number(r.elapsed_seconds) > 0));
    check('solo_game_id = game_id', rows.every((r) => r.solo_game_id === res.game_id));

    const after = await sql`SELECT score, games_played FROM public.players WHERE id=${player.id}`;
    check('players.score incrémenté de +80', after[0].score - before[0].score === 80, `${before[0].score} -> ${after[0].score}`);
    check('games_played incrémenté de +1', after[0].games_played - before[0].games_played === 1);

    // nettoyage
    await sql`DELETE FROM public.solo_games WHERE id=${res.game_id}`;
    await sql`DELETE FROM public.players WHERE id=${player.id}`;
    await sql`DELETE FROM auth.users WHERE id=${userId}`;
  });

  // ----------------------------------------------------------------------
  console.log('\n=== TEST 2 : rollback transactionnel si une réponse échoue ===');
  await withAuthUser(sql, async (userId, player) => {
    const before = await sql`SELECT score, games_played FROM public.players WHERE id=${player.id}`;
    // 10 réponses mais la 5e a un question_order invalide (hors range int) -> INSERT échoue
    const answers = Array.from({ length: 10 }, (_, i) => ({
      question_id: `geographie-q${i + 1}`,
      // question_order manquant ET on force une valeur invalide via un champ inattendu
      selected_option: 'X',
      is_correct: true,
      elapsed_seconds: 5,
      // injecter une valeur non numérique dans question_order pour provoquer l'échec
      ...(i === 4 ? { question_order: 'not-a-number' } : {}),
    }));
    const results = answers.map(() => true);

    let threw = false;
    await sql.begin(async (tx) => {
      await callRpc(tx, userId, { slug: 'geographie', name: 'Géographie', score: 10, results, answers });
    }).catch(() => { threw = true; });
    check('le RPC échoue sur réponse invalide', threw);

    const games = await sql`SELECT count(*)::int AS n FROM public.solo_games WHERE player_id=${player.id}`;
    check('aucune solo_game conservée (rollback)', games[0].n === 0, `n=${games[0].n}`);
    const after = await sql`SELECT score, games_played FROM public.players WHERE id=${player.id}`;
    check('aucun XP ajouté (score inchangé)', after[0].score === before[0].score, `${before[0].score} -> ${after[0].score}`);
    check('games_played non incrémenté', after[0].games_played === before[0].games_played);

    await sql`DELETE FROM public.players WHERE id=${player.id}`;
    await sql`DELETE FROM auth.users WHERE id=${userId}`;
  });

  // ----------------------------------------------------------------------
  console.log('\n=== TEST 3 : compatibilité — appel SANS p_answers (ancien contrat) ===');
  await withAuthUser(sql, async (userId, player) => {
    const res = await sql.begin(async (tx) => {
      await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
      const r = await tx`
        SELECT * FROM public.record_solo_game('histoire', 'Histoire', 6,
          ARRAY[true,true,false,true,true,false,true,false,true,false]::boolean[], NULL)`;
      return r[0];
    });
    check('partie enregistrée sans détail', Boolean(res.game_id));
    check('xp calculé (6 bonnes x10 = 60)', res.xp_earned === 60, `reçu ${res.xp_earned}`);
    const rows = await sql`SELECT count(*)::int AS n FROM public.solo_game_answers WHERE solo_game_id=${res.game_id}`;
    check('aucune ligne solo_game_answers (p_answers NULL)', rows[0].n === 0);
    await sql`DELETE FROM public.solo_games WHERE id=${res.game_id}`;
    await sql`DELETE FROM public.players WHERE id=${player.id}`;
    await sql`DELETE FROM auth.users WHERE id=${userId}`;
  });

  // ----------------------------------------------------------------------
  console.log('\n=== TEST 4 : RLS — un joueur ne lit que ses propres réponses ===');
  const [u1, u2] = [crypto.randomUUID(), crypto.randomUUID()];
  for (const [uid, name] of [[u1, 'P2 A'], [u2, 'P2 B']]) {
    await sql`INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
      VALUES (${uid}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${uid + '@cbq.dev'},
              crypt('x', gen_salt('bf')), now(), '{}'::jsonb, now(), now())`;
    await sql`INSERT INTO public.players (user_id, display_name) VALUES (${uid}, ${name})`;
  }
  const [p1] = await sql`SELECT id FROM public.players WHERE user_id=${u1}`;
  // partie de A avec réponses
  const resA = await sql.begin((tx) => callRpc(tx, u1, {
    slug: 'geographie', name: 'Géographie', score: 2,
    results: [true, true],
    answers: [
      { question_id: 'geographie-q1', selected_option: 'a', is_correct: true, elapsed_seconds: 3 },
      { question_id: 'geographie-q2', selected_option: 'b', is_correct: true, elapsed_seconds: 4 },
    ],
  }));
  // B tente de lire les réponses de A (contexte auth = u2)
  const readByB = await sql.begin(async (tx) => {
    await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: u2, role: 'authenticated' })}, true)`;
    await tx`SET LOCAL ROLE authenticated`;
    const r = await tx`SELECT count(*)::int AS n FROM public.solo_game_answers WHERE solo_game_id=${resA.game_id}`;
    return r[0].n;
  }).catch(() => -1);
  check('B ne voit pas les réponses de A (RLS)', readByB === 0, `B a lu ${readByB} ligne(s)`);
  await sql`DELETE FROM public.solo_games WHERE id=${resA.game_id}`;
  await sql`DELETE FROM public.players WHERE user_id IN (${u1}, ${u2})`;
  await sql`DELETE FROM auth.users WHERE id IN (${u1}, ${u2})`;

  await sql.end();
  console.log(`\n${failures === 0 ? '✅ TOUS LES TESTS PASSENT' : '❌ ' + failures + ' TEST(S) EN ÉCHEC'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('💥', e); process.exit(1); });
