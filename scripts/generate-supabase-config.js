#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'supabase-config.js');

function parseSupabaseConnectionString(rawValue) {
  if (!rawValue) return { url: '', anonKey: '' };

  const value = String(rawValue).trim();
  const separatorMatch = value.match(/^(https?:\/\/[^;|\s]+)[;|](.+)$/i);

  if (separatorMatch) {
    return {
      url: separatorMatch[1],
      anonKey: separatorMatch[2].trim(),
    };
  }

  return { url: '', anonKey: '' };
}

const envConnectionString =
  process.env.SUPER_CONCTION_STRING
  || process.env.super_conction_string
  || process.env.SUPABASE_CONNECTIONSTRING
  || process.env.SUPABASE_CONNECTION_STRING
  || process.env.SUPER_CONCTION
  || process.env.super_conction;

const parsedConnectionString = parseSupabaseConnectionString(envConnectionString);

const SUPABASE_URL =
  parsedConnectionString.url
  || process.env.SUPABASE_URL
  || process.env.SUPABASE_PROJECT_URL
  || process.env.SUPABASE_PROJECTURL;

const SUPABASE_ANON_KEY =
  parsedConnectionString.anonKey
  || process.env.SUPABASE_ANON_KEY
  || process.env.SUPABASE_PUBLISHKEY;

function normalizeSupabaseUrl(value) {
  const trimmedValue = String(value || '').trim().replace(/\/+$/, '');
  const dashboardMatch = trimmedValue.match(/^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i);

  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  return trimmedValue;
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase frontend variables.');
  console.error('Expected one URL variable among: SUPABASE_URL, SUPABASE_PROJECT_URL, SUPABASE_PROJECTURL, SUPER_CONCTION_STRING, SUPABASE_CONNECTIONSTRING');
  console.error('Expected one anon key variable among: SUPABASE_ANON_KEY, SUPABASE_PUBLISHKEY, SUPER_CONCTION_STRING, SUPABASE_CONNECTIONSTRING');
  process.exit(1);
}

const normalizedSupabaseUrl = normalizeSupabaseUrl(SUPABASE_URL);

const fileContent = `// Auto-generated file for local runtime configuration.\n// Do not commit this file.\nwindow.SUPABASE_URL = ${JSON.stringify(normalizedSupabaseUrl)};\nwindow.SUPABASE_ANON_KEY = ${JSON.stringify(SUPABASE_ANON_KEY)};\n`;

fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log('supabase-config.js generated successfully.');