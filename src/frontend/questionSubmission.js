import { initSupabase } from '../lib/supabaseClient.js';
import { fetchQuestionCategories } from '../api/adminQuestionsApi.js';
import { fetchMyQuestionSubmissions, submitQuestionProposal } from '../api/playerQuestionsApi.js';

const form = document.querySelector('[data-question-submission-form]');
const authState = document.querySelector('[data-question-submission-auth-state]');
const statusMessage = document.querySelector('[data-submission-status]');
const categorySelect = document.querySelector('[name="categorySlug"]');
const submitButton = form?.querySelector('button[type="submit"]');
const mySubmissionsSection = document.querySelector('[data-my-submissions]');
const mySubmissionsList = document.querySelector('[data-my-submissions-list]');

const statusLabels = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
};

const state = {
  supabase: null,
  user: null,
  playerId: null,
  categories: [],
};

function setStatus(message, isError = false) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.dataset.state = isError ? 'error' : 'success';
}

function populateCategories(categories) {
  if (!categorySelect) return;
  const options = ['<option value="">Choisir une catégorie</option>'];
  categories.forEach((category) => {
    options.push(`<option value="${category.slug}">${category.name}</option>`);
  });
  categorySelect.innerHTML = options.join('');
}

function collectFormValues() {
  if (!form) return null;
  const data = new FormData(form);
  const correctAnswer = String(data.get('correctAnswer') || '').trim();
  const wrongAnswers = ['wrongAnswer1', 'wrongAnswer2', 'wrongAnswer3']
    .map((fieldName) => String(data.get(fieldName) || '').trim())
    .filter(Boolean);
  const options = [correctAnswer, ...wrongAnswers].filter(Boolean);

  return {
    categorySlug: String(data.get('categorySlug') || '').trim(),
    question: String(data.get('question') || '').trim(),
    image: String(data.get('image') || '').trim(),
    correctAnswer,
    wrongAnswers,
    options,
  };
}

function validateValues(values) {
  if (!values) {
    throw new Error('Formulaire incomplet.');
  }
  if (!values.categorySlug) {
    throw new Error('Veuillez choisir une catégorie.');
  }
  if (!values.question || values.question.length < 10) {
    throw new Error('La question doit contenir au moins 10 caractères.');
  }
  if (!values.correctAnswer) {
    throw new Error('La bonne réponse est obligatoire.');
  }
  if (new Set(values.options).size !== values.options.length) {
    throw new Error('Chaque réponse doit être différente.');
  }
  if (values.options.length !== 4) {
    throw new Error('La question doit contenir exactement 4 réponses.');
  }
}

async function loadPlayerProfile() {
  if (!state.supabase || !state.user) return null;

  const { data, error } = await state.supabase
    .from('players')
    .select('id')
    .eq('user_id', state.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  state.playerId = data?.id || null;
  return state.playerId;
}

async function loadCategories() {
  if (!state.supabase) return;
  const { categories, error } = await fetchQuestionCategories(state.supabase);
  if (error) {
    console.error('Catégories indisponibles', error);
    return;
  }
  state.categories = categories || [];
  populateCategories(state.categories);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[character]);
}

function renderMySubmissions(submissions) {
  if (!mySubmissionsSection || !mySubmissionsList) return;
  if (!submissions.length) {
    mySubmissionsSection.hidden = true;
    return;
  }

  mySubmissionsSection.hidden = false;
  mySubmissionsList.innerHTML = submissions.map((submission) => `
    <li class="proposal-history-item" data-status="${escapeHtml(submission.status)}">
      <span class="proposal-history-question">${escapeHtml(submission.question)}</span>
      <span class="proposal-history-status">${escapeHtml(statusLabels[submission.status] || submission.status)}</span>
      ${submission.status === 'rejected' && submission.rejection_reason ? `<span class="proposal-history-reason">${escapeHtml(submission.rejection_reason)}</span>` : ''}
    </li>
  `).join('');
}

async function loadMySubmissions() {
  if (!state.supabase || !state.playerId) return;
  const { submissions, error } = await fetchMyQuestionSubmissions(state.supabase, state.playerId);
  if (error) {
    console.error('Propositions indisponibles', error);
    return;
  }
  renderMySubmissions(submissions || []);
}

async function initialise() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setStatus('La soumission de questions est momentanément indisponible.', true);
    return;
  }

  try {
    state.supabase = await initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { data: sessionData, error } = await state.supabase.auth.getSession();
    if (error) {
      throw error;
    }

    state.user = sessionData?.session?.user || null;

    if (!state.user) {
      if (authState) {
        authState.hidden = false;
        authState.innerHTML = '<p>Connectez-vous pour proposer une question.</p><a href="../index.html" class="proposal-link">Retour à l’accueil</a>';
      }
      if (form) {
        form.hidden = true;
      }
      if (statusMessage) {
        statusMessage.textContent = '';
        statusMessage.hidden = true;
      }
      return;
    }

    if (authState) {
      authState.hidden = true;
    }
    if (form) {
      form.hidden = false;
    }

    await loadCategories();
    await loadPlayerProfile();
    await loadMySubmissions();

    if (!state.playerId && submitButton) {
      submitButton.disabled = true;
      setStatus('Votre profil joueur est indisponible. Veuillez réessayer dans quelques instants.', true);
    }
  } catch (error) {
    console.error('Initialisation de la proposition de question impossible', error);
    setStatus('La soumission est momentanément indisponible.', true);
  }
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.supabase || !state.user || !state.playerId) {
      setStatus('Connectez-vous pour proposer une question.', true);
      return;
    }

    try {
      const values = collectFormValues();
      validateValues(values);
      if (submitButton) submitButton.disabled = true;
      setStatus('Envoi de votre question en cours...');

      const result = await submitQuestionProposal(state.supabase, {
        playerId: state.playerId,
        categorySlug: values.categorySlug,
        question: values.question,
        options: values.options,
        correctAnswer: values.correctAnswer,
        image: values.image,
      });

      if (result?.error || !result?.submission) {
        throw new Error(result?.error?.message || 'La question n’a pas pu être soumise.');
      }

      form.reset();
      setStatus('Question soumise. Elle sera vérifiée avant publication.');
      await loadMySubmissions();
    } catch (error) {
      console.error('Soumission invalide', error);
      setStatus(error.message || 'La question n’a pas pu être soumise.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

initialise();
