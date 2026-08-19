import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const outputPath = path.join(repoRoot, 'supabase-config.js');
const originalContent = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;

test('generate-supabase-config supports SUPER_CONCTION_STRING', () => {
  const env = {
    ...process.env,
    SUPER_CONCTION_STRING: 'https://example.supabase.co;sb_test_anon_key',
  };

  execFileSync('node', ['scripts/generate-supabase-config.js'], {
    cwd: repoRoot,
    env,
    stdio: 'pipe',
  });

  const generated = fs.readFileSync(outputPath, 'utf8');
  assert.match(generated, /window\.SUPABASE_URL = "https:\/\/example\.supabase\.co"/);
  assert.match(generated, /window\.SUPABASE_ANON_KEY = "sb_test_anon_key"/);

  if (originalContent !== null) {
    fs.writeFileSync(outputPath, originalContent, 'utf8');
  } else {
    fs.unlinkSync(outputPath);
  }
});
