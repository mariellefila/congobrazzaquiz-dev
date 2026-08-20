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

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

let callbacks = { onReplay: null, onLogout: null };
let previouslyFocusedElement = null;

export function configureProfile(handlers) {
  callbacks = { ...callbacks, ...handlers };
}

export function isProfileModalOpen() {
  return Boolean(modal) && !modal.hidden;
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

    const category = document.createElement('strong');
    category.className = 'profile-game-category';
    category.textContent = game.category_name || game.category_slug;
    main.appendChild(category);

    const meta = document.createElement('p');
    meta.className = 'profile-game-meta';
    const total = game.total_questions || 0;
    meta.innerHTML = `<span class="profile-game-score">${game.correct_answers ?? 0}/${total}</span>`
      + `<span class="profile-game-xp">+${game.xp_earned ?? 0} XP</span>`
      + `<span class="profile-game-date">${formatDate(game.played_at)}</span>`;
    main.appendChild(meta);

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
  if (badgesEmptyEl) badgesEmptyEl.hidden = badges.length > 0;

  badges.forEach((badge) => {
    const item = document.createElement('li');
    item.className = 'profile-badge';

    const icon = document.createElement('img');
    icon.className = 'profile-badge-icon';
    icon.src = badge.iconUrl || badgeAssets[badge.id] || defaultAvatar;
    icon.alt = badge.name;
    icon.width = 72;
    icon.height = 72;

    const body = document.createElement('div');
    body.innerHTML = `<strong class="profile-badge-name">${badge.name}</strong>`
      + `<span class="profile-badge-condition">${badge.condition}</span>`
      + `<span class="profile-badge-date">Obtenu le ${formatDate(badge.earnedAt)}</span>`;

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
