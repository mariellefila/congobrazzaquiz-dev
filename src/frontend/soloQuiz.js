import * as quizApi from '../api/quizApi.js';
import { isSupabaseInitialized, getSupabase } from '../lib/supabaseClient.js';
import { recordSoloGame } from '../api/playerProfile.js';

const titleEl = document.getElementById('soloQuizTitle');
const quizEl = document.getElementById('soloQuiz');
const timerEl = document.getElementById('soloTimer');
const scoreEl = document.getElementById('soloScore');
const progressEl = document.getElementById('soloQuizProgress');
const progressBarEl = document.getElementById('soloQuizProgressBar');
const scoreBadgeEl = document.getElementById('soloQuizScore');
const nextButton = document.querySelector('[data-solo-quiz-next]');
const backButton = document.querySelector('[data-solo-quiz-back]');
const categoryStage = document.querySelector('[data-category-stage]');
const quizStage = document.querySelector('[data-quiz-stage]');

let timerInterval = null;
let timeLeft = 0;
let currentQuestion = null;
let currentCategory = null;
let currentCategorySlug = null;
let currentQuestionNumber = 0;
let totalQuestions = 0;
let transitionPending = false;
let answerResults = [];

const categoryMetadata = {
  Histoire: '🛕',
  'Géographie': '🌍',
  Gastronomie: '🍲',
  Politique: '🏛️',
  'Littérature': '📚',
  Tourisme: '✈️',
  'Droit & société': '⚖️',
  Aléatoire: '🎲',
};

function updateScoreDisplay() {
  const result = quizApi.getResult();
  if (scoreBadgeEl) scoreBadgeEl.textContent = `${result.score} pts`;
}

function updateProgressDisplay() {
  if (progressEl) progressEl.textContent = `Questions ${currentQuestionNumber}/${totalQuestions}`;
  if (progressBarEl) progressBarEl.style.width = `${(currentQuestionNumber / totalQuestions) * 100}%`;
}

function formatTime(seconds) {
  return `00:${String(Math.max(seconds, 0)).padStart(2, '0')} seconde`;
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = quizApi.getTimeLimitSeconds();
  timerEl.textContent = formatTime(timeLeft);
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerEl.textContent = formatTime(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function handleTimeout() {
  const result = quizApi.validateAnswer(currentQuestion.id, null);
  answerResults.push(false);
  revealCorrectAnswer(null, result.correctOption);
}

function markOption(btn, symbol, label) {
  const mark = document.createElement('span');
  mark.className = 'quiz-option-mark';
  mark.textContent = symbol;
  mark.setAttribute('aria-label', label);
  btn.appendChild(mark);
}

function revealCorrectAnswer(selectedBtn, correctOption) {
  transitionPending = true;
  const allButtons = Array.from(quizEl.querySelectorAll('button'));
  allButtons.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.option === correctOption) {
      btn.classList.add('is-correct');
      markOption(btn, '✓', 'Bonne réponse');
    } else if (btn === selectedBtn) {
      btn.classList.add('is-wrong');
      markOption(btn, '✕', 'Mauvaise réponse');
    }
  });
  if (nextButton) {
    nextButton.hidden = false;
    nextButton.disabled = false;
  }
  setTimeout(showNextOrFinish, 1500);
}

function showQuestion(question) {
  quizEl.innerHTML = '';
  if (!question) {
    showFinalScore();
    return;
  }

  currentQuestion = question;

  const categoryName = currentCategory === 'Droit et Société' ? 'Droit & société' : currentCategory;
  const categoryBadge = document.createElement('div');
  categoryBadge.className = 'solo-quiz-category';
  categoryBadge.dataset.category = categoryName;
  categoryBadge.innerHTML = `<span aria-hidden="true">${categoryMetadata[categoryName] || ''}</span><strong>${categoryName}</strong>`;
  quizEl.appendChild(categoryBadge);

  // Groups title + timer + answers as a single block centered on the card
  const content = document.createElement('div');
  content.className = 'solo-quiz-content';

  const title = document.createElement('h3');
  title.className = 'solo-quiz-question';
  title.textContent = question.question;
  content.appendChild(title);

  content.appendChild(timerEl);

  if (question.image) {
    const img = document.createElement('img');
    img.src = question.image;
    img.alt = 'illustration';
    img.className = 'quiz-image';
    content.appendChild(img);
  }

  const answers = document.createElement('div');
  answers.className = 'solo-quiz-answers';
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

  content.appendChild(answers);
  quizEl.appendChild(content);

  if (nextButton) {
    nextButton.hidden = false;
    nextButton.disabled = true;
  }
  updateProgressDisplay();
  updateScoreDisplay();

  startTimer();
}

