import { initSupabase } from '../lib/supabaseClient.js';
import { fetchDashboardData } from '../api/adminDashboardApi.js';
import { requireAdminAccess } from './adminAccess.js';

const shell = document.querySelector('[data-admin-shell]');
const authState = document.querySelector('[data-admin-auth-state]');
const authMessage = document.querySelector('[data-admin-auth-message]');
const statusMessage = document.querySelector('[data-admin-status]');
const kpiNodes = document.querySelectorAll('[data-kpi]');
const recentQuestions = document.querySelector('[data-recent-questions]');
const recentAds = document.querySelector('[data-recent-ads]');
const emptyQuestions = document.querySelector('[data-empty-questions]');
const emptyAds = document.querySelector('[data-empty-ads]');

const numberFormatter = new Intl.NumberFormat('fr-FR');

const questionStatusLabels = {
  approved: 'Approuvée',
  pending: 'En attente',
  rejected: 'Refusée',
  draft: 'Brouillon',
};

const adStatusLabels = {
  active: 'Active',
  scheduled: 'Programmée',
  inactive: 'Inactive',
  ended: 'Terminée',
};

function setAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}

function setDashboardStatus(state) {
  if (!statusMessage) return;
  if (state === 'loading') {
    statusMessage.textContent = 'Chargement du dashboard...';
    return;
  }
  if (state === 'error') {
    statusMessage.textContent = 'Certaines données du dashboard n\'ont pas pu être chargées.';
    return;
  }
  statusMessage.textContent = '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[char]);
}

function renderStats(stats) {
  kpiNodes.forEach((node) => {
    const key = node.dataset.kpi;
    const value = stats[key];
    node.textContent = value === null || value === undefined ? '—' : numberFormatter.format(value);
  });
}

function renderQuestions(questions) {
  if (!recentQuestions || !emptyQuestions) return;
  recentQuestions.innerHTML = '';
  emptyQuestions.hidden = Array.isArray(questions) && questions.length > 0;

  if (!Array.isArray(questions)) return;

  questions.forEach((question) => {
    const status = question.status || 'approved';
    const item = document.createElement('li');
    item.className = 'bo-list-item';
    item.innerHTML = `
      <span class="bo-list-media">${question.image ? `<img src="${escapeHtml(question.image)}" alt="" />` : '<span aria-hidden="true">?</span>'}</span>
      <span class="bo-list-content">
        <strong>${escapeHtml(question.text)}</strong>
        <small>${escapeHtml(question.category)}${question.author ? ` • Par ${escapeHtml(question.author)}` : ''}</small>
      </span>
      <span class="bo-badge bo-badge--${escapeHtml(status)}">${questionStatusLabels[status] || questionStatusLabels.approved}</span>
    `;
    recentQuestions.append(item);
  });
}

function renderAdvertisements(advertisements) {
  if (!recentAds || !emptyAds) return;
  recentAds.innerHTML = '';
  emptyAds.hidden = Array.isArray(advertisements) && advertisements.length > 0;

  if (!Array.isArray(advertisements)) return;

  advertisements.forEach((ad) => {
    const status = ad.status || 'inactive';
    const item = document.createElement('li');
    item.className = 'bo-list-item';
    item.innerHTML = `
      <span class="bo-list-media bo-list-media--ad">${ad.thumbnail ? `<img src="${escapeHtml(ad.thumbnail)}" alt="" />` : '<span aria-hidden="true">◔</span>'}</span>
      <span class="bo-list-content">
        <strong>${escapeHtml(ad.name)}</strong>
        <small>${escapeHtml(ad.period || 'Période non renseignée')}</small>
      </span>
      <span class="bo-badge bo-badge--${escapeHtml(status)}">${adStatusLabels[status] || adStatusLabels.inactive}</span>
    `;
    recentAds.append(item);
  });
}

async function initialise() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setAuthMessage('Supabase n’est pas configuré. Accès back-office indisponible.');
    return;
  }

  try {
    const supabase = await initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { user, admin } = await requireAdminAccess(supabase);
    if (!user) {
      setAuthMessage('Connectez-vous avec un compte administrateur pour accéder au back-office.');
      return;
    }

    if (!admin) {
      setAuthMessage('Accès réservé aux administrateurs.');
      return;
    }

    if (authState) authState.hidden = true;
    if (shell) shell.hidden = false;
    setDashboardStatus('loading');

    const dashboardData = await fetchDashboardData(supabase);
    if (dashboardData.errors.length > 0) {
      console.error('Certaines requêtes Supabase du dashboard ont échoué', dashboardData.errors);
    }
    renderStats(dashboardData.stats);
    renderQuestions(dashboardData.questions);
    renderAdvertisements(dashboardData.advertisements);
    setDashboardStatus(dashboardData.errors.length > 0 ? 'error' : 'success');
  } catch (error) {
    console.error('Dashboard back-office indisponible', error);
    if (shell && !shell.hidden) {
      setDashboardStatus('error');
      return;
    }
    setAuthMessage(error.source === 'admin_users'
      ? 'Impossible de vérifier votre accès administrateur pour le moment.'
      : 'Impossible de charger le back-office pour le moment.');
  }
}

initialise();