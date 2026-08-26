// Modale « Profil joueur » affichée par-dessus la landing (même fond vidéo).

const overlay = document.querySelector('[data-profile-overlay]');
const backdrop = document.querySelector('[data-profile-backdrop]');
const modal = document.querySelector('[data-profile-modal]');
const closeButton = document.querySelector('[data-profile-close]');
const logoutButton = document.querySelector('[data-profile-logout]');
const avatarEl = document.querySelector('[data-profile-avatar]');
const nameEl = document.querySelector('[data-profile-name]');
const pointsEl = document.querySelector('[data-profile-points]');
const rankEl = document.querySelector('[data-profile-rank]');
const streakEl = document.querySelector('[data-profile-streak]');
const gamesEl = document.querySelector('[data-profile-games]');
const gamesEmptyEl = document.querySelector('[data-profile-games-empty]');
const badgesEl = document.querySelector('[data-profile-badges]');
const badgesEmptyEl = document.querySelector('[data-profile-badges-empty]');

const defaultAvatar = 'rebuild/dashboard%20Joeur/Ico%CC%82ne%20profil%20par%20de%CC%81faut.svg';

// Noms de fichiers en Unicode décomposé (NFD) : garder les chemins pré-encodés.
const badgeAssets = {
  'serie-10': 'rebuild/dashboard%20Joeur/Badge%2010%20bonnes%20re%CC%81ponses%20d%E2%80%99affile%CC%81e.svg',
  'expert-brazzaville': 'rebuild/dashboard%20Joeur/Badge%20Expert%20Brazzaville.svg',
  contributeur: 'rebuild/dashboard%20Joeur/Badge%20Contributeur.svg',
};

const badgeCatalog = [
  { id: 'serie-10', name: 'Série de 10', condition: "Obtenir 10 bonnes réponses d'affilée" },
  { id: 'expert-brazzaville', name: 'Expert Brazzaville', condition: 'Atteindre 90% dans 4 parties' },
  { id: 'contributeur', name: 'Contributeur', condition: 'Proposer une question et qu’elle soit approuvée' },
];

const categoryIcons = {
  geographie: '🌍',
  histoire: '🏛',
  gastronomie: '🍲',
  politique: '⚖',
  litterature: '📖',
  tourisme: '🗺',
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

let callbacks = { onReplay: null, onLogout: null };
let previouslyFocusedElement = null;

export function configureProfile(handlers) {
  callbacks = { ...callbacks, ...handlers };
}

export function isProfileModalOpen() {
  return Boolean(modal) && !modal.hidden;
}

function isValidDate(value) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function renderGames(games) {
  if (!gamesEl) return;
  gamesEl.innerHTML = '';
  if (gamesEmptyEl) gamesEmptyEl.hidden = games.length > 0;

  games.forEach((game) => {
    const item = document.createElement('li');
    item.className = 'profile-game';

    const main = document.createElement('div');
    main.className = 'profile-game-main';

    const icon = document.createElement('span');
    icon.className = 'profile-game-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = categoryIcons[game.category_slug] || '✦';
    item.appendChild(icon);

    const top = document.createElement('p');
    top.className = 'profile-game-top';
    const total = game.total_questions || 0;
    const score = document.createElement('span');
    score.className = 'profile-game-score';
    score.textContent = `${game.correct_answers ?? 0}/${total}`;
    const xp = document.createElement('span');
    xp.className = 'profile-game-xp';
    xp.textContent = `+${game.xp_earned ?? 0}xp`;
    top.append(score, xp);
    main.appendChild(top);

    const category = document.createElement('strong');
    category.className = 'profile-game-category';
    category.textContent = game.category_name || game.category_slug;
    main.appendChild(category);

    const date = document.createElement('span');
    date.className = 'profile-game-date';
    date.textContent = formatDate(game.played_at);
    main.appendChild(date);

    const replay = document.createElement('button');
    replay.className = 'profile-game-replay';
    replay.type = 'button';
    replay.dataset.replaySlug = game.category_slug;
    replay.textContent = 'Rejouer';
    replay.addEventListener('click', () => callbacks.onReplay?.(game.category_slug));

    item.appendChild(main);
    item.appendChild(replay);
    gamesEl.appendChild(item);
  });
}

function renderBadges(badges) {
  if (!badgesEl) return;
  badgesEl.innerHTML = '';
  if (badgesEmptyEl) badgesEmptyEl.hidden = true;

  // Un badge n'est obtenu que si le serveur a renvoyé une date d'obtention
  // réelle : le catalogue ne sert qu'à afficher les badges non acquis.
  const earnedBadges = new Map();
  (Array.isArray(badges) ? badges : []).forEach((badge) => {
    if (!badge?.id || !isValidDate(badge.earnedAt)) return;
    earnedBadges.set(badge.id, badge);
  });

  badgeCatalog.forEach((catalogBadge) => {
    const earnedBadge = earnedBadges.get(catalogBadge.id);
    const badge = {
      id: catalogBadge.id,
      name: earnedBadge?.name || catalogBadge.name,
      condition: earnedBadge?.condition || catalogBadge.condition,
      earnedAt: earnedBadge?.earnedAt || null,
      earned: Boolean(earnedBadge),
    };
    const item = document.createElement('li');
    item.className = `profile-badge${badge.earned ? ' is-earned' : ' is-locked'}`;

    const icon = document.createElement('img');
    icon.className = 'profile-badge-icon';
    icon.src = badgeAssets[badge.id];
    icon.alt = badge.name;
    icon.width = 72;
    icon.height = 72;

    const body = document.createElement('div');
    const name = document.createElement('strong');
    name.className = 'profile-badge-name';
    name.textContent = badge.name;
    const condition = document.createElement('span');
    condition.className = 'profile-badge-condition';
    condition.textContent = badge.condition;
    body.append(name, condition);
    if (badge.earned) {
      const date = document.createElement('span');
      date.className = 'profile-badge-date';
      date.textContent = `Obtenu le ${formatDate(badge.earnedAt)}`;
      body.appendChild(date);
    }

    item.appendChild(icon);
    item.appendChild(body);
    badgesEl.appendChild(item);
  });
}

export function renderProfile(data) {
  if (!modal) return;
  const player = data?.player;

  if (avatarEl) {
    avatarEl.src = data?.avatarUrl || defaultAvatar;
    avatarEl.alt = data?.displayName ? `Avatar de ${data.displayName}` : '';
  }
  if (nameEl) nameEl.textContent = data?.displayName || 'Joueur';
  if (pointsEl) pointsEl.textContent = player ? `${player.score ?? 0}` : '—';
  if (rankEl) rankEl.textContent = data?.rank ? `#${data.rank}` : '—';
  if (streakEl) streakEl.textContent = player ? `${player.current_streak ?? 0}` : '—';

  renderGames(data?.games || []);
  renderBadges(data?.badges || []);
}

export function closeProfileModal() {
  if (overlay) overlay.hidden = true;
  if (modal) modal.hidden = true;
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove('profile-modal-open');
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = null;
}

export async function openProfileModal(loadData) {
  if (!modal || !overlay) return;
  previouslyFocusedElement = document.activeElement;
  overlay.hidden = false;
  modal.hidden = false;
  if (backdrop) backdrop.hidden = false;
  document.body.classList.add('profile-modal-open');
  closeButton?.focus();

  try {
    renderProfile(await loadData());
  } catch (error) {
    console.warn('Profil joueur indisponible', error);
    renderProfile(null);
  }
}

closeButton?.addEventListener('click', closeProfileModal);
backdrop?.addEventListener('click', closeProfileModal);
logoutButton?.addEventListener('click', () => callbacks.onLogout?.());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isProfileModalOpen()) closeProfileModal();
});
