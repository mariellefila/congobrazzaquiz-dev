import { getSupabase, initSupabase } from '../lib/supabaseClient.js';

const pendingDestinationKey = 'cbq.pendingDestination';
const ctaButtons = [...document.querySelectorAll('[data-protected-destination]')];
const modal = document.querySelector('[data-login-modal]');
const backdrop = document.querySelector('[data-login-backdrop]');
const closeButton = document.querySelector('[data-login-close]');
const providerButtons = [...document.querySelectorAll('[data-login-provider]')];
const statusMessage = document.querySelector('[data-login-status]');
let pendingDestination = sessionStorage.getItem(pendingDestinationKey);
let previouslyFocusedElement = null;
let supabase = null;

function setStatus(message) {
  if (statusMessage) statusMessage.textContent = message;
}

function setActiveCta(activeButton) {
  ctaButtons.forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function getFocusableElements() {
  return [closeButton, ...providerButtons, ...modal.querySelectorAll('a[href]')].filter(Boolean);
}

function openLoginModal() {
  previouslyFocusedElement = document.activeElement;
  modal.hidden = false;
  backdrop.hidden = false;
  document.body.classList.add('login-modal-open');
  closeButton.focus();
}

function closeLoginModal() {
  modal.hidden = true;
  backdrop.hidden = true;
  document.body.classList.remove('login-modal-open');
  setStatus('');
  pendingDestination = null;
  sessionStorage.removeItem(pendingDestinationKey);
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = null;
}

async function getCurrentSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function handleProtectedNavigation(destination, clickedButton) {
  setActiveCta(clickedButton);
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
  if (!supabase) {
    setStatus('La connexion est momentanément indisponible.');
    return;
  }

  providerButtons.forEach((button) => {
    button.disabled = true;
  });
  setStatus('Redirection vers le service de connexion...');

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.href.split('#')[0] },
  });

  if (error) {
    providerButtons.forEach((button) => {
      button.disabled = false;
    });
    setStatus('La connexion a échoué. Veuillez réessayer.');
    console.error('Échec de la connexion OAuth', error);
  }
}

function trapFocus(event) {
  if (event.key !== 'Tab' || modal.hidden) return;
  const focusableElements = getFocusableElements();
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

async function initialise() {
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    try {
      supabase = await initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      const session = await getCurrentSession();
      if (session && pendingDestination) {
        const destination = pendingDestination;
        sessionStorage.removeItem(pendingDestinationKey);
        pendingDestination = null;
        window.location.href = destination;
      }
    } catch (error) {
      console.warn('Supabase n’est pas disponible sur la landing', error);
    }
  }
}

ctaButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    handleProtectedNavigation(button.dataset.protectedDestination, button);
  });
});

providerButtons.forEach((button) => {
  button.addEventListener('click', () => signInWithProvider(button.dataset.loginProvider));
});

closeButton.addEventListener('click', closeLoginModal);
backdrop.addEventListener('click', closeLoginModal);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.hidden) closeLoginModal();
  trapFocus(event);
});

initialise();