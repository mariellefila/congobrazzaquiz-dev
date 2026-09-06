import { initSupabase } from '../lib/supabaseClient.js';
import {
  fetchAdminQuestionDetail,
  fetchQuestionCategories,
  fetchQuestionCounts,
  fetchQuestionsForAdmin,
} from '../api/adminQuestionsApi.js';
import { requireAdminAccess } from './adminAccess.js';

const PAGE_SIZE = 10;
const shell = document.querySelector('[data-admin-shell]');
const authState = document.querySelector('[data-admin-auth-state]');
const authMessage = document.querySelector('[data-admin-auth-message]');
const statusMessage = document.querySelector('[data-questions-status]');
const tabs = [...document.querySelectorAll('[data-question-tab]')];
const countNodes = document.querySelectorAll('[data-question-count]');
const searchInput = document.querySelector('[data-question-search]');
const categorySelect = document.querySelector('[data-question-category]');
const statusSelect = document.querySelector('[data-question-status-filter]');
const list = document.querySelector('[data-question-list]');
const emptyState = document.querySelector('[data-questions-empty]');
const detail = document.querySelector('[data-question-detail]');
const pagination = document.querySelector('[data-question-pagination]');
const previousButton = document.querySelector('[data-page-previous]');
const nextButton = document.querySelector('[data-page-next]');
const pageIndicator = document.querySelector('[data-page-indicator]');

const state = {
  supabase: null,
  status: 'all',
  categoryIds: [],
  search: '',
  page: 0,
  total: 0,
  selected: null,
};

const statusLabels = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[character]);
}

