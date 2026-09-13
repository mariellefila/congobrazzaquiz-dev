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

export const QUESTION_SUBMISSIONS_BUCKET = 'question-submissions';
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function validateQuestionImage(file) {
  if (!file) return { valid: true, error: null };
  const extension = String(file.name || '').split('.').pop()?.toLowerCase();
  if (!IMAGE_TYPES[file.type] || IMAGE_TYPES[file.type] !== extension) {
    return { valid: false, error: 'Le fichier doit être un JPEG, PNG ou WebP.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'L’image ne doit pas dépasser 5 Mo.' };
  }
  return { valid: true, error: null };
}

export async function uploadQuestionImage(supabase, userId, file) {
  const validation = validateQuestionImage(file);
  if (!validation.valid) return { path: null, error: { source: 'storage', query: 'upload image', message: validation.error } };
  if (!supabase?.storage?.from || !userId || !file) return { path: null, error: unavailable('storage', 'upload image') };

  const extension = IMAGE_TYPES[file.type];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(QUESTION_SUBMISSIONS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) return { path: null, error: createError('storage', 'upload image', error) };
  return { path, error: null };
}

export async function deleteQuestionImage(supabase, path) {
  if (!path || /^https:\/\//i.test(path) || !supabase?.storage?.from) return { error: null };
  const { error } = await supabase.storage.from(QUESTION_SUBMISSIONS_BUCKET).remove([path]);
  return error ? { error: createError('storage', 'delete image', error) } : { error: null };
}

export async function resolveQuestionImage(supabase, image, expiresIn = 3600) {
  if (!image) return null;
  if (/^https:\/\//i.test(image)) return image;
  if (!supabase?.storage?.from) return null;
  const { data, error } = await supabase.storage.from(QUESTION_SUBMISSIONS_BUCKET).createSignedUrl(image, expiresIn);
  return error || !data?.signedUrl ? null : data.signedUrl;
}

export async function submitQuestionProposal(supabase, { playerId, userId = null, categorySlug, question, options, correctAnswer, image = null }) {
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

  if (!playerId || !cleanCategorySlug || !cleanQuestion || !cleanAnswer || normalizedOptions.length !== 4 || normalizedOptions.includes(cleanAnswer) === false || (cleanImage && !/^https:\/\//i.test(cleanImage) && (!userId || !cleanImage.startsWith(`${userId}/`)))) {
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
    .select('id, question, category_slug, status, created_at, reviewed_at, rejection_reason, published_question_id, image')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    return { submissions: null, error: createError('question_submissions', 'select question_submissions', error) };
  }
  const submissions = await Promise.all((data || []).map(async (submission) => ({
    ...submission,
    image_url: await resolveQuestionImage(supabase, submission.image),
  })));
  return { submissions, error: null };
}
