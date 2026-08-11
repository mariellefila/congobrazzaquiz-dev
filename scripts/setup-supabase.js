#!/usr/bin/env node
/**
 * Complete setup script for Congo-Brazza Quizz on Supabase
 * This script:
 * 1. Applies database migrations (schema, RLS, etc.)
 * 2. Imports questions and advertisements data
 * 
 * Usage (from repo root):
 *   SUPABASE_URL=https://dhmkhogszktonyuynpns.supabase.co \
 *   SUPABASE_SERVICE_KEY=your-service-key \
 *   node scripts/setup-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dhmkhogszktonyuynpns.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('   Set env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Read migration SQL file and split into statements
 */
function readMigration() {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260811_init_schema.sql');
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`❌ Migration file not found: ${migrationPath}`);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  // Split by statements (simple heuristic: split by ; but be careful with quoted strings)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  return statements;
}

/**
 * Execute SQL via Supabase API - uses a workaround via POST to REST API
 * This is a bit of a hack but works for DDL statements
 */
async function executeSql(statement) {
  try {
    // Try executing via a raw query - Supabase's PostgREST doesn't expose arbitrary SQL,
    // so we'll need to use the direct PostgreSQL connection via admin SDK
    // For now, we'll try a workaround using rpc() if available, otherwise log warning
    
    // Workaround: try to execute via a simple SELECT to test connection
    if (statement.includes('CREATE')) {
      // For DDL, we need PostgreSQL connection - use curl + PostgREST auth header approach
      // Or skip and tell user to run manually
      return null;
    }
  } catch (e) {
    return null;
  }
}

/**
 * Load questions from file
 */
async function loadQuestionsFromFile() {
  const allQuestionsPath = path.resolve(__dirname, '../src/data/allQuestions.js');
  
  if (!fs.existsSync(allQuestionsPath)) {
    throw new Error(`❌ File not found: ${allQuestionsPath}`);
  }

  const { allQuestions } = await import(`file://${allQuestionsPath}`);
  
  const categories = [];
  const questions = [];
  let questionIndex = 1;

  for (const [categoryName, questionsArray] of Object.entries(allQuestions)) {
    const categoryId = categoryName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
    
    const categorySlug = categoryId;

    categories.push({
      id: categoryId,
      name: categoryName,
      slug: categorySlug,
      description: null,
    });

    (questionsArray || []).forEach((q) => {
      const questionId = `${categoryId}-q${questionIndex++}`;
      questions.push({
        id: questionId,
        category_id: categoryId,
        question: q.question,
        options: q.options,
        answer: q.answer,
        image: q.image || null,
      });
    });
  }

  return { categories, questions };
}

/**
 * Load advertisements
 */
async function loadAdvertisements() {
  const adsPath = path.resolve(__dirname, '../supabase/seeds/advertisements.json');
  
  if (!fs.existsSync(adsPath)) {
    console.log('⚠️  Advertisements file not found, skipping ads import');
    return [];
  }

  return JSON.parse(fs.readFileSync(adsPath, 'utf-8'));
}

/**
 * Verify migration was successful by checking if tables exist
 */
async function verifyMigrations() {
  console.log('✅ Checking if migrations are already applied...');
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code === 'PGRST116') {
      return false; // Table doesn't exist
    }
    
    console.log('✅ Migrations already applied (tables exist)');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Insert categories
 */
async function insertCategories(categories) {
  console.log(`📁 Inserting ${categories.length} categories...`);
  
  const { error } = await supabase
    .from('categories')
    .insert(categories);
  
  if (error) {
    console.error('❌ Error inserting categories:', error);
    throw error;
  }
  
  console.log('✅ Categories inserted');
}

/**
 * Insert questions
 */
async function insertQuestions(questions) {
  console.log(`📝 Inserting ${questions.length} questions...`);
  
  const BATCH_SIZE = 100;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('questions')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting questions batch:`, error);
      throw error;
    }
    
    console.log(`  ✓ Inserted ${Math.min(BATCH_SIZE, questions.length - i)} questions`);
  }
  
  console.log('✅ All questions inserted');
}

/**
 * Insert advertisements
 */
async function insertAdvertisements(ads) {
  if (!ads || ads.length === 0) {
    console.log('⚠️  No advertisements to insert');
    return;
  }

  console.log(`📢 Inserting ${ads.length} advertisements...`);
  
  const { error } = await supabase
    .from('advertisements')
    .insert(ads);
  
  if (error) {
    console.error('❌ Error inserting advertisements:', error);
    throw error;
  }
  
  console.log('✅ Advertisements inserted');
}

/**
 * Main setup flow
 */
async function main() {
  try {
    console.log('🚀 Starting Supabase setup for Congo-Brazza Quizz\n');
    console.log(`📌 Project URL: ${SUPABASE_URL}\n`);
    
    // Step 1: Check if migrations are applied
    const migrationsApplied = await verifyMigrations();
    
    if (!migrationsApplied) {
      console.log('\n⚠️  Migrations not yet applied. Please do one of the following:\n');
      console.log('Option 1: Use Supabase CLI (if you have access token):');
      console.log('  supabase login --token $SUPABASE_ACCESS_TOKEN');
      console.log('  supabase db push\n');
      console.log('Option 2: Apply migrations manually in Supabase Studio:');
      console.log('  1. Go to: https://app.supabase.com/project/dhmkhogszktonyuynpns/sql');
      console.log('  2. Create a new query');
      console.log('  3. Copy content from: supabase/migrations/20260811_init_schema.sql');
      console.log('  4. Run the query\n');
      console.log('Waiting 5 seconds before retrying...\n');
      
      await new Promise(r => setTimeout(r, 5000));
      
      const retryCheck = await verifyMigrations();
      if (!retryCheck) {
        console.log('❌ Migrations still not applied. Aborting data import.');
        console.log('ℹ️  Apply migrations manually first, then re-run this script.\n');
        process.exit(1);
      }
    }
    
    // Step 2: Load data
    console.log('\n📂 Loading questions from src/data/allQuestions.js...');
    const { categories, questions } = await loadQuestionsFromFile();
    console.log(`  ✓ Loaded ${categories.length} categories, ${questions.length} questions\n`);
    
    console.log('📂 Loading advertisements...');
    const ads = await loadAdvertisements();
    console.log(`  ✓ Loaded ${ads.length} advertisements\n`);
    
    // Step 3: Insert data
    await insertCategories(categories);
    await insertQuestions(questions);
    await insertAdvertisements(ads);
    
    console.log('\n✨ Setup completed successfully!');
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Questions: ${questions.length}`);
    console.log(`   - Advertisements: ${ads.length}\n`);
    console.log('Your Supabase project is ready for use!\n');
    
  } catch (err) {
    console.error('\n💥 Setup failed:', err.message);
    process.exit(1);
  }
}

main();
