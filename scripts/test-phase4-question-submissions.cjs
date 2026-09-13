// Tests PHASE 4 — Soumission et modération des questions.
// Usage: SUPABASE_DATABASEPASSWORD=... node scripts/test-phase4-question-submissions.cjs
const postgres = require('postgres');
const { requireDevDbUrl } = require('./lib/devDbUrl.cjs');

const DB_URL = requireDevDbUrl();
let failures = 0;

function check(label, condition, detail) {
  if (condition) console.log(`  ✅ ${label}`);
  else {
    failures += 1;
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function createUser(sql, prefix, displayName) {
  const userId = crypto.randomUUID();
  await sql`
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    VALUES (${userId}, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', ${`${prefix}-${Date.now()}@cbq.dev`}, crypt('x', gen_salt('bf')),
      now(), '{}'::jsonb, now(), now())`;
  const [player] = await sql`
    INSERT INTO public.players (user_id, display_name)
    VALUES (${userId}, ${displayName}) RETURNING id`;
  return { userId, playerId: player.id };
}

async function asAuthenticated(sql, userId, callback) {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    await tx`SET LOCAL ROLE authenticated`;
    return callback(tx);
  });
}

async function main() {
  const sql = postgres(DB_URL, { ssl: 'require', connect_timeout: 20 });
  const playerA = await createUser(sql, 'p4-a', 'P4 Joueur A');
  const playerB = await createUser(sql, 'p4-b', 'P4 Joueur B');
  const admin = await createUser(sql, 'p4-admin', 'P4 Admin');
  const submissionIds = [];
  const publishedIds = [];

  try {
    await sql`
      INSERT INTO public.admin_users (user_id, role, active)
      VALUES (${admin.userId}, 'admin', true)
      ON CONFLICT (user_id) DO UPDATE SET role = 'admin', active = true`;

    console.log('\n=== TEST 0 : sécurité des fonctions de modération ===');
    const [bucket] = await sql`
      SELECT public, file_size_limit, allowed_mime_types
      FROM storage.buckets WHERE id = 'question-submissions'`;
    check('bucket Storage privé configuré', bucket?.public === false);
    check('bucket limité à 5 Mo', Number(bucket?.file_size_limit) === 5242880);
    check('bucket accepte JPEG PNG WebP', JSON.stringify(bucket?.allowed_mime_types?.sort()) === JSON.stringify(['image/jpeg', 'image/png', 'image/webp']));
    const storagePolicies = await sql`
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname LIKE 'question_submission_images_owner_%'`;
    check('policy Storage INSERT vérifie le premier dossier auth.uid', storagePolicies.some((policy) => policy.cmd === 'INSERT' && policy.with_check?.includes('storage.foldername')));
    check('policy Storage SELECT autorise owner/admin', storagePolicies.some((policy) => policy.cmd === 'SELECT' && policy.qual?.includes('is_admin')));
    check('policy Storage DELETE vérifie le premier dossier auth.uid', storagePolicies.some((policy) => policy.cmd === 'DELETE' && policy.qual?.includes('storage.foldername')));
    const securityRows = await sql`
      SELECT p.proname, p.prosecdef,
        COALESCE(array_to_string(p.proconfig, ','), '') AS config,
        bool_or(x.grantee = 0 AND x.privilege_type = 'EXECUTE') AS public_execute,
        bool_or(r.rolname = 'anon' AND x.privilege_type = 'EXECUTE') AS anon_execute,
        bool_or(r.rolname = 'authenticated' AND x.privilege_type = 'EXECUTE') AS authenticated_execute
      FROM pg_proc p
      CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) x
      LEFT JOIN pg_roles r ON r.oid = x.grantee
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('approve_question_submission', 'reject_question_submission')
      GROUP BY p.oid, p.proname, p.prosecdef, p.proconfig`;
    for (const row of securityRows) {
      check(`${row.proname} est SECURITY DEFINER`, row.prosecdef === true);
      check(`${row.proname} impose search_path=public`, row.config.includes('search_path=public'));
      check(`${row.proname} refuse EXECUTE à PUBLIC`, row.public_execute !== true);
      check(`${row.proname} refuse EXECUTE à anon`, row.anon_execute !== true);
      check(`${row.proname} autorise EXECUTE à authenticated`, row.authenticated_execute === true);
    }

    console.log('\n=== TEST 1 : soumission joueur et RLS de lecture ===');
    const ownSubmission = await asAuthenticated(sql, playerA.userId, async (tx) => {
      const rows = await tx`
          INSERT INTO public.question_submissions
          (player_id, category_slug, question, options, answer, image)
        VALUES
          (${playerA.playerId}, 'gographie', 'Quelle est la capitale du Congo ?',
            ${tx.json(['Brazzaville', 'Pointe-Noire', 'Kinshasa', 'Dolisie'])}, 'Brazzaville', 'https://example.com/brazzaville.jpg')
        RETURNING id, status`;
      return rows[0];
    });
    submissionIds.push(ownSubmission.id);
    check('soumission créée en pending', ownSubmission.status === 'pending');

    const visibleToOwner = await asAuthenticated(sql, playerA.userId, (tx) => tx`
      SELECT count(*)::int AS n FROM public.question_submissions WHERE id = ${ownSubmission.id}`);
    check('le joueur voit sa propre proposition', visibleToOwner[0].n === 1);

    const visibleToOther = await asAuthenticated(sql, playerB.userId, (tx) => tx`
      SELECT count(*)::int AS n FROM public.question_submissions WHERE id = ${ownSubmission.id}`);
    check('un autre joueur ne voit pas la proposition', visibleToOther[0].n === 0);

    console.log('\n=== TEST 2 : un joueur non administrateur ne peut pas modérer ===');
    let nonAdminApproveRejected = false;
    await asAuthenticated(sql, playerA.userId, (tx) => tx`
      SELECT * FROM public.approve_question_submission(${ownSubmission.id})`).catch(() => { nonAdminApproveRejected = true; });
    check('approbation RPC refusée pour un non-admin', nonAdminApproveRejected);
    let nonAdminRejectRejected = false;
    await asAuthenticated(sql, playerA.userId, (tx) => tx`
      SELECT * FROM public.reject_question_submission(${ownSubmission.id}, 'Tentative joueur')`).catch(() => { nonAdminRejectRejected = true; });
    check('refus RPC refusé pour un non-admin', nonAdminRejectRejected);

    console.log('\n=== TEST 3 : le joueur ne peut pas modifier le statut ni les métadonnées ===');
    let playerUpdateRejected = false;
    await asAuthenticated(sql, playerA.userId, (tx) => tx`
      UPDATE public.question_submissions
      SET status = 'approved', reviewed_at = now(), reviewed_by = ${admin.userId}
      WHERE id = ${ownSubmission.id}`).catch(() => { playerUpdateRejected = true; });
    check('UPDATE joueur refusé par RLS', playerUpdateRejected);
    const unchanged = await sql`
      SELECT status, reviewed_at, reviewed_by
      FROM public.question_submissions WHERE id = ${ownSubmission.id}`;
    check('statut et métadonnées restent inchangés', unchanged[0].status === 'pending'
      && unchanged[0].reviewed_at === null && unchanged[0].reviewed_by === null);

    console.log('\n=== TEST 4 : approbation atomique et publication unique ===');
    const approved = await asAuthenticated(sql, admin.userId, (tx) => tx`
      SELECT * FROM public.approve_question_submission(${ownSubmission.id})`);
    const approval = approved[0];
    publishedIds.push(approval.published_question_id);
    check('RPC d’approbation retourne la proposition', approval.submission_id === ownSubmission.id);
    check('published_question_id retourné', Boolean(approval.published_question_id));
    check('reviewed_at retourné', approval.reviewed_at instanceof Date || Boolean(approval.reviewed_at));

    const published = await sql`
      SELECT id, category_id, question, options, answer, image
      FROM public.questions WHERE id = ${approval.published_question_id}`;
    check('exactement une question publiée', published.length === 1);
    check('question publiée avec ses réponses', published[0]?.question === 'Quelle est la capitale du Congo ?'
      && published[0]?.answer === 'Brazzaville'
      && published[0]?.image === 'https://example.com/brazzaville.jpg'
      && published[0]?.options?.length === 4);
    check('image facultative propagée à la publication', published[0]?.image === 'https://example.com/brazzaville.jpg');

    const reviewed = await sql`
      SELECT status, reviewed_at, reviewed_by, published_question_id, rejection_reason
      FROM public.question_submissions WHERE id = ${ownSubmission.id}`;
    check('proposition marquée approuvée', reviewed[0].status === 'approved');
    check('reviewed_by est l’administrateur', reviewed[0].reviewed_by === admin.userId);
    check('publication liée à la proposition', reviewed[0].published_question_id === approval.published_question_id);
    check('motif de refus nul après approbation', reviewed[0].rejection_reason === null);

    let doubleApprovalRejected = false;
    await asAuthenticated(sql, admin.userId, (tx) => tx`
      SELECT * FROM public.approve_question_submission(${ownSubmission.id})`).catch(() => { doubleApprovalRejected = true; });
    check('double approbation refusée', doubleApprovalRejected);
    const publishedCount = await sql`
      SELECT count(*)::int AS n FROM public.questions WHERE id = ${approval.published_question_id}`;
    check('aucune seconde publication', publishedCount[0].n === 1);

    console.log('\n=== TEST 5 : refus et double refus ===');
    const rejectedSubmission = await asAuthenticated(sql, playerB.userId, async (tx) => {
      const rows = await tx`
          INSERT INTO public.question_submissions
          (player_id, category_slug, question, options, answer)
        VALUES
          (${playerB.playerId}, 'gographie', 'Question destinée au refus ?',
            ${tx.json(['A', 'B', 'C', 'D'])}, 'A')
        RETURNING id`;
      return rows[0];
    });
    submissionIds.push(rejectedSubmission.id);

    const rejected = await asAuthenticated(sql, admin.userId, (tx) => tx`
      SELECT * FROM public.reject_question_submission(${rejectedSubmission.id}, 'Doublon de contenu')`);
    check('RPC de refus retourne la proposition', rejected[0].submission_id === rejectedSubmission.id);

    const rejection = await sql`
      SELECT status, reviewed_at, reviewed_by, rejection_reason, published_question_id
      FROM public.question_submissions WHERE id = ${rejectedSubmission.id}`;
    check('proposition marquée refusée', rejection[0].status === 'rejected');
    check('motif de refus enregistré', rejection[0].rejection_reason === 'Doublon de contenu');
    check('refus enregistré par l’administrateur', rejection[0].reviewed_by === admin.userId
      && Boolean(rejection[0].reviewed_at));
    check('aucune publication après refus', rejection[0].published_question_id === null);

    let doubleRejectionRejected = false;
    await asAuthenticated(sql, admin.userId, (tx) => tx`
      SELECT * FROM public.reject_question_submission(${rejectedSubmission.id}, 'Second motif')`).catch(() => { doubleRejectionRejected = true; });
    check('double refus refusé', doubleRejectionRejected);
  } finally {
    if (submissionIds.length) await sql`DELETE FROM public.question_submissions WHERE id IN ${sql(submissionIds)}`;
    if (publishedIds.length) await sql`DELETE FROM public.questions WHERE id IN ${sql(publishedIds)}`;
    await sql`DELETE FROM public.admin_users WHERE user_id = ${admin.userId}`;
    await sql`DELETE FROM public.players WHERE id IN ${sql([playerA.playerId, playerB.playerId, admin.playerId])}`;
    await sql`DELETE FROM auth.users WHERE id IN ${sql([playerA.userId, playerB.userId, admin.userId])}`;
    await sql.end();
  }

  console.log(`\n${failures === 0 ? '✅ TOUS LES TESTS PASSENT' : `❌ ${failures} TEST(S) EN ÉCHEC`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('💥', error.message);
  process.exit(1);
});
