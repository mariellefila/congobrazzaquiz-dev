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
let currentCategorySlug = null;
let totalQuestions = 0;
let currentQuestionNumber = 0;
let currentScore = 0;
let questionStartedAt = null;

const categoryMetadata = {
  'Géographie': { emoji: '🌍', asset: 'Géographie.svg' },
  Histoire: { emoji: '🛕', asset: 'Histoire.svg' },
  Gastronomie: { emoji: '🍲', asset: 'Gastronomie.svg' },
  Politique: { emoji: '🏛️', asset: 'Politique.svg' },
  'Littérature': { emoji: '📚', asset: 'Littérature.svg' },
  Tourisme: { emoji: '✈️', asset: 'Tourisme.svg' },
  'Droit & société': { emoji: '⚖️', asset: 'Droit  & société.svg' },
  Aléatoire: { emoji: '🎲', asset: 'Aléatoire.svg' },
};

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
  document.body.classList.remove('quiz-mode');
  document.body.classList.remove('quiz-result-mode');
  categoryTitle.textContent = 'Quiz : Congo-Brazzaville';
  quizDiv.innerHTML = '';
  quizDiv.className = '';
  timerP.textContent = '';
  scoreP.textContent = '';
  document.querySelector('.category-modal')?.append(timerP, scoreP);
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
  [...categories, { name: 'Aléatoire', slug: 'random' }].forEach((category) => {
    const btn = document.createElement('button');
    btn.className = 'category-card';
    btn.type = 'button';
    const metadata = categoryMetadata[category.name];
    btn.dataset.category = category.slug;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      btn.classList.add('is-selected');
      btn.setAttribute('aria-pressed', 'true');
      startQuiz(category.slug);
    });
    const asset = document.createElement('img');
    asset.className = 'category-card__asset';
    asset.src = `../rebuild/asette-catégorie/${encodeURIComponent(metadata.asset)}`;
    asset.alt = '';
    asset.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'category-card__label';
    label.textContent = category.name;
    label.dataset.emoji = metadata.emoji;
    btn.replaceChildren(asset, label);
    grid.appendChild(btn);
  });
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = quizApi.getTimeLimitSeconds();
  questionStartedAt = Date.now();
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
  const result = quizApi.validateAnswer(currentQuestion.id, null, getElapsedQuestionSeconds());
  revealCorrectAnswer(null, result.correctOption);
}

function getElapsedQuestionSeconds() {
  if (!questionStartedAt) return 0;
  return Math.min(quizApi.getTimeLimitSeconds(), (Date.now() - questionStartedAt) / 1000);
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
  quizDiv.className = 'quiz-stage quiz-stage--active';
  if (!question) {
    showFinalScore();
    return;
  }

  currentQuestion = question;

  const progress = document.createElement('div');
  progress.className = 'quiz-progress';
  progress.innerHTML = `
    <div class="quiz-progress__topline">
      <strong>Questions ${currentQuestionNumber}/${totalQuestions}</strong>
      <span class="quiz-score">${currentScore.toLocaleString('fr-FR')} pts</span>
    </div>
    <div class="quiz-progress__track" aria-hidden="true">
      <span style="width: ${(currentQuestionNumber / totalQuestions) * 100}%"></span>
    </div>`;
  quizDiv.appendChild(progress);

  const categoryBadge = document.createElement('div');
  categoryBadge.className = 'quiz-category-badge';
  const categoryName = currentCategory === 'Droit et Société' ? 'Droit & société' : currentCategory;
  const categoryDetails = categoryMetadata[categoryName];
  categoryBadge.dataset.category = categoryName;
  categoryBadge.innerHTML = `<span aria-hidden="true">${categoryDetails?.emoji || ''}</span><span>${categoryName}</span>`;
  quizDiv.appendChild(categoryBadge);

  const title = document.createElement('h3');
  title.className = 'quiz-question';
  title.textContent = question.question;
  quizDiv.appendChild(title);

  quizDiv.appendChild(timerP);

  if (question.image) {
    const img = document.createElement('img');
    img.src = question.image;
    img.alt = 'illustration';
    img.className = 'quiz-image';
    quizDiv.appendChild(img);
  }

  const answers = document.createElement('div');
  answers.className = 'quiz-answers';
  answers.setAttribute('role', 'group');
  answers.setAttribute('aria-label', 'Réponses possibles');

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
    answers.appendChild(btn);
  });

  quizDiv.appendChild(answers);

  startTimer();
}

