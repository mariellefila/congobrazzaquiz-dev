import { initSupabase } from '../lib/supabaseClient.js';
import { startSoloQuiz, resetSoloQuizView } from './soloQuiz.js';
import { fetchPlayerProfile, formatPseudo, getAvatarUrl, getDisplayName } from '../api/playerProfile.js';
import { configureProfile, openProfileModal, closeProfileModal } from './playerProfile.js';

const pendingDestinationKey = 'cbq.pendingDestination';
const pendingActionKey = 'cbq.pendingAction';

// --- MOCK AUTH (temporaire) ---------------------------------------------
// Simule une connexion réussie tant que l'authentification réelle n'est pas
// branchée sur cette page. À supprimer intégralement (ce bloc + les appels
// marqués « MOCK AUTH » plus bas) quand Supabase gèrera la session pour de vrai.
const MOCK_AUTH_ENABLED = true;
const mockAuthStorageKey = 'cbq.mockAuth.user';
const mockAuthUser = {
  id: 'mock-amelia-b',
  user_metadata: { full_name: 'Amelia B' },
};

function getMockUser() {
  try {
    return JSON.parse(localStorage.getItem(mockAuthStorageKey));
  } catch (error) {
    return null;
  }
}

function setMockUser(user) {
  localStorage.setItem(mockAuthStorageKey, JSON.stringify(user));
}

function clearMockUser() {
  localStorage.removeItem(mockAuthStorageKey);
}
// --- FIN MOCK AUTH ---------------------------------------------------------
const ctaButtons = [...document.querySelectorAll('[data-protected-destination], [data-open-mode-modal], [data-open-network-soon-modal]')];
const loginOverlay = document.querySelector('[data-login-overlay]');
const modal = document.querySelector('[data-login-modal]');
const backdrop = document.querySelector('[data-login-backdrop]');
const closeButton = document.querySelector('[data-login-close]');
const skipLoginLink = document.querySelector('[data-login-skip]');
const providerButtons = [...document.querySelectorAll('[data-login-provider]')];
const statusMessage = document.querySelector('[data-login-status]');
const modeModal = document.querySelector('[data-mode-modal]');
const modeOverlay = document.querySelector('[data-mode-overlay]');
const modeBackdrop = document.querySelector('[data-mode-backdrop]');
const modeCloseButton = document.querySelector('[data-mode-close]');
const modeButtons = [...document.querySelectorAll('[data-mode-slug]')];
const modeCards = [...document.querySelectorAll('.mode-card')];
const categoryOverlay = document.querySelector('[data-category-overlay]');
const categoryModal = document.querySelector('[data-category-modal]');
const categoryCloseButton = document.querySelector('[data-category-close]');
const categoryButtons = [...document.querySelectorAll('[data-category-slug]')];
const multiSoonOverlay = document.querySelector('[data-multi-soon-overlay]');
const multiSoonModal = document.querySelector('[data-multi-soon-modal]');
const multiSoonBackdrop = document.querySelector('[data-multi-soon-backdrop]');
const multiSoonCloseButton = document.querySelector('[data-multi-soon-close]');
const roomSoonOverlay = document.querySelector('[data-room-soon-overlay]');
const roomSoonModal = document.querySelector('[data-room-soon-modal]');
const roomSoonBackdrop = document.querySelector('[data-room-soon-backdrop]');
const roomSoonCloseButton = document.querySelector('[data-room-soon-close]');
const networkSoonOverlay = document.querySelector('[data-network-soon-overlay]');
const networkSoonModal = document.querySelector('[data-network-soon-modal]');
const networkSoonBackdrop = document.querySelector('[data-network-soon-backdrop]');
const networkSoonCloseButton = document.querySelector('[data-network-soon-close]');
const authTrigger = document.querySelector('[data-auth-trigger]');
const authLabel = document.querySelector('[data-auth-label]');
const authAvatar = document.querySelector('[data-auth-avatar]');
const defaultAvatar = 'rebuild/dashboard%20Joeur/profil%20perosnne.svg';
let currentUser = null;
let pendingDestination = sessionStorage.getItem(pendingDestinationKey);
let pendingAction = sessionStorage.getItem(pendingActionKey);
let previouslyFocusedElement = null;
let supabase = null;
let supabaseInitialisation = null;

function setStatus(message) {
  if (statusMessage) statusMessage.textContent = message;
}

function setPendingAction(action) {
  pendingAction = action;
  if (action) {
    sessionStorage.setItem(pendingActionKey, action);
    return;
  }

  sessionStorage.removeItem(pendingActionKey);
}

