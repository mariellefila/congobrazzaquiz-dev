import { initSupabase } from '../lib/supabaseClient.js';
import { fetchQuestionCategories } from '../api/adminQuestionsApi.js';
import {
  deleteQuestionImage,
  fetchMyQuestionSubmissions,
  submitQuestionProposal,
  uploadQuestionImage,
  validateQuestionImage,
} from '../api/playerQuestionsApi.js';

const form = document.querySelector('[data-question-submission-form]');
const authState = document.querySelector('[data-question-submission-auth-state]');
const statusMessage = document.querySelector('[data-submission-status]');
const categorySelect = document.querySelector('[name="categorySlug"]');
const submitButton = form?.querySelector('button[type="submit"]');
const mySubmissionsSection = document.querySelector('[data-my-submissions]');
const mySubmissionsList = document.querySelector('[data-my-submissions-list]');
const imageFileInput = document.querySelector('[name="imageFile"]');
const imageUrlInput = document.querySelector('[name="image"]');
const imagePreview = document.querySelector('[data-image-preview]');
const imagePreviewImage = document.querySelector('[data-image-preview-image]');
const imageError = document.querySelector('[data-image-error]');
const imageModeButtons = [...document.querySelectorAll('[data-image-mode]')];
const imagePanels = [...document.querySelectorAll('[data-image-panel]')];
const imageRemoveButton = document.querySelector('[data-image-remove]');
const consentCheckbox = form?.querySelector('[name="publicationConsent"]');

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
  imageMode: 'file',
  selectedFile: null,
  previewUrl: null,
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
    image: state.imageMode === 'url' ? String(data.get('image') || '').trim() : '',
    correctAnswer,
    wrongAnswers,
    options,
  };
}

function setImageError(message = '') {
  if (imageError) imageError.textContent = message;
}

function clearImagePreview() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = null;
  state.selectedFile = null;
  if (imageFileInput) imageFileInput.value = '';
  if (imageUrlInput) imageUrlInput.value = '';
  if (imagePreview) imagePreview.hidden = true;
  if (imagePreviewImage) imagePreviewImage.removeAttribute('src');
  setImageError();
}

function showImagePreview(url) {
  if (!imagePreview || !imagePreviewImage) return;
  imagePreviewImage.src = url;
  imagePreview.hidden = false;
}

function setImageMode(mode) {
  state.imageMode = mode;
  imageModeButtons.forEach((button) => {
    const active = button.dataset.imageMode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  imagePanels.forEach((panel) => {
    panel.hidden = panel.dataset.imagePanel !== mode;
  });
  clearImagePreview();
}

function validateExternalImageUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new Error();
    return null;
  } catch {
    return 'L’URL de l’image doit être une URL HTTPS valide.';
  }
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
  mySubmissionsList.replaceChildren(...submissions.map((submission) => {
    const item = document.createElement('li');
    item.className = 'proposal-history-item';
    item.dataset.status = submission.status;
    const question = document.createElement('span');
    question.className = 'proposal-history-question';
    question.textContent = submission.question;
    item.appendChild(question);
    const status = document.createElement('span');
    status.className = 'proposal-history-status';
    status.textContent = statusLabels[submission.status] || submission.status;
    item.appendChild(status);
    if (submission.image_url) {
      const image = document.createElement('img');
      image.className = 'proposal-history-image';
      image.src = submission.image_url;
      image.alt = 'Illustration de la proposition';
      image.addEventListener('error', () => image.remove());
      item.appendChild(image);
    }
    if (submission.status === 'rejected' && submission.rejection_reason) {
      const reason = document.createElement('span');
      reason.className = 'proposal-history-reason';
      reason.textContent = submission.rejection_reason;
      item.appendChild(reason);
    }
    return item;
  }));
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

imageModeButtons.forEach((button) => {
  button.addEventListener('click', () => setImageMode(button.dataset.imageMode));
});

imageFileInput?.addEventListener('change', () => {
  setImageError();
  const file = imageFileInput.files?.[0] || null;
  if (!file) {
    clearImagePreview();
    return;
  }
  const validation = validateQuestionImage(file);
  if (!validation.valid) {
    imageFileInput.value = '';
    state.selectedFile = null;
    setImageError(validation.error);
    return;
  }
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.selectedFile = file;
  state.previewUrl = URL.createObjectURL(file);
  showImagePreview(state.previewUrl);
});

imageUrlInput?.addEventListener('input', () => {
  const value = imageUrlInput.value.trim();
  const error = validateExternalImageUrl(value);
  setImageError(error || '');
  if (value && !error) showImagePreview(value);
  else if (!value) clearImagePreview();
});

imageRemoveButton?.addEventListener('click', clearImagePreview);

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
      if (!consentCheckbox?.checked) {
        consentCheckbox?.focus();
        throw new Error('Coche la confirmation avant de soumettre ta question.');
      }
      if (state.imageMode === 'url') {
        const urlError = validateExternalImageUrl(values.image);
        if (urlError) throw new Error(urlError);
      }
      if (submitButton) submitButton.disabled = true;
      let storedImagePath = values.image || null;

      if (state.imageMode === 'file' && state.selectedFile) {
        setStatus('Téléversement en cours...');
        const upload = await uploadQuestionImage(state.supabase, state.user.id, state.selectedFile);
        if (upload.error) throw new Error(upload.error.message || 'Le téléversement a échoué.');
        storedImagePath = upload.path;
      }

      setStatus('Envoi en cours...');

      const result = await submitQuestionProposal(state.supabase, {
        playerId: state.playerId,
        userId: state.user.id,
        categorySlug: values.categorySlug,
        question: values.question,
        options: values.options,
        correctAnswer: values.correctAnswer,
        image: storedImagePath,
      });

      if (result?.error || !result?.submission) {
        if (storedImagePath && state.imageMode === 'file') await deleteQuestionImage(state.supabase, storedImagePath);
        throw new Error(result?.error?.message || 'La question n’a pas pu être soumise.');
      }

      form.reset();
      clearImagePreview();
      setImageMode('file');
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