function formatDate(value) {
  if (!value) return 'Date non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function setAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}

function setStatus(stateName) {
  if (!statusMessage) return;
  if (stateName === 'loading') statusMessage.textContent = 'Chargement des questions...';
  else if (stateName === 'error') statusMessage.textContent = 'Certaines questions n\'ont pas pu être chargées.';
  else statusMessage.textContent = '';
}

function renderCounts(counts) {
  countNodes.forEach((node) => {
    node.textContent = counts[node.dataset.questionCount] ?? '—';
  });
}

function renderQuestionList(questions) {
  list.innerHTML = '';
  emptyState.hidden = questions.length > 0;

  questions.forEach((question) => {
    const row = document.createElement('article');
    row.className = `bo-question-row${state.selected?.id === question.id && state.selected?.source === question.source ? ' is-selected' : ''}`;
    row.innerHTML = `
      <span class="bo-list-media">${question.image ? `<img src="${escapeHtml(question.image)}" alt="" />` : '<span aria-hidden="true">?</span>'}</span>
      <span class="bo-question-row-copy">
        <strong>${escapeHtml(question.text)}</strong>
        <small>${escapeHtml(question.category)}${question.author ? ` • Par ${escapeHtml(question.author)}` : ''}</small>
        <time datetime="${escapeHtml(question.createdAt)}">${escapeHtml(formatDate(question.createdAt))}</time>
      </span>
      <span class="bo-badge bo-badge--${escapeHtml(question.status)}">${statusLabels[question.status]}</span>
      <button type="button" data-examine-source="${escapeHtml(question.source)}" data-examine-id="${escapeHtml(question.id)}">Examiner <span aria-hidden="true">›</span></button>
    `;
    list.append(row);
  });
}

function renderDetail(question) {
  if (!question) {
    detail.innerHTML = '<p class="bo-empty">Question introuvable.</p>';
    return;
  }

  const options = Array.isArray(question.options) ? question.options : [];
  const image = question.image
    ? `<img class="bo-question-detail-image" src="${escapeHtml(question.image)}" alt="" />`
    : '';
  const answers = options.length
    ? options.map((option) => `<li class="${option === question.answer ? 'is-correct' : ''}"><span aria-hidden="true">${option === question.answer ? '✓' : '○'}</span>${escapeHtml(option)}</li>`).join('')
    : '<li>Aucune réponse disponible.</li>';

  detail.innerHTML = `
    <div class="bo-detail-badges"><span class="bo-badge bo-badge--${escapeHtml(question.status)}">${statusLabels[question.status]}</span><span class="bo-detail-category">${escapeHtml(question.category)}</span></div>
    ${image}
    <h2>${escapeHtml(question.text)}</h2>
    <dl class="bo-detail-meta">
      <div><dt>Auteur</dt><dd>${escapeHtml(question.author || 'Non renseigné')}</dd></div>
      <div><dt>Soumise le</dt><dd>${escapeHtml(formatDate(question.createdAt))}</dd></div>
    </dl>
    <section><h3>Réponses proposées</h3><ul class="bo-detail-answers">${answers}</ul></section>
    <section class="bo-detail-actions"><h3>Actions</h3><div><button type="button" disabled>Approuver</button><button type="button" disabled>Refuser</button><button type="button" disabled>Modifier</button></div></section>
  `;
}

function renderPagination() {
  const pages = Math.ceil(state.total / PAGE_SIZE);
  pagination.hidden = pages <= 1;
  previousButton.disabled = state.page === 0;
  nextButton.disabled = state.page >= pages - 1;
  pageIndicator.textContent = `Page ${state.page + 1} sur ${pages}`;
}

async function examineQuestion(source, id) {
  const result = await fetchAdminQuestionDetail(state.supabase, source, id);
  if (result.errors.length) {
    console.error('Impossible de charger le détail de la question', result.errors);
    detail.innerHTML = '<p class="bo-empty">Le détail de cette question n\'a pas pu être chargé.</p>';
    return;
  }
  state.selected = result.question;
  renderDetail(result.question);
  await loadQuestions();
}

async function loadQuestions() {
  setStatus('loading');
  const result = await fetchQuestionsForAdmin(state.supabase, {
    status: state.status,
    categoryIds: state.categoryIds,
    search: state.search,
    limit: PAGE_SIZE,
    offset: state.page * PAGE_SIZE,
  });

  if (result.errors.length) {
    console.error('Impossible de charger la liste des questions', result.errors);
    list.innerHTML = '';
    emptyState.hidden = true;
    state.total = 0;
    renderPagination();
    setStatus('error');
    return;
  }

  state.total = result.total;
  renderQuestionList(result.questions);
  renderPagination();
  setStatus('success');
}

async function initialise() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setAuthMessage('Supabase n’est pas configuré. Accès back-office indisponible.');
    return;
  }

  try {
    state.supabase = await initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { user, admin } = await requireAdminAccess(state.supabase);
    if (!user) {
      setAuthMessage('Connectez-vous avec un compte administrateur pour accéder au back-office.');
      return;
    }
    if (!admin) {
      setAuthMessage('Accès réservé aux administrateurs.');
      return;
    }

    authState.hidden = true;
    shell.hidden = false;
    const [categoriesResult, countsResult] = await Promise.all([
      fetchQuestionCategories(state.supabase),
      fetchQuestionCounts(state.supabase),
    ]);

    if (categoriesResult.error || countsResult.errors.length) {
      console.error('Impossible de charger les filtres ou compteurs Questions', {
        categories: categoriesResult.error,
        counts: countsResult.errors,
      });
      setStatus('error');
    }

    if (categoriesResult.categories) {
      categoriesResult.categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.dataset.slug = category.slug;
        option.textContent = category.name;
        categorySelect.append(option);
      });
    }
    if (countsResult.counts) renderCounts(countsResult.counts);

    await loadQuestions();
  } catch (error) {
    console.error('Page Questions back-office indisponible', error);
    setAuthMessage(error.source === 'admin_users'
      ? 'Impossible de vérifier votre accès administrateur pour le moment.'
      : 'Impossible de charger le back-office pour le moment.');
  }
}

tabs.forEach((tab) => {
  tab.addEventListener('click', async () => {
    state.status = tab.dataset.questionTab;
    state.page = 0;
    statusSelect.value = state.status;
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    await loadQuestions();
  });
});

searchInput.addEventListener('input', async () => {
  state.search = searchInput.value;
  state.page = 0;
  await loadQuestions();
});

categorySelect.addEventListener('change', async () => {
  const selectedOption = categorySelect.options[categorySelect.selectedIndex];
  state.categoryIds = categorySelect.value ? [categorySelect.value, selectedOption.dataset.slug] : [];
  state.page = 0;
  await loadQuestions();
});

statusSelect.addEventListener('change', async () => {
  state.status = statusSelect.value;
  state.page = 0;
  tabs.forEach((tab) => {
    const active = tab.dataset.questionTab === state.status;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  await loadQuestions();
});

list.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-examine-id]');
  if (button) await examineQuestion(button.dataset.examineSource, button.dataset.examineId);
});

previousButton.addEventListener('click', async () => {
  if (state.page === 0) return;
  state.page -= 1;
  await loadQuestions();
});

nextButton.addEventListener('click', async () => {
  if ((state.page + 1) * PAGE_SIZE >= state.total) return;
  state.page += 1;
  await loadQuestions();
});

initialise();