function setActiveCta(activeButton) {
  ctaButtons.forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function getFocusableElements(targetModal) {
  if (!targetModal) return [];
  return [...targetModal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute('hidden'));
}

function openLoginModal() {
  previouslyFocusedElement = document.activeElement;
  skipLoginLink.href = pendingDestination || '#';
  loginOverlay.hidden = false;
  modal.hidden = false;
  backdrop.hidden = false;
  document.body.classList.add('login-modal-open');
  closeButton.focus();
}

function closeLoginModal() {
  if (modal) {
    modal.hidden = true;
  }
  if (backdrop) {
    backdrop.hidden = true;
  }
  if (loginOverlay) {
    loginOverlay.hidden = true;
  }
  document.body.classList.remove('login-modal-open');
  setStatus('');
  pendingDestination = null;
  sessionStorage.removeItem(pendingDestinationKey);
  setPendingAction(null);
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = null;
}

function openModeModal() {
  if (!modeModal || !modeBackdrop) return;
  previouslyFocusedElement = document.activeElement;
  if (modal && !modal.hidden) {
    modal.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove('login-modal-open');
  }
  if (modeOverlay) {
    modeOverlay.hidden = false;
  }
  modeModal.hidden = false;
  modeBackdrop.hidden = false;
  document.body.classList.add('mode-modal-open');
  modeCloseButton?.focus();
}

function openCategoryModal() {
  if (!categoryModal || !categoryOverlay) return;
  resetSoloQuizView();
  previouslyFocusedElement = document.activeElement;
  categoryOverlay.hidden = false;
  categoryModal.hidden = false;
  document.body.classList.add('category-modal-open');
  categoryCloseButton?.focus();
}

function closeCategoryModal() {
  if (categoryOverlay) {
    categoryOverlay.hidden = true;
  }
  if (categoryModal) {
    categoryModal.hidden = true;
  }
  document.body.classList.remove('category-modal-open');
  resetSoloQuizView();
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = null;
}

function closeModeModal() {
  if (modeOverlay) {
    modeOverlay.hidden = true;
  }
  if (modeModal) {
    modeModal.hidden = true;
  }
  if (modeBackdrop) {
    modeBackdrop.hidden = true;
  }
  document.body.classList.remove('mode-modal-open');
  setPendingAction(null);
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = null;
}

function openMultiSoonModal() {
  if (!multiSoonModal || !multiSoonOverlay) return;
  previouslyFocusedElement = document.activeElement;
  multiSoonOverlay.hidden = false;
  multiSoonBackdrop.hidden = false;
  multiSoonModal.hidden = false;
  document.body.classList.add('multi-soon-modal-open');
  multiSoonCloseButton?.focus();
}

function closeMultiSoonModal() {
  if (multiSoonOverlay) {
    multiSoonOverlay.hidden = true;
  }
  if (multiSoonModal) {
    multiSoonModal.hidden = true;
  }
  if (multiSoonBackdrop) {
    multiSoonBackdrop.hidden = true;
  }
  document.body.classList.remove('multi-soon-modal-open');
}

function openRoomSoonModal() {
  if (!roomSoonModal || !roomSoonOverlay) return;
  previouslyFocusedElement = document.activeElement;
  roomSoonOverlay.hidden = false;
  roomSoonBackdrop.hidden = false;
  roomSoonModal.hidden = false;
  document.body.classList.add('room-soon-modal-open');
  roomSoonCloseButton?.focus();
}

function closeRoomSoonModal() {
  if (roomSoonOverlay) {
    roomSoonOverlay.hidden = true;
  }
  if (roomSoonModal) {
    roomSoonModal.hidden = true;
  }
  if (roomSoonBackdrop) {
    roomSoonBackdrop.hidden = true;
  }
  document.body.classList.remove('room-soon-modal-open');
}

function openNetworkSoonModal() {
  if (!networkSoonModal || !networkSoonOverlay) return;
  previouslyFocusedElement = document.activeElement;
  networkSoonOverlay.hidden = false;
  networkSoonBackdrop.hidden = false;
  networkSoonModal.hidden = false;
  document.body.classList.add('network-soon-modal-open');
  networkSoonCloseButton?.focus();
}

function closeNetworkSoonModal() {
  if (networkSoonOverlay) {
    networkSoonOverlay.hidden = true;
  }
  if (networkSoonModal) {
    networkSoonModal.hidden = true;
  }
  if (networkSoonBackdrop) {
    networkSoonBackdrop.hidden = true;
  }
  document.body.classList.remove('network-soon-modal-open');
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = null;
}

function continueWithoutAuthentication(event) {
  event.preventDefault();

  if (pendingAction === 'openModeModal') {
    closeLoginModal();
    openModeModal();
    return;
  }

  const destination = pendingDestination;
  closeLoginModal();
  if (destination) window.location.href = destination;
}

async function getCurrentSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function hasActiveSession() {
  if (MOCK_AUTH_ENABLED && getMockUser()) return true; // MOCK AUTH
  if (currentUser) return true;

  try {
    return Boolean(await getCurrentSession());
  } catch (error) {
    console.error('Impossible de vérifier la session Supabase', error);
    return false;
  }
}

async function handleProtectedNavigation(destination, clickedButton) {
  setActiveCta(clickedButton);

  if (clickedButton.dataset.openNetworkSoonModal !== undefined) {
    openNetworkSoonModal();
    return;
  }

  if (clickedButton.dataset.modeAction === 'mode' || clickedButton.dataset.openModeModal !== undefined) {
    if (await hasActiveSession()) {
      openModeModal();
      return;
    }

    pendingDestination = null;
    sessionStorage.removeItem(pendingDestinationKey);
    setPendingAction('openModeModal');
    setStatus(supabase ? '' : 'La connexion est momentanément indisponible.');
    openLoginModal();
    return;
  }

  if (await hasActiveSession()) {
    window.location.href = destination;
    return;
  }

  pendingDestination = destination;
  sessionStorage.setItem(pendingDestinationKey, destination);
  setStatus(supabase ? '' : 'La connexion est momentanément indisponible.');
  openLoginModal();
}

async function signInWithProvider(provider) {
  // MOCK AUTH : simule une connexion réussie sans passer par Supabase.
  if (MOCK_AUTH_ENABLED) {
    const intendedAction = pendingAction;
    setMockUser(mockAuthUser);
    updateAuthUi(mockAuthUser);
    closeLoginModal();
    if (intendedAction === 'openModeModal') {
      openModeModal();
      return;
    }
    window.location.href = 'index.html';
    return;
  }

  await supabaseInitialisation;

  if (!supabase) {
    console.error('Connexion OAuth indisponible : configuration Supabase manquante.');
    setStatus('La connexion est momentanément indisponible.');
    return;
  }

  providerButtons.forEach((button) => {
    button.disabled = true;
  });
  setStatus('Redirection vers le service de connexion...');

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href.split('#')[0] },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    providerButtons.forEach((button) => {
      button.disabled = false;
    });
    setStatus('La connexion a échoué. Veuillez réessayer.');
    console.error('Échec de la connexion OAuth', error);
  }
}

