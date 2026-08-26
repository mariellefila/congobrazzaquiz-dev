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
];

async function main() {
  const sql = postgres(URL, { ssl: 'require', connect_timeout: 20 });
  const dir = path.resolve(__dirname, '../supabase/migrations');

  for (const file of MIGRATIONS) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n=== Application de ${file} (${content.length} caractères) ===`);
    try {
      await sql.unsafe(content, [], { prepare: false });
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
