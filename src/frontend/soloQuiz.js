import * as quizApi from '../api/quizApi.js';

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
let currentQuestionNumber = 0;
let totalQuestions = 0;
let transitionPending = false;

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
  revealCorrectAnswer(null, result.correctOption);
}

function revealCorrectAnswer(selectedBtn, correctOption) {
  transitionPending = true;
  const allButtons = Array.from(quizEl.querySelectorAll('button'));
  allButtons.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.option === correctOption) {
      btn.classList.add('is-correct');
    } else if (btn === selectedBtn) {
      btn.classList.add('is-wrong');
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

  const title = document.createElement('h3');
  title.className = 'solo-quiz-question';
  title.textContent = question.question;
  quizEl.appendChild(title);

  quizEl.appendChild(timerEl);

  if (question.image) {
    const img = document.createElement('img');
    img.src = question.image;
    img.alt = 'illustration';
    img.className = 'quiz-image';
    quizEl.appendChild(img);
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

  quizEl.appendChild(answers);

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

function showFinalScore() {
  quizEl.innerHTML = '<h2>Quiz termin\u00e9 !</h2>';
  timerEl.textContent = '';
  if (nextButton) nextButton.hidden = true;
  const result = quizApi.getResult();
  scoreEl.textContent = `Score : ${result.score} / ${result.total}`;

  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Rejouer';
  restartBtn.className = 'rejouer';
  restartBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    if (quizStage) quizStage.hidden = true;
    if (categoryStage) categoryStage.hidden = false;
  });
  quizEl.appendChild(restartBtn);

  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Partager sur Facebook';
  shareBtn.className = 'partager';
  shareBtn.addEventListener('click', () => {
    const url = encodeURIComponent('http://congobrazza-quiz.com/');
    const label = currentCategory === 'random' ? 'en mode al\u00e9atoire' : `dans la cat\u00e9gorie "${currentCategory}"`;
    const text = encodeURIComponent(`J'ai obtenu un score de ${result.score} / ${result.total} au quiz Congo-Brazzaville ${label} ! \ud83d\udd25 Teste-toi aussi sur http://congobrazza-quiz.com/`);
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
    window.open(fbUrl, '_blank');
  });
  quizEl.appendChild(shareBtn);
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
}

export function startSoloQuiz(categorySlug) {
  if (!quizEl || !titleEl) return;
  if (categoryStage) categoryStage.hidden = true;
  if (quizStage) quizStage.hidden = false;
  document.body.classList.add('solo-quiz-active');
  const result = quizApi.startQuiz(categorySlug, 10);
  currentCategory = result.category;
  currentQuestionNumber = 1;
  totalQuestions = result.totalQuestions;
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