function trapFocus(event) {
  if (event.key !== 'Tab') return;

  const activeModal = !modal || modal.hidden ? (modeModal && !modeModal.hidden ? modeModal : null) : modal;
  if (!activeModal) return;

  const focusableElements = getFocusableElements(activeModal);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function selectMode(event) {
  const button = event.currentTarget;
  const modeSlug = button.dataset.modeSlug;
  if (!modeSlug) return;

  if (modeSlug === 'multi') {
    closeModeModal();
    openMultiSoonModal();
    return;
  }

  if (modeSlug === 'room') {
    closeModeModal();
    openRoomSoonModal();
    return;
  }

  sessionStorage.setItem('cbq.selectedMode', modeSlug);
  closeModeModal();
  openCategoryModal();
}

function selectCategory(event) {
  const button = event.currentTarget;
  const categorySlug = button.dataset.categorySlug;
  if (!categorySlug) return;

  sessionStorage.setItem('cbq.selectedCategory', categorySlug);
  startSoloQuiz(categorySlug);
}

function updateAuthUi(user) {
  currentUser = user || null;
  if (!authTrigger || !authLabel) return;

  if (currentUser) {
    authTrigger.dataset.authState = 'signed-in';
    authLabel.textContent = formatPseudo(getDisplayName(currentUser));
    authTrigger.setAttribute('aria-label', 'Voir mon profil joueur');
    if (authAvatar) {
      authAvatar.src = getAvatarUrl(currentUser) || defaultAvatar;
      authAvatar.hidden = false;
    }
    return;
  }

  authTrigger.dataset.authState = 'signed-out';
  authLabel.textContent = 'Se connecter';
  authTrigger.setAttribute('aria-label', 'Se connecter');
  if (authAvatar) authAvatar.hidden = true;
  closeProfileModal();
}

function replayCategory(categorySlug) {
  if (!categorySlug) return;
  closeProfileModal();
  sessionStorage.setItem('cbq.selectedCategory', categorySlug);
  openCategoryModal();
  startSoloQuiz(categorySlug);
}

async function signOut() {
  clearMockUser(); // MOCK AUTH
  try {
    await supabase?.auth?.signOut?.();
  } catch (error) {
    console.error('Déconnexion impossible', error);
  }
  closeProfileModal();
  updateAuthUi(null);
}

configureProfile({ onReplay: replayCategory, onLogout: signOut });

function handleAuthTriggerClick() {
  if (currentUser) {
    openProfileModal(() => fetchPlayerProfile(supabase, currentUser));
    return;
  }

  pendingDestination = null;
  sessionStorage.removeItem(pendingDestinationKey);
  setPendingAction(null);
  setStatus(supabase ? '' : 'La connexion est momentanément indisponible.');
  openLoginModal();
}

async function initialise() {
  // MOCK AUTH : restaure la session simulée persistée avant tout appel Supabase.
  if (MOCK_AUTH_ENABLED) {
    const mockUser = getMockUser();
    if (mockUser) {
      updateAuthUi(mockUser);
      if (pendingAction === 'openModeModal') {
        setPendingAction(null);
        openModeModal();
      }
      return;
    }
  }

  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    try {
      supabase = await initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      const session = await getCurrentSession();
      updateAuthUi(session?.user);

      supabase.auth.onAuthStateChange?.((_event, nextSession) => {
        updateAuthUi(nextSession?.user);
      });

      if (session && pendingAction === 'openModeModal') {
        setPendingAction(null);
        openModeModal();
        return;
      }

      if (session && pendingDestination) {
        const destination = pendingDestination;
        sessionStorage.removeItem(pendingDestinationKey);
        pendingDestination = null;
        window.location.href = destination;
      }
    } catch (error) {
      console.error('Supabase n’est pas disponible sur la landing', error);
    }
  } else {
    console.error('Supabase non initialisé : SUPABASE_URL ou SUPABASE_ANON_KEY manquant.');
  }
}

ctaButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    handleProtectedNavigation(button.dataset.protectedDestination, button);
  });
  button.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    button.click();
  });
});

providerButtons.forEach((button) => {
  button.addEventListener('click', () => signInWithProvider(button.dataset.loginProvider));
});

modeButtons.forEach((button) => {
  button.addEventListener('click', selectMode);
});

categoryButtons.forEach((button) => {
  button.addEventListener('click', selectCategory);
});

modeCards.forEach((card) => {
  card.addEventListener('click', (event) => {
    if (!window.matchMedia('(max-width: 749px)').matches || event.target.closest('button')) return;
    card.querySelector('[data-mode-slug]')?.click();
  });
});

if (closeButton) {
  closeButton.addEventListener('click', closeLoginModal);
}
if (skipLoginLink) {
  skipLoginLink.addEventListener('click', continueWithoutAuthentication);
}
if (backdrop) {
  backdrop.addEventListener('click', closeLoginModal);
}
if (modeCloseButton) {
  modeCloseButton.addEventListener('click', closeModeModal);
}
if (modeBackdrop) {
  modeBackdrop.addEventListener('click', closeModeModal);
}
if (multiSoonCloseButton) {
  multiSoonCloseButton.addEventListener('click', () => {
    closeMultiSoonModal();
    openModeModal();
  });
}
if (multiSoonBackdrop) {
  multiSoonBackdrop.addEventListener('click', () => {
    closeMultiSoonModal();
    openModeModal();
  });
}
if (roomSoonCloseButton) {
  roomSoonCloseButton.addEventListener('click', () => {
    closeRoomSoonModal();
    openModeModal();
  });
}
if (roomSoonBackdrop) {
  roomSoonBackdrop.addEventListener('click', () => {
    closeRoomSoonModal();
    openModeModal();
  });
}
if (networkSoonCloseButton) {
  networkSoonCloseButton.addEventListener('click', closeNetworkSoonModal);
}
if (networkSoonBackdrop) {
  networkSoonBackdrop.addEventListener('click', closeNetworkSoonModal);
}
if (categoryCloseButton) {
  categoryCloseButton.addEventListener('click', closeCategoryModal);
}
if (authTrigger) {
  authTrigger.addEventListener('click', handleAuthTriggerClick);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal && !modal.hidden) closeLoginModal();
  if (event.key === 'Escape' && modeModal && !modeModal.hidden) closeModeModal();
  if (event.key === 'Escape' && categoryModal && !categoryModal.hidden) closeCategoryModal();
  if (event.key === 'Escape' && multiSoonModal && !multiSoonModal.hidden) {
    closeMultiSoonModal();
    openModeModal();
  }
  if (event.key === 'Escape' && roomSoonModal && !roomSoonModal.hidden) {
    closeRoomSoonModal();
    openModeModal();
  }
  if (event.key === 'Escape' && networkSoonModal && !networkSoonModal.hidden) closeNetworkSoonModal();
  trapFocus(event);
});

supabaseInitialisation = initialise();