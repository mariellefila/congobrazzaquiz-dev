#!/usr/bin/env node
/**
 * Import script for Congo-Brazza Quizz questions and ads.
 * This script reads from src/data/allQuestions.js and imports into Supabase.
 * 
 * Usage (from repo root):
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/import-data.js
 * 
 * Note: Uses service_role key (admin access) - only run this server-side or in CI/local.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Admin key (NOT anon)

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('   Set env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Read allQuestions.js and parse questions by category
 */
async function loadQuestionsFromFile() {
  const allQuestionsPath = path.resolve(__dirname, '../src/data/allQuestions.js');
  
  if (!fs.existsSync(allQuestionsPath)) {
    throw new Error(`❌ File not found: ${allQuestionsPath}`);
  }

  // Dynamically import ES module
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
 * Load advertisements from questions_tourismes.js or ads data file
 */
async function loadAdvertisementsFromFile() {
  const adsPath = path.resolve(__dirname, '../supabase/seeds/advertisements.json');
  
  if (!fs.existsSync(adsPath)) {
    console.log('⚠️  Advertisements file not found, skipping ads import');
    return [];
  }

  const adsData = JSON.parse(fs.readFileSync(adsPath, 'utf-8'));
  return adsData;
}

/**
 * Clear existing data (for re-runs) — CAREFUL!
 */
async function clearData(clearAnswers = false) {
  console.log('🗑️  Clearing existing data...');
  
  if (clearAnswers) {
    await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
  
  await supabase.from('game_players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('categories').delete().neq('id', '');
  await supabase.from('advertisements').delete().neq('id', '');
  
  console.log('✅ Data cleared');
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
  
  // Batch insert in chunks (Supabase has limits)
  const BATCH_SIZE = 100;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('questions')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting questions batch ${i / BATCH_SIZE}:`, error);
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
 * Main import flow
 */
async function main() {
  try {
    console.log('🚀 Starting data import for Congo-Brazza Quizz\n');
    
    // Load data from files
    console.log('📂 Loading questions from src/data/allQuestions.js...');
    const { categories, questions } = await loadQuestionsFromFile();
    console.log(`  ✓ Loaded ${categories.length} categories, ${questions.length} questions\n`);
    
    console.log('📂 Loading advertisements...');
    const ads = await loadAdvertisementsFromFile();
    console.log(`  ✓ Loaded ${ads.length} advertisements\n`);
    
    // Clear existing data (comment out if you want to preserve)
    // await clearData(false);

    // Insert data
    await insertCategories(categories);
    await insertQuestions(questions);
    await insertAdvertisements(ads);
    
    console.log('\n✨ Import completed successfully!');
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Questions: ${questions.length}`);
    console.log(`   - Advertisements: ${ads.length}`);
    
  } catch (err) {
    console.error('\n💥 Import failed:', err.message);
    process.exit(1);
  }
}

main();