function handleAnswer(option, clickedBtn) {
  clearInterval(timerInterval);
  const result = quizApi.validateAnswer(currentQuestion.id, option);
  answerResults.push(Boolean(result.correct));
  updateScoreDisplay();
  revealCorrectAnswer(clickedBtn, result.correctOption);
}

function showNextOrFinish() {
  if (!transitionPending) return;
  transitionPending = false;
  if (nextButton) {
    nextButton.hidden = false;
    nextButton.disabled = true;
  }
  const nextQuestion = quizApi.getNextQuestion();
  if (nextQuestion) {
    currentQuestionNumber += 1;
    showQuestion(nextQuestion);
  } else {
    showFinalScore();
  }
}

// Persiste la partie terminée pour alimenter le profil joueur (XP, série, badges).
async function persistSoloGame(result) {
  if (answerResults.length === 0 || !isSupabaseInitialized()) return;
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;
    await recordSoloGame(supabase, {
      categorySlug: currentCategorySlug,
      categoryName: currentCategory,
      score: result.score,
      results: answerResults,
    });
  } catch (error) {
    console.warn('Partie solo non enregistrée', error);
  }
}

function showFinalScore() {
  document.body.classList.add('solo-result-mode');
  timerEl.textContent = '';
  if (nextButton) nextButton.hidden = true;
  const result = quizApi.getResult();
  persistSoloGame(result);
  const averageTime = result.averageTimeSeconds
    ? result.averageTimeSeconds.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : '—';
  const shareText = `J'ai obtenu ${result.score} points à Congo Brazza Quiz !`;
  const shareUrl = window.location.origin;
  const badgeCategory = currentCategory === 'Droit et Société' ? 'Droit & société' : currentCategory;
  // Certains fichiers de rebuild/résultat/ sont enregistrés sur disque avec des accents décomposés (NFD).
  const resultAsset = (name) => `rebuild/résultat/${name.normalize('NFD')}`;

  quizEl.innerHTML = `
    <div class="solo-result-category quiz-category-badge" data-category="${badgeCategory}">
      <span aria-hidden="true">${categoryMetadata[badgeCategory] || ''}</span>
      <strong>${badgeCategory}</strong>
    </div>
    <div class="solo-result-heading">
      <img class="solo-result-laurel" src="${resultAsset('lorié.svg')}" alt="" aria-hidden="true" />
      <div>
        <h2 class="solo-result-title">Félicitation ! Vous avez terminé le quiz.</h2>
        <p class="solo-result-score"><strong>${result.score}</strong><span>PTS</span></p>
      </div>
      <img class="solo-result-laurel solo-result-laurel-right" src="${resultAsset('lorié.svg')}" alt="" aria-hidden="true" />
    </div>
    <div class="solo-result-stats">
      <article>
        <img src="${resultAsset('Bonne réponse.svg')}" alt="" aria-hidden="true" />
        <div><strong>${result.correctAnswers ?? result.score}/${result.total}</strong><small>Bonnes réponses</small></div>
      </article>
      <article>
        <img src="${resultAsset('Temps moyen.svg')}" alt="" aria-hidden="true" />
        <div><strong>${averageTime}${averageTime === '—' ? '' : ' s'}</strong><small>Temps moyen<br />par question</small></div>
      </article>
      <article>
        <img src="${resultAsset('classement.svg')}" alt="" aria-hidden="true" />
        <div><strong>—</strong><small>Positions gagnées<br />dans le classement</small></div>
      </article>
    </div>
    <a class="solo-result-primary" href="pages/leaderboard.html">
      <img src="rebuild/Classement.svg" alt="" aria-hidden="true" />
      <span>Voir le classement</span>
      <span aria-hidden="true">→</span>
    </a>
    <div class="solo-result-actions">
      <button class="solo-result-secondary" type="button" data-result-replay>
        <img src="${resultAsset('Rejouer.svg')}" alt="" aria-hidden="true" /><span>Rejouer</span>
      </button>
      <button class="solo-result-secondary" type="button" data-result-category>
        <img src="${resultAsset('Changer de catégorie.svg')}" alt="" aria-hidden="true" /><span>Changer de catégorie</span>
      </button>
    </div>
    <p class="solo-result-share-label">Partager mon score</p>
    <div class="solo-result-share" role="group" aria-label="Partager le score">
      <button type="button" data-share-facebook aria-label="Partager sur Facebook"><img src="${resultAsset('6.svg')}" alt="" /></button>
      <button type="button" data-share-whatsapp aria-label="Partager sur WhatsApp"><img src="${resultAsset('whatapp.svg')}" alt="" /></button>
      <button type="button" data-share-native aria-label="Partager"><img src="${resultAsset('7.svg')}" alt="" /></button>
    </div>`;
  scoreEl.textContent = '';

  quizEl.querySelector('[data-share-facebook]').addEventListener('click', () => {
    const params = new URLSearchParams({ u: shareUrl, quote: shareText });
    window.open(`https://www.facebook.com/sharer/sharer.php?${params}`, '_blank');
  });
  quizEl.querySelector('[data-share-whatsapp]').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
  });
  quizEl.querySelector('[data-share-native]').addEventListener('click', async () => {
    if (navigator.share) await navigator.share({ title: 'Congo Brazza Quiz', text: shareText, url: shareUrl });
  });
  quizEl.querySelector('[data-result-replay]').addEventListener('click', () => startSoloQuiz(currentCategorySlug));
  quizEl.querySelector('[data-result-category]').addEventListener('click', resetSoloQuizView);
}

