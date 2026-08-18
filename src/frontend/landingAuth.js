import { initSupabase } from '../lib/supabaseClient.js';
import { startSoloQuiz, resetSoloQuizView } from './soloQuiz.js';

const pendingDestinationKey = 'cbq.pendingDestination';
const pendingActionKey = 'cbq.pendingAction';
const ctaButtons = [...document.querySelectorAll('[data-protected-destination], [data-open-mode-modal]')];
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

async function handleProtectedNavigation(destination, clickedButton) {
  setActiveCta(clickedButton);

  if (clickedButton.dataset.modeAction === 'mode') {
    try {
      const session = await getCurrentSession();
      if (session) {
        openModeModal();
        return;
      }
    } catch (error) {
      console.error('Impossible de vérifier la session Supabase', error);
    }

    pendingDestination = null;
    sessionStorage.removeItem(pendingDestinationKey);
    setPendingAction('openModeModal');
    setStatus(supabase ? '' : 'La connexion est momentanément indisponible.');
    openLoginModal();
    return;
  }

  try {
    const session = await getCurrentSession();
    if (session) {
      window.location.href = destination;
      return;
    }
  } catch (error) {
    console.error('Impossible de vérifier la session Supabase', error);
  }

  pendingDestination = destination;
  sessionStorage.setItem(pendingDestinationKey, destination);
  setStatus(supabase ? '' : 'La connexion est momentanément indisponible.');
  openLoginModal();
}

async function signInWithProvider(provider) {
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

async function initialise() {
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    try {
      supabase = await initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      const session = await getCurrentSession();

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
    if (button.dataset.openModeModal !== undefined) {
      event.preventDefault();
      openModeModal();
      return;
    }

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
if (categoryCloseButton) {
  categoryCloseButton.addEventListener('click', closeCategoryModal);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal && !modal.hidden) closeLoginModal();
  if (event.key === 'Escape' && modeModal && !modeModal.hidden) closeModeModal();
  if (event.key === 'Escape' && categoryModal && !categoryModal.hidden) closeCategoryModal();
  trapFocus(event);
});

supabaseInitialisation = initialise();