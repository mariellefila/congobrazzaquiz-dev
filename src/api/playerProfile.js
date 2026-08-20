// Accès aux données du profil joueur (Supabase).
// Toutes les fonctions sont tolérantes : elles renvoient des valeurs neutres
// si Supabase n'est pas configuré ou si les tables ne sont pas encore migrées.

const RECENT_GAMES_LIMIT = 5;

// --- MODE TEST TEMPORAIRE — zone "Mes badges" -----------------------------
// À retirer une fois la vérification visuelle terminée. Ne touche à rien
// d'autre que l'affichage des badges (aucune écriture Supabase).
const PROFILE_BADGES_TEST_MODE = true;

const TEST_BADGES = [
  { id: 'serie-10', name: 'Série de 10', condition: "Obtenir 10 bonnes réponses d'affilée", iconUrl: null, earnedAt: '2026-08-20' },
  // 'expert-brazzaville' volontairement absent : simule un badge non acquis.
  { id: 'contributeur', name: 'Contributeur', condition: 'Proposer une question et qu’elle soit approuvée', iconUrl: null, earnedAt: '2026-08-18' },
];
// --- Fin mode test ----------------------------------------------------------

export function getDisplayName(user) {
  if (!user) return '';
  const metadata = user.user_metadata || {};
  return (
    metadata.full_name
    || metadata.name
    || metadata.display_name
    || metadata.user_name
    || user.email
    || 'Joueur'
  );
}

export function getAvatarUrl(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
}

// Pseudo court affiché dans la navigation (ex. « MICHEL.B »).
export function formatPseudo(name) {
  if (!name) return 'JOUEUR';
  const cleaned = String(name).split('@')[0].trim();
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return 'JOUEUR';
  if (parts.length === 1) return parts[0].toUpperCase();
  return `${parts[0]}.${parts[1][0]}`.toUpperCase();
}

function isQueryable(supabase) {
  return Boolean(supabase) && typeof supabase.from === 'function';
}

export async function ensurePlayer(supabase, user) {
  if (!isQueryable(supabase) || !user) return null;

  const { data, error } = await supabase
    .from('players')
    .upsert(
      {
        user_id: user.id,
        display_name: getDisplayName(user),
        avatar_url: getAvatarUrl(user),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Impossible de synchroniser le profil joueur', error.message);
    return null;
  }
  return data;
}

async function fetchRank(supabase, playerId) {
  if (typeof supabase.rpc !== 'function') return null;
  const { data, error } = await supabase.rpc('get_player_rank', { p_player_id: playerId });
  if (error) {
    console.warn('Classement indisponible', error.message);
    return null;
  }
  return typeof data === 'number' ? data : null;
}

async function fetchRecentGames(supabase, playerId) {
  const { data, error } = await supabase
    .from('solo_games')
    .select('id, category_slug, category_name, score, correct_answers, total_questions, xp_earned, played_at')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false })
    .limit(RECENT_GAMES_LIMIT);

  if (error) {
    console.warn('Historique des parties indisponible', error.message);
    return [];
  }
  return data || [];
}

async function fetchBadges(supabase, playerId) {
  if (PROFILE_BADGES_TEST_MODE) return TEST_BADGES; // mode test, voir constante ci-dessus

  const { data, error } = await supabase
    .from('player_badges')
    .select('badge_id, earned_at, badges(id, name, condition_label, icon_url, sort_order)')
    .eq('player_id', playerId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.warn('Badges indisponibles', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.badge_id,
    name: row.badges?.name || row.badge_id,
    condition: row.badges?.condition_label || '',
    iconUrl: row.badges?.icon_url || null,
    earnedAt: row.earned_at,
  }));
}

export async function fetchPlayerProfile(supabase, user) {
  const player = await ensurePlayer(supabase, user);
  if (!player) {
    return {
      player: null,
      rank: null,
      games: [],
      badges: PROFILE_BADGES_TEST_MODE ? TEST_BADGES : [],
      displayName: getDisplayName(user),
      avatarUrl: getAvatarUrl(user),
    };
  }

  const [rank, games, badges] = await Promise.all([
    fetchRank(supabase, player.id),
    fetchRecentGames(supabase, player.id),
    fetchBadges(supabase, player.id),
  ]);

  return {
    player,
    rank,
    games,
    badges,
    displayName: player.display_name || getDisplayName(user),
    avatarUrl: player.avatar_url || getAvatarUrl(user),
  };
}

// Enregistre une partie solo terminée. `results` est la suite ordonnée des
// réponses (true = bonne réponse) : le serveur en déduit XP, série et badges.
export async function recordSoloGame(supabase, { categorySlug, categoryName, score, results }) {
  if (!supabase || typeof supabase.rpc !== 'function') return null;

  const { data, error } = await supabase.rpc('record_solo_game', {
    p_category_slug: categorySlug,
    p_category_name: categoryName,
    p_score: score,
    p_results: results,
  });

  if (error) {
    console.warn('Partie solo non enregistrée', error.message);
    return null;
  }

  return Array.isArray(data) ? data[0] ?? null : data;
}
