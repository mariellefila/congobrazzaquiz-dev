import * as quizApi from '../api/quizApi.js';
import * as quizService from '../application/quizService.js';
import { isSupabaseInitialized, getSupabase } from '../lib/supabaseClient.js';

const menuDiv = document.getElementById('menu');
const quizDiv = document.getElementById('quiz');
const timerP = document.getElementById('timer');
const scoreP = document.getElementById('score');
const categoryTitle = document.getElementById('categoryTitle');
const categoryModalClose = document.querySelector('.login-modal-close[aria-label="Fermer la fenêtre des catégories"]');
const authStatus = document.getElementById('authStatus');
const loginGoogleBtn = document.getElementById('loginGoogle');
const loginFacebookBtn = document.getElementById('loginFacebook');
const logoutBtn = document.getElementById('logoutBtn');

let timerInterval = null;
let timeLeft = quizApi.getTimeLimitSeconds();
let currentQuestion = null;
let currentCategory = null;
let totalQuestions = 0;

categoryModalClose?.addEventListener('click', () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = 'index.html';
  }
});

function getDisplayName(user) {
  if (!user) return '';
  const metadataName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name;
  if (metadataName) return metadataName;
  if (user.email) return user.email;
  return 'Joueur';
}

function updateAuthUi(user, isSupabaseReady) {
  if (!authStatus || !loginGoogleBtn || !loginFacebookBtn || !logoutBtn) return;

  if (!isSupabaseReady) {
    authStatus.textContent = 'Mode invité (Supabase non configuré)';
    loginGoogleBtn.hidden = true;
    loginFacebookBtn.hidden = true;
    logoutBtn.hidden = true;
    return;
  }

  if (user) {
    authStatus.textContent = `Connecté: ${getDisplayName(user)}`;
    loginGoogleBtn.hidden = true;
    loginFacebookBtn.hidden = true;
    logoutBtn.hidden = false;
    return;
  }

  authStatus.textContent = 'Mode invité';
  loginGoogleBtn.hidden = false;
  loginFacebookBtn.hidden = false;
  logoutBtn.hidden = true;
}

function getOAuthRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

async function ensurePlayerProfile(supabaseClient, user) {
  if (!user) return;
  const displayName = getDisplayName(user);
  const avatarUrl = user.user_metadata?.avatar_url || null;

  const { error } = await supabaseClient
    .from('players')
    .upsert(
      {
        user_id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.warn('Impossible de synchroniser le profil joueur', error.message);
  }
}

async function loginWithProvider(provider) {
  try {
    if (!isSupabaseInitialized()) return;
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });
    if (error) {
      console.warn(`Connexion ${provider} impossible`, error.message);
    }
  } catch (error) {
    console.warn(`Connexion ${provider} impossible`, error);
  }
}

async function logout() {
  if (!isSupabaseInitialized()) return;
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Déconnexion impossible', error.message);
  }
}

async function wireAuth() {
  if (!loginGoogleBtn || !loginFacebookBtn || !logoutBtn || !authStatus) return;

  loginGoogleBtn.addEventListener('click', async () => {
    await loginWithProvider('google');
  });
  loginFacebookBtn.addEventListener('click', async () => {
    await loginWithProvider('facebook');
  });
  logoutBtn.addEventListener('click', async () => {
    await logout();
  });

  if (!isSupabaseInitialized()) {
    updateAuthUi(null, false);
    return;
  }

  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const currentUser = session?.user || null;
  updateAuthUi(currentUser, true);
  await ensurePlayerProfile(supabase, currentUser);

  supabase.auth.onAuthStateChange(async (_event, nextSession) => {
    const nextUser = nextSession?.user || null;
    updateAuthUi(nextUser, true);
    await ensurePlayerProfile(supabase, nextUser);
  });
}

