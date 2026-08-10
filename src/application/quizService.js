import { createQuestionRepository } from '../domain/questionRepository.js';
import { shuffleArray } from '../domain/quizUtils.js';
import { QuizSession } from '../domain/quizSession.js';

const questionRepository = createQuestionRepository();
let quizSession = null;
let activeCategory = null;

function sanitizeQuestion(question) {
  if (!question) {
    return null;
  }

  const { id, question: text, options, image } = question;
  return {
    id,
    question: text,
    options: options.slice(),
    image,
  };
}

export function getCategories() {
  return questionRepository.getCategories();
}

export function getQuestions(category, limit = 10) {
  const slug = category === 'random' ? null : category;
  const rawQuestions = slug ? questionRepository.getQuestionsForCategory(slug) : questionRepository.getAllQuestions();
  const selected = shuffleArray(rawQuestions).slice(0, limit);
  return selected.map(sanitizeQuestion);
}

export function startQuiz(category, limit = 10) {
  const rawQuestions = category === 'random'
    ? questionRepository.getAllQuestions()
    : questionRepository.getQuestionsForCategory(category);

  const selectedQuestions = shuffleArray(rawQuestions).slice(0, limit);
  quizSession = new QuizSession({ questions: selectedQuestions });
  quizSession.start();
  activeCategory = category === 'random' ? 'Aléatoire' : (questionRepository.getCategoryBySlug(category)?.name ?? category);

  return {
    currentQuestion: sanitizeQuestion(quizSession.getCurrentQuestion()),
    totalQuestions: quizSession.getTotalQuestions(),
    category: activeCategory,
  };
}

export function getCurrentQuestion() {
  return quizSession ? sanitizeQuestion(quizSession.getCurrentQuestion()) : null;
}

export function validateAnswer(questionId, selectedOption) {
  if (!quizSession) {
    throw new Error('Quiz session not started.');
  }

  const result = quizSession.submitAnswer(questionId, selectedOption);
  return {
    correct: result.correct,
    correctOption: result.question.answer,
  };
}

export function getNextQuestion() {
  if (!quizSession) {
    return null;
  }

  const hasNext = quizSession.next();
  return hasNext ? sanitizeQuestion(quizSession.getCurrentQuestion()) : null;
}

export function getResult() {
  if (!quizSession) {
    return {
      score: 0,
      total: 0,
      category: activeCategory,
    };
  }

  return {
    score: quizSession.getScore(),
    total: quizSession.getTotalQuestions(),
    category: activeCategory,
  };
}

export function getTimeLimitSeconds() {
  return 20;
}