function handleAnswer(option, clickedBtn) {
  clearInterval(timerInterval);
  const result = quizApi.validateAnswer(currentQuestion.id, option, getElapsedQuestionSeconds());
  if (result.correct) currentScore += 100;
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
    currentQuestionNumber += 1;
    showQuestion(nextQuestion);
  } else {
    showFinalScore();
  }
}

function showFinalScore() {
  document.body.classList.add('quiz-result-mode');
  quizDiv.className = 'quiz-stage quiz-stage--finished';
  timerP.textContent = '';
  const result = quizApi.getResult();
  const averageTime = result.averageTimeSeconds.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const shareText = `J'ai obtenu ${result.score} points à Congo Brazza Quiz !`;
  const shareUrl = window.location.origin;

  quizDiv.innerHTML = `
    <div class="solo-result-category quiz-category-badge" data-category="${currentCategory}">
      <span aria-hidden="true">${categoryMetadata[currentCategory]?.emoji || ''}</span>
      <strong>${currentCategory}</strong>
    </div>
    <div class="solo-result-heading">
      <span class="solo-result-laurel" aria-hidden="true">❮</span>
      <div>
        <h2 class="solo-result-title">Félicitation ! Vous avez terminé le quiz.</h2>
        <p class="solo-result-score"><strong>${result.score}</strong><span>PTS</span></p>
      </div>
      <span class="solo-result-laurel solo-result-laurel-right" aria-hidden="true">❮</span>
    </div>
    <div class="solo-result-stats">
      <article><span aria-hidden="true">✓</span><strong>${result.correctAnswers}/${result.total}</strong><small>Bonnes réponses</small></article>
      <article><span aria-hidden="true">◷</span><strong>${averageTime} s</strong><small>Temps moyen<br />par question</small></article>
      <article><span aria-hidden="true">★</span><strong>—</strong><small>Position au classement</small></article>
    </div>
    <a class="solo-result-primary" href="pages/leaderboard.html">▥ &nbsp; Voir le classement &nbsp; →</a>
    <div class="solo-result-actions">
      <button class="solo-result-secondary" type="button" data-result-replay>◷ &nbsp; Rejouer</button>
      <button class="solo-result-secondary" type="button" data-result-category>▦ &nbsp; Changer de catégorie</button>
    </div>
    <p class="solo-result-share-label">Partager mon score</p>
    <div class="solo-result-share" role="group" aria-label="Partager le score">
      <button type="button" data-share-facebook aria-label="Partager sur Facebook"><img src="images/brand/facebook-icon.svg" alt="" /></button>
      <button type="button" data-share-whatsapp aria-label="Partager sur WhatsApp">◉</button>
      <button type="button" data-share-native aria-label="Partager"><span aria-hidden="true">⇧</span></button>
    </div>`;
  scoreP.textContent = '';

  const openFacebook = () => {
    const params = new URLSearchParams({ u: shareUrl, quote: shareText });
    window.open(`https://www.facebook.com/sharer/sharer.php?${params}`, '_blank');
  };
  quizDiv.querySelector('[data-share-facebook]').addEventListener('click', openFacebook);
  quizDiv.querySelector('[data-share-whatsapp]').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
  });
  quizDiv.querySelector('[data-share-native]').addEventListener('click', async () => {
    if (navigator.share) await navigator.share({ title: 'Congo Brazza Quiz', text: shareText, url: shareUrl });
  });
  quizDiv.querySelector('[data-result-replay]').addEventListener('click', () => startQuiz(currentCategorySlug));
  quizDiv.querySelector('[data-result-category]').addEventListener('click', renderMenu);
}

function startQuiz(categorySlug) {
  document.body.classList.add('quiz-mode');
  menuDiv.innerHTML = '';
  const result = quizApi.startQuiz(categorySlug, 10);
  currentCategorySlug = categorySlug;
  currentCategory = result.category;
  currentQuestionNumber = 1;
  currentScore = 0;
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
