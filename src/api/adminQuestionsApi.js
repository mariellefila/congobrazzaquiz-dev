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

function mapSubmission(row) {
  return {
    id: row.id,
    source: 'submission',
    text: row.question,
    image: null,
    category: row.category_slug || 'Sans catégorie',
    categoryId: row.category_slug || '',
    author: row.players?.display_name || '',
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || null,
    options: row.options || [],
    answer: row.answer || '',
  };
}

function mapPublishedQuestion(row) {
  return {
    id: row.id,
    source: 'published',
    text: row.question,
    image: row.image || null,
    category: row.categories?.name || row.category_id || 'Sans catégorie',
    categoryId: row.category_id,
    author: '',
    status: 'approved',
    createdAt: row.created_at,
    reviewedAt: null,
    options: row.options || [],
    answer: row.answer || '',
  };
}

function sortNewest(questions) {
  return questions.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

async function fetchSubmissions(supabase, { status = null, limit = null } = {}) {
  if (!hasQueryClient(supabase)) {
    return { questions: null, error: unavailable('question_submissions', 'select question_submissions') };
  }

  let query = supabase
    .from('question_submissions')
    .select('id, question, category_slug, options, answer, status, created_at, reviewed_at, players(display_name)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return { questions: null, error: createError('question_submissions', 'select question_submissions', error) };
  return { questions: (data || []).map(mapSubmission), error: null };
}

async function fetchPublishedQuestions(supabase, { limit = null } = {}) {
  if (!hasQueryClient(supabase)) {
    return { questions: null, error: unavailable('questions', 'select questions') };
  }

  let query = supabase
    .from('questions')
    .select('id, category_id, question, options, answer, image, created_at, updated_at, categories(name)')
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return { questions: null, error: createError('questions', 'select questions', error) };
  return { questions: (data || []).map(mapPublishedQuestion), error: null };
}

export async function fetchQuestionCategories(supabase) {
  if (!hasQueryClient(supabase)) return { categories: null, error: unavailable('categories', 'select categories') };

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true });

  if (error) return { categories: null, error: createError('categories', 'select categories', error) };
  return { categories: data || [], error: null };
}

export async function fetchQuestionCounts(supabase) {
  if (!hasQueryClient(supabase)) {
    return { counts: null, errors: [unavailable('questions', 'count questions')] };
  }

  const count = async (source, apply = null) => {
    let query = supabase.from(source).select('*', { count: 'exact', head: true });
    if (apply) query = apply(query);
    const { count: result, error } = await query;
    return error ? { count: null, error: createError(source, `count(${source})`, error) } : { count: result || 0, error: null };
  };

  const [published, pending, approvedSubmissions, rejected] = await Promise.all([
    count('questions'),
    count('question_submissions', (query) => query.eq('status', 'pending')),
    count('question_submissions', (query) => query.eq('status', 'approved')),
    count('question_submissions', (query) => query.eq('status', 'rejected')),
  ]);
  const errors = [published, pending, approvedSubmissions, rejected].map((result) => result.error).filter(Boolean);

  return {
    counts: errors.length ? null : {
      all: published.count + pending.count + approvedSubmissions.count + rejected.count,
      pending: pending.count,
      approved: published.count + approvedSubmissions.count,
      rejected: rejected.count,
      published: published.count,
    },
    errors,
  };
}

export async function fetchQuestionsForAdmin(supabase, { status = 'all', categoryIds = [], search = '', limit = 20, offset = 0 } = {}) {
  const needsSubmissions = true;
  const needsPublished = status === 'all' || status === 'approved';
  const submissionStatus = status === 'all' ? null : status;
  const [submissionsResult, publishedResult] = await Promise.all([
    needsSubmissions ? fetchSubmissions(supabase, { status: submissionStatus }) : Promise.resolve({ questions: [], error: null }),
    needsPublished ? fetchPublishedQuestions(supabase) : Promise.resolve({ questions: [], error: null }),
  ]);

  const errors = [submissionsResult.error, publishedResult.error].filter(Boolean);
  if (errors.length) return { questions: null, total: null, errors };

  const normalizedSearch = search.trim().toLocaleLowerCase('fr');
  const normalizedCategoryIds = categoryIds.filter(Boolean);
  const questions = sortNewest([...submissionsResult.questions, ...publishedResult.questions])
    .filter((question) => normalizedCategoryIds.length === 0 || normalizedCategoryIds.includes(question.categoryId))
    .filter((question) => !normalizedSearch || question.text.toLocaleLowerCase('fr').includes(normalizedSearch));

  return {
    questions: questions.slice(offset, offset + limit),
    total: questions.length,
    errors: [],
  };
}

export async function fetchDashboardQuestionPreview(supabase) {
  const pending = await fetchSubmissions(supabase, { status: 'pending', limit: 3 });
  if (pending.error) return { questions: null, errors: [pending.error] };
  if (pending.questions.length > 0) return { questions: pending.questions, errors: [] };

  const published = await fetchPublishedQuestions(supabase, { limit: 3 });
  if (published.error) return { questions: null, errors: [published.error] };
  return { questions: published.questions, errors: [] };
}

export async function fetchAdminQuestionDetail(supabase, source, id) {
  const result = source === 'submission'
    ? await fetchSubmissions(supabase)
    : await fetchPublishedQuestions(supabase);

  if (result.error) return { question: null, errors: [result.error] };
  return { question: result.questions.find((question) => question.id === id) || null, errors: [] };
}
