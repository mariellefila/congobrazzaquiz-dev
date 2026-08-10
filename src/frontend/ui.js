import * as quizApi from '../api/quizApi.js';

const menuDiv = document.getElementById('menu');
const quizDiv = document.getElementById('quiz');
const timerP = document.getElementById('timer');
const scoreP = document.getElementById('score');
const categoryTitle = document.getElementById('categoryTitle');
const buildFooter = document.getElementById('buildFooter');

let timerInterval = null;
let timeLeft = quizApi.getTimeLimitSeconds();
let currentQuestion = null;
let currentCategory = null;
let totalQuestions = 0;

function renderMenu() {
  categoryTitle.textContent = 'Quiz : Congo-Brazzaville';
  quizDiv.innerHTML = '';
  timerP.textContent = '';
  scoreP.textContent = '';
  menuDiv.innerHTML = '<h2>Choisissez une catégorie :</h2>';

  const categories = quizApi.getCategories();
  categories.forEach((category) => {
    const btn = document.createElement('button');
    btn.textContent = category.name;
    btn.style.margin = '5px';
    btn.addEventListener('click', () => startQuiz(category.slug));
    menuDiv.appendChild(btn);
  });

  const btnRandom = document.createElement('button');
  btnRandom.textContent = 'Aléatoire';
  btnRandom.style.margin = '5px';
  btnRandom.addEventListener('click', () => startQuiz('random'));
  menuDiv.appendChild(btnRandom);
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
  categoryTitle.textContent = `Quiz : ${result.category}`;
  totalQuestions = result.totalQuestions;
  showQuestion(result.currentQuestion);
}

function renderBuildFooter() {
  const buildVersion = 'Build: 1.0.0';
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const buildDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const buildTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  buildFooter.textContent = `${buildVersion} — Publié le ${buildDate} à ${buildTime}`;
}

renderMenu();
renderBuildFooter();
