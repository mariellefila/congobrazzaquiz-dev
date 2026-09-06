import { initSupabase } from '../lib/supabaseClient.js';
import {
  fetchAdminQuestionDetail,
  fetchQuestionCategories,
  updateAdminQuestion,
} from '../api/adminQuestionsApi.js';
import { requireAdminAccess } from './adminAccess.js';
import { buildQuestionUpdatePayload } from './adminQuestionForm.js';

const params = new URLSearchParams(window.location.search);
const source = params.get('source');
const id = params.get('id');
const shell = document.querySelector('[data-admin-shell]');
const authState = document.querySelector('[data-admin-auth-state]');
const authMessage = document.querySelector('[data-admin-auth-message]');
const statusMessage = document.querySelector('[data-edit-status]');
const sourceLabel = document.querySelector('[data-edit-source-label]');
const form = document.querySelector('[data-question-edit-form]');
const categorySelect = document.querySelector('[data-edit-category]');
const imageField = document.querySelector('[data-edit-image-field]');
let supabase = null;
let currentQuestion = null;

function setStatus(message) {
  if (statusMessage) statusMessage.textContent = message;
}

function setAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}

function setField(name, value) {
  form.elements[name].value = value || '';
}

function populateForm(question, categories) {
  currentQuestion = question;
  sourceLabel.textContent = question.source === 'submission' ? 'Proposition de question' : 'Question publiée';
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = question.source === 'submission' ? category.slug : category.id;
    option.textContent = category.name;
    categorySelect.append(option);
  });

  setField('question', question.question);
  setField('categoryId', question.categoryId);
  setField('correctAnswer', question.correctAnswer);
  setField('wrongAnswer1', question.wrongAnswers[0]);
  setField('wrongAnswer2', question.wrongAnswers[1]);
  setField('wrongAnswer3', question.wrongAnswers[2]);
  setField('image', question.image);
  imageField.hidden = question.source === 'submission';
  form.hidden = false;
  setStatus('');
}

async function initialise() {
  if (!['published', 'submission'].includes(source) || !id) {
    setAuthMessage('Question non identifiée. Retournez à la liste des questions.');
    return;
  }
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setAuthMessage('Supabase n’est pas configuré. Accès back-office indisponible.');
    return;
  }

  try {
    supabase = await initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { user, admin } = await requireAdminAccess(supabase);
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
    const [questionResult, categoriesResult] = await Promise.all([
      fetchAdminQuestionDetail(supabase, source, id),
      fetchQuestionCategories(supabase),
    ]);
    if (questionResult.errors.length || categoriesResult.error || !questionResult.question) {
      console.error('Impossible de charger la question à modifier', { question: questionResult.errors, categories: categoriesResult.error });
      setStatus('La question n’a pas pu être chargée.');
      return;
    }

    populateForm(questionResult.question, categoriesResult.categories);
  } catch (error) {
    console.error('Édition de question indisponible', error);
    setAuthMessage(error.source === 'admin_users'
      ? 'Impossible de vérifier votre accès administrateur pour le moment.'
      : 'Impossible de charger le back-office pour le moment.');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const payload = buildQuestionUpdatePayload(form, currentQuestion);
    if (!payload.question || !payload.categoryId || !payload.correctAnswer) {
      setStatus('Les champs question, catégorie et bonne réponse sont obligatoires.');
      return;
    }

    setStatus('Enregistrement des modifications...');
    const result = await updateAdminQuestion(supabase, payload);
    if (result.error || result.errors?.length) {
      console.error('Impossible d’enregistrer la question', result.error || result.errors);
      setStatus('Les modifications n’ont pas pu être enregistrées.');
      return;
    }

    window.location.href = `pages/admin/questions.html?source=${encodeURIComponent(result.question.source)}&id=${encodeURIComponent(result.question.id)}&updated=1`;
  } catch (error) {
    console.error('Formulaire de question invalide', error);
    setStatus(error.message || 'Les modifications n’ont pas pu être enregistrées.');
  }
});

initialise();
