// API joueur dédiée à la proposition de questions (hors périmètre back-office).
// Les joueurs ne peuvent que créer une proposition et consulter les leurs ;
// les transitions de statut restent réservées aux RPC admin (adminQuestionsApi.js).

function hasQueryClient(supabase) {
  return Boolean(supabase) && typeof supabase.from === 'function';
}

function createError(source, query, error) {
  return {
    source,
    query,
    message: error.message,
    code: error.code || null,
    details: error.details || null,
  };
}

function unavailable(source, query) {
  return createError(source, query, new Error('Client Supabase indisponible'));
}

export async function submitQuestionProposal(supabase, { playerId, categorySlug, question, options, correctAnswer, image = null }) {
  if (!hasQueryClient(supabase)) {
    return { submission: null, error: unavailable('question_submissions', 'insert question_submissions') };
  }

  const cleanQuestion = String(question || '').trim();
  const cleanCategorySlug = String(categorySlug || '').trim();
  const cleanImage = String(image || '').trim() || null;
  const normalizedOptions = Array.isArray(options)
    ? [...new Set(options.map((option) => String(option || '').trim()).filter(Boolean))]
    : [];
  const cleanAnswer = String(correctAnswer || '').trim();

  if (!playerId || !cleanCategorySlug || !cleanQuestion || !cleanAnswer || normalizedOptions.length !== 4 || normalizedOptions.includes(cleanAnswer) === false) {
    return {
      submission: null,
      error: { source: 'question_submissions', query: 'insert question_submissions', message: 'Paramètres invalides pour la proposition', code: 'VALIDATION', details: null },
    };
  }

  const payload = {
    player_id: playerId,
    category_slug: cleanCategorySlug,
    question: cleanQuestion,
    options: normalizedOptions,
    answer: cleanAnswer,
    image: cleanImage,
    status: 'pending',
  };

  const insertQuery = supabase.from('question_submissions').insert(payload);
  let result;

  if (typeof insertQuery.select === 'function') {
    const selection = insertQuery.select('id, category_slug, question, options, answer, status, created_at');
    if (typeof selection.single === 'function') {
      result = await selection.single();
    } else {
      result = await selection;
    }
  } else {
    result = await insertQuery;
  }

  const { data, error } = result || {};
  if (error) {
    return { submission: null, error: createError('question_submissions', 'insert question_submissions', error) };
  }

  const submission = Array.isArray(data) ? data[0] ?? null : data ?? null;
  return { submission, error: null };
}

// Ne renvoie que les propositions du joueur courant (appliqué par la RLS
// "question_submissions_owner_read" côté serveur).
export async function fetchMyQuestionSubmissions(supabase, playerId) {
  if (!hasQueryClient(supabase)) {
    return { submissions: null, error: unavailable('question_submissions', 'select question_submissions') };
  }
  if (!playerId) {
    return { submissions: [], error: null };
  }

  const { data, error } = await supabase
    .from('question_submissions')
    .select('id, question, category_slug, status, created_at, reviewed_at, rejection_reason, published_question_id')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    return { submissions: null, error: createError('question_submissions', 'select question_submissions', error) };
  }
  return { submissions: data || [], error: null };
}
