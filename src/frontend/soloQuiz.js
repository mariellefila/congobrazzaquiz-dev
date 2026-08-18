import * as quizApi from '../api/quizApi.js';

const titleEl = document.getElementById('soloQuizTitle');
const quizEl = document.getElementById('soloQuiz');
const timerEl = document.getElementById('soloTimer');
const scoreEl = document.getElementById('soloScore');
const categoryStage = document.querySelector('[data-category-stage]');
const quizStage = document.querySelector('[data-quiz-stage]');

let timerInterval = null;
let timeLeft = 0;
let currentQuestion = null;
let currentCategory = null;

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = quizApi.getTimeLimitSeconds();
  timerEl.textContent = `Temps restant : ${timeLeft} secondes`;
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerEl.textContent = `Temps restant : ${timeLeft} secondes`;
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
  const allButtons = Array.from(quizEl.querySelectorAll('button'));
  allButtons.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.option === correctOption) {
      btn.classList.add('is-correct');
    } else if (btn === selectedBtn) {
      btn.classList.add('is-wrong');
    }
  });
  setTimeout(showNextOrFinish, 1500);
}

function showQuestion(question) {
  quizEl.innerHTML = '';
  if (!question) {
    showFinalScore();
    return;
  }

  currentQuestion = question;

  const title = document.createElement('h3');
  title.textContent = question.question;
  quizEl.appendChild(title);

  if (question.image) {
    const img = document.createElement('img');
    img.src = question.image;
    img.alt = 'illustration';
    img.className = 'quiz-image';
    quizEl.appendChild(img);
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
    quizEl.appendChild(btn);
  });

  startTimer();
}

function handleAnswer(option, clickedBtn) {
  clearInterval(timerInterval);
  const result = quizApi.validateAnswer(currentQuestion.id, option);
  const buttons = Array.from(quizEl.querySelectorAll('button'));
  buttons.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.option === result.correctOption) {
      btn.classList.add('is-correct');
    } else if (btn === clickedBtn) {
      btn.classList.add('is-wrong');
    }
  });
  setTimeout(showNextOrFinish, 1500);
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
  quizEl.innerHTML = '<h2>Quiz termin\u00e9 !</h2>';
  timerEl.textContent = '';
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
  if (quizStage) quizStage.hidden = true;
  if (categoryStage) categoryStage.hidden = false;
  if (quizEl) quizEl.innerHTML = '';
  if (timerEl) timerEl.textContent = '';
  if (scoreEl) scoreEl.textContent = '';
}

export function startSoloQuiz(categorySlug) {
  if (!quizEl || !titleEl) return;
  if (categoryStage) categoryStage.hidden = true;
  if (quizStage) quizStage.hidden = false;
  const result = quizApi.startQuiz(categorySlug, 10);
  currentCategory = result.category;
  const displayCategory = result.category === 'Droit et Soci\u00e9t\u00e9' ? 'Droit & soci\u00e9t\u00e9' : result.category;
  titleEl.textContent = `Quiz : ${displayCategory}`;
  showQuestion(result.currentQuestion);
}