function renderMenu() {
  categoryTitle.textContent = 'Quiz : Congo-Brazzaville';
  quizDiv.innerHTML = '';
  timerP.textContent = '';
  scoreP.textContent = '';
  menuDiv.innerHTML = `
    <header class="category-modal-header">
      <h2 class="visually-hidden">Choisissez une catégorie :</h2>
      <h3 id="category-modal-title">CHOISISSEZ VOTRE CATÉGORIE</h3>
      <p>Explorez le Congo-Brazzaville à travers nos différentes catégories et testez vos connaissances sur les thèmes qui vous passionnent.</p>
    </header>
    <div class="category-grid" role="list"></div>`;

  const categoryOrder = [
    { dataName: 'Géographie', label: 'Géographie' },
    { dataName: 'Histoire', label: 'Histoire' },
    { dataName: 'Gastronomie', label: 'Gastronomie' },
    { dataName: 'Politique', label: 'Politique' },
    { dataName: 'Littérature', label: 'Littérature' },
    { dataName: 'Tourisme', label: 'Tourisme' },
    { dataName: 'Droit et Société', label: 'Droit & société' },
  ];
  const availableCategories = quizApi.getCategories();
  const categories = categoryOrder
    .map(({ dataName, label }) => {
      const category = availableCategories.find((item) => item.name === dataName);
      return category ? { ...category, name: label } : null;
    })
    .filter(Boolean);
  const grid = menuDiv.querySelector('.category-grid');
  const categoryAssets = {
    'Géographie': 'Géographie.svg',
    Histoire: 'Histoire.svg',
    Gastronomie: 'Gastronomie.svg',
    Politique: 'Politique.svg',
    'Littérature': 'Littérature.svg',
    Tourisme: 'Tourisme.svg',
    'Droit & société': 'Droit  & société.svg',
    Aléatoire: 'Aléatoire.svg',
  };

  [...categories, { name: 'Aléatoire', slug: 'random' }].forEach((category) => {
    const btn = document.createElement('button');
    btn.className = 'category-card';
    btn.type = 'button';
    btn.textContent = category.name;
    btn.addEventListener('click', () => startQuiz(category.slug));
    const asset = document.createElement('img');
    asset.className = 'category-card__asset';
    asset.src = `../rebuild/asette-catégorie/${encodeURIComponent(categoryAssets[category.name])}`;
    asset.alt = '';
    asset.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'category-card__label';
    label.textContent = category.name;
    btn.replaceChildren(asset, label);
    grid.appendChild(btn);
  });
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = quizApi.getTimeLimitSeconds();
  timerP.textContent = `Temps restant : ${timeLeft} secondes`;
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerP.textContent = `Temps restant : ${timeLeft} secondes`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function handleTimeout() {
  const result = quizApi.validateAnswer(currentQuestion.id, null);
  revealCorrectAnswer(null, result.correctOption);
}

function revealCorrectAnswer(selectedBtn, correctOption) {
  const allButtons = Array.from(quizDiv.querySelectorAll('button'));
  allButtons.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.option === correctOption) {
      btn.classList.add('is-correct');
    } else if (btn === selectedBtn) {
      btn.classList.add('is-wrong');
    }
  });
  setTimeout(() => {
    showNextOrFinish();
  }, 1500);
}

function showQuestion(question) {
  quizDiv.innerHTML = '';
  if (!question) {
    showFinalScore();
    return;
  }

  currentQuestion = question;

  const title = document.createElement('h3');
  title.textContent = question.question;
  quizDiv.appendChild(title);

  if (question.image) {
    const img = document.createElement('img');
    img.src = question.image;
    img.alt = 'illustration';
    img.className = 'quiz-image';
    quizDiv.appendChild(img);
  }

  question.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.dataset.option = option;

    const letter = document.createElement('span');
    letter.className = 'quiz-option-index';
    letter.textContent = String.fromCharCode(65 + index);

    const label = document.createElement('span');
    label.className = 'quiz-option-text';
    label.textContent = option;

    btn.appendChild(letter);
    btn.appendChild(label);
    btn.addEventListener('click', () => handleAnswer(option, btn));
    quizDiv.appendChild(btn);
  });

  startTimer();
}

function handleAnswer(option, clickedBtn) {
  clearInterval(timerInterval);
  const result = quizApi.validateAnswer(currentQuestion.id, option);
  const buttons = Array.from(quizDiv.querySelectorAll('button'));
  buttons.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.option === result.correctOption) {
      btn.classList.add('is-correct');
    } else if (btn === clickedBtn) {
      btn.classList.add('is-wrong');
    }
  });
  setTimeout(() => {
    showNextOrFinish();
  }, 1500);
}

function showNextOrFinish() {
  const nextQuestion = quizApi.getNextQuestion();
  if (nextQuestion) {
    showQuestion(nextQuestion);
  } else {
    showFinalScore();
  }
}

function showFinalScore() {
  quizDiv.innerHTML = '<h2>Quiz terminé !</h2>';
  timerP.textContent = '';
  const result = quizApi.getResult();
  scoreP.textContent = `Score : ${result.score} / ${result.total}`;

  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Rejouer';
  restartBtn.className = 'rejouer';
  restartBtn.style.marginTop = '10px';
  restartBtn.addEventListener('click', renderMenu);
  quizDiv.appendChild(restartBtn);

  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Partager sur Facebook';
  shareBtn.className = 'partager';
  shareBtn.addEventListener('click', () => {
    const url = encodeURIComponent('http://congobrazza-quiz.com/');
    const label = currentCategory === 'random' ? 'en mode aléatoire' : `dans la catégorie "${currentCategory}"`;
    const text = encodeURIComponent(`J'ai obtenu un score de ${result.score} / ${result.total} au quiz Congo-Brazzaville ${label} ! 🔥 Teste-toi aussi sur http://congobrazza-quiz.com/`);
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
    window.open(fbUrl, '_blank');
  });
  quizDiv.appendChild(shareBtn);
}

function startQuiz(categorySlug) {
  menuDiv.innerHTML = '';
  const result = quizApi.startQuiz(categorySlug, 10);
  currentCategory = result.category;
  const displayCategory = result.category === 'Droit et Société' ? 'Droit & société' : result.category;
  categoryTitle.textContent = `Quiz : ${displayCategory}`;
  totalQuestions = result.totalQuestions;
  showQuestion(result.currentQuestion);
}

// Initialisation asynchrone : si Supabase est initialisé, précharge les questions
async function initAndRender() {
  await wireAuth();
  if (isSupabaseInitialized()) {
    try {
      await quizService.initWithSupabase(getSupabase(), { includeAnswers: true });
      console.log('Questions préchargées depuis Supabase');
    } catch (e) {
      console.warn('Échec du préchargement Supabase, utilisation locale', e);
    }
  }
  renderMenu();
}

initAndRender();
