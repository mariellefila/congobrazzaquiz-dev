// Applique les migrations SQL existantes sur le projet Supabase DEV.
// Usage: node scripts/apply-migrations-dev.cjs
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');
const { requireDevDbUrl } = require('./lib/devDbUrl.cjs');

const URL = requireDevDbUrl();

const MIGRATIONS = [
  '20260811_init_schema.sql',
  '20260811_fix_permissions_and_validate_answer.sql',
  '20260820_player_profile.sql',
  '20260826_solo_game_answers.sql',
  '20260827_badges_truth.sql',
  '20260906_back_office_admin_read.sql',
  '20260913_question_submission_moderation.sql',
  '20260913_question_submission_security.sql',
];

const TRACKING_TABLE = 'public.dev_migration_history';

async function hasSchemaMarker(sql, file) {
  const markers = {
    '20260811_init_schema.sql': `
      SELECT to_regclass('public.categories') IS NOT NULL
        AND to_regclass('public.questions') IS NOT NULL AS applied`,
    '20260811_fix_permissions_and_validate_answer.sql': `
      SELECT to_regclass('public.questions_public') IS NOT NULL AS applied`,
    '20260820_player_profile.sql': `
      SELECT to_regclass('public.players') IS NOT NULL
        AND to_regclass('public.question_submissions') IS NOT NULL AS applied`,
    '20260826_solo_game_answers.sql': `
      SELECT to_regclass('public.solo_game_answers') IS NOT NULL AS applied`,
    '20260827_badges_truth.sql': `
      SELECT to_regclass('public.player_badges') IS NOT NULL AS applied`,
    '20260906_back_office_admin_read.sql': `
      SELECT to_regclass('public.admin_users') IS NOT NULL
        AND to_regprocedure('public.is_admin()') IS NOT NULL AS applied`,
    '20260913_question_submission_moderation.sql': `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'question_submissions'
          AND column_name IN ('reviewed_by', 'published_question_id', 'rejection_reason')
        GROUP BY table_schema, table_name
        HAVING count(*) = 3
      )
      AND to_regprocedure('public.approve_question_submission(uuid)') IS NOT NULL
      AND to_regprocedure('public.reject_question_submission(uuid,text)') IS NOT NULL AS applied`,
    '20260913_question_submission_security.sql': `
      SELECT NOT EXISTS (
        SELECT 1
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name IN ('approve_question_submission', 'reject_question_submission')
          AND grantee IN ('anon', 'PUBLIC')
          AND privilege_type = 'EXECUTE'
      ) AS applied`,
  };
  if (!markers[file]) return false;
  const [result] = await sql.unsafe(markers[file]);
  return result?.applied === true;
}

async function main() {
  const sql = postgres(URL, { ssl: 'require', connect_timeout: 20 });
  const dir = path.resolve(__dirname, '../supabase/migrations');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await sql.unsafe(`REVOKE ALL ON ${TRACKING_TABLE} FROM PUBLIC`);

  for (const file of MIGRATIONS) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const [tracked] = await sql.unsafe(
      `SELECT filename FROM ${TRACKING_TABLE} WHERE filename = $1`,
      [file],
    );
    if (tracked) {
      console.log(`\n=== ${file} déjà suivie, ignorée ===`);
      continue;
    }

    if (await hasSchemaMarker(sql, file)) {
      await sql.unsafe(
        `INSERT INTO ${TRACKING_TABLE} (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
        [file],
      );
      console.log(`\n=== ${file} déjà matérialisée, ajoutée au suivi ===`);
      continue;
    }

    console.log(`\n=== Application de ${file} (${content.length} caractères) ===`);
    try {
      await sql.unsafe(content, [], { prepare: false });
      await sql.unsafe(
        `INSERT INTO ${TRACKING_TABLE} (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
        [file],
      );
      console.log(`✅ ${file} appliquée`);
    } catch (err) {
      console.error(`❌ Échec ${file}:`, err.message);
      if (err.position) console.error('   position:', err.position);
      await sql.end();
      process.exit(1);
    }
  }

  await sql.end();
  console.log('\n=== Toutes les migrations appliquées ===');
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