// Efface l'état d'une partie en cours et réaffiche la grille de catégories.
export function resetSoloQuizView() {
  clearInterval(timerInterval);
  transitionPending = false;
  if (quizStage) quizStage.hidden = true;
  if (categoryStage) categoryStage.hidden = false;
  if (quizEl) quizEl.innerHTML = '';
  if (timerEl) timerEl.textContent = '';
  if (scoreEl) scoreEl.textContent = '';
  document.body.classList.remove('solo-quiz-active');
  document.body.classList.remove('solo-result-mode');
}

export function startSoloQuiz(categorySlug) {
  if (!quizEl || !titleEl) return;
  document.body.classList.remove('solo-result-mode');
  if (categoryStage) categoryStage.hidden = true;
  if (quizStage) quizStage.hidden = false;
  document.body.classList.add('solo-quiz-active');
  const result = quizApi.startQuiz(categorySlug, 10);
  currentCategorySlug = categorySlug;
  currentCategory = result.category;
  currentQuestionNumber = 1;
  totalQuestions = result.totalQuestions;
  answerResults = [];
  const displayCategory = result.category === 'Droit et Soci\u00e9t\u00e9' ? 'Droit & soci\u00e9t\u00e9' : result.category;
  titleEl.textContent = `Quiz : ${displayCategory}`;
  if (result.totalQuestions === 0 || result.currentQuestion === null) {
    quizEl.innerHTML = '<p>Aucune question disponible pour cette catégorie.</p>';
    timerEl.textContent = '';
    scoreEl.textContent = '';
    if (nextButton) nextButton.hidden = true;
    return;
  }
  showQuestion(result.currentQuestion);
}

nextButton?.addEventListener('click', showNextOrFinish);
backButton?.addEventListener('click', (event) => {
  event.preventDefault();
  resetSoloQuizView();
});
