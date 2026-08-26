// Importe catégories, questions et publicités dans le projet Supabase DEV.
// Reproduit la logique d'IDs de scripts/setup-supabase.js / import-data.js.
// Usage: node scripts/seed-dev.cjs
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');
const { requireDevDbUrl } = require('./lib/devDbUrl.cjs');

const URL = requireDevDbUrl();

async function main() {
  const { allQuestions } = await import(path.resolve(__dirname, '../src/data/allQuestions.js'));
  const sql = postgres(URL, { ssl: 'require', connect_timeout: 20 });

  // --- Catégories + questions ---
  const categories = [];
  const questions = [];
  let questionIndex = 1;

  for (const [categoryName, questionsArray] of Object.entries(allQuestions)) {
    const categoryId = categoryName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');

    categories.push({ id: categoryId, name: categoryName, slug: categoryId, description: null });

    (questionsArray || []).forEach((q) => {
      const questionId = `${categoryId}-q${questionIndex++}`;
      questions.push({
        id: questionId,
        category_id: categoryId,
        question: q.question,
        options: JSON.stringify(q.options),
        answer: q.answer,
        image: q.image || null,
      });
    });
  }

  console.log(`Insertion de ${categories.length} catégories...`);
  for (const c of categories) {
    await sql`
      INSERT INTO public.categories (id, name, slug, description)
      VALUES (${c.id}, ${c.name}, ${c.slug}, ${c.description})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug`;
  }
  console.log('✅ Catégories insérées');

  console.log(`Insertion de ${questions.length} questions...`);
  const BATCH = 50;
  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH);
    for (const q of batch) {
      await sql`
        INSERT INTO public.questions (id, category_id, question, options, answer, image)
        VALUES (${q.id}, ${q.category_id}, ${q.question}, ${q.options}::jsonb, ${q.answer}, ${q.image})
        ON CONFLICT (id) DO UPDATE SET
          question = EXCLUDED.question,
          options = EXCLUDED.options,
          answer = EXCLUDED.answer,
          image = EXCLUDED.image`;
    }
    console.log(`  ✓ ${Math.min(BATCH, questions.length - i)} questions`);
  }
  console.log('✅ Questions insérées');

  // --- Publicités ---
  const adsPath = path.resolve(__dirname, '../supabase/seeds/advertisements.json');
  if (fs.existsSync(adsPath)) {
    const ads = JSON.parse(fs.readFileSync(adsPath, 'utf-8'));
    console.log(`Insertion de ${ads.length} publicités...`);
    for (const a of ads) {
      await sql`
        INSERT INTO public.advertisements (id, image_url, link_url, title, active)
        VALUES (${a.id}, ${a.image_url}, ${a.link_url}, ${a.title || null}, ${a.active !== false})
        ON CONFLICT (id) DO UPDATE SET
          image_url = EXCLUDED.image_url,
          link_url = EXCLUDED.link_url,
          title = EXCLUDED.title,
          active = EXCLUDED.active`;
    }
    console.log('✅ Publicités insérées');
  }

  // Vérification des comptes
  const counts = await sql`
    SELECT
      (SELECT count(*) FROM public.categories) AS categories,
      (SELECT count(*) FROM public.questions) AS questions,
      (SELECT count(*) FROM public.advertisements) AS advertisements`;
  console.log('\nComptes finaux:', counts[0]);

  await sql.end();
  console.log('\n✨ Import DEV terminé');
}

main().catch((e) => { console.error('💥', e.message); process.exit(1); });
