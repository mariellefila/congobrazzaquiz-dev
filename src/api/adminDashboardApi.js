import { fetchDashboardQuestionPreview } from './adminQuestionsApi.js';

function hasQueryClient(supabase) {
  return Boolean(supabase) && typeof supabase.from === 'function';
}

function createDashboardError(source, query, error) {
  return {
    source,
    query,
    message: error.message,
    code: error.code || null,
    details: error.details || null,
  };
}

async function countRows(supabase, table, apply = null) {
  if (!hasQueryClient(supabase)) {
    return { count: null, error: { source: table, query: `count(${table})`, message: 'Client Supabase indisponible', code: null, details: null } };
  }

  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (typeof apply === 'function') query = apply(query);

  const { count, error } = await query;
  if (error) {
    return { count: null, error: createDashboardError(table, `count(${table})`, error) };
  }

  return { count: count || 0, error: null };
}

function getAdStatus(ad) {
  if (ad.active === false) return 'inactive';
  return 'active';
}

export async function fetchDashboardStats(supabase) {
  const [players, soloGames, games, questions, activeAds] = await Promise.all([
    countRows(supabase, 'players'),
    countRows(supabase, 'solo_games'),
    countRows(supabase, 'games'),
    countRows(supabase, 'questions'),
    countRows(supabase, 'advertisements', (query) => query.eq('active', true)),
  ]);
  const errors = [players, soloGames, games, questions, activeAds].map((result) => result.error).filter(Boolean);
  const gamesPlayed = soloGames.count === null || games.count === null ? null : soloGames.count + games.count;

  return {
    stats: {
      activeUsers: players.count,
      gamesPlayed,
      validatedQuestions: questions.count,
      onlinePlayers: 0,
      activeAds: activeAds.count,
      scheduledAds: 0,
    },
    errors,
    diagnostics: {
      players,
      solo_games: soloGames,
      games,
      questions,
      advertisements: activeAds,
    },
  };
}

export async function fetchRecentAdvertisements(supabase) {
  if (!hasQueryClient(supabase)) {
    return {
      advertisements: null,
      errors: [{ source: 'advertisements', query: 'select recent advertisements', message: 'Client Supabase indisponible', code: null, details: null }],
      diagnostics: {},
    };
  }

  const { data, error } = await supabase
    .from('advertisements')
    .select('id, title, image_url, active, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    return {
      advertisements: null,
      errors: [createDashboardError('advertisements', 'select recent advertisements', error)],
      diagnostics: { advertisements: { count: null, error } },
    };
  }

  return {
    advertisements: (data || []).map((ad) => ({
      id: ad.id,
      name: ad.title || 'Publicité sans titre',
      thumbnail: ad.image_url,
      period: '',
      status: getAdStatus(ad),
    })),
    errors: [],
    diagnostics: { advertisements: { count: data?.length || 0, error: null } },
  };
}

export async function fetchDashboardData(supabase) {
  const [statsResult, questionsResult, advertisementsResult] = await Promise.all([
    fetchDashboardStats(supabase),
    fetchDashboardQuestionPreview(supabase),
    fetchRecentAdvertisements(supabase),
  ]);

  return {
    stats: statsResult.stats,
    questions: questionsResult.questions,
    advertisements: advertisementsResult.advertisements,
    errors: [
      ...statsResult.errors,
      ...questionsResult.errors,
      ...advertisementsResult.errors,
    ],
    diagnostics: {
      ...statsResult.diagnostics,
      ...advertisementsResult.diagnostics,
    },
  };
}