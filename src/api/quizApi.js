import * as quizService from '../application/quizService.js';

export function getCategories() {
  return quizService.getCategories();
}

export function getQuestions(category, limit = 10) {
  return quizService.getQuestions(category, limit);
}

export function startQuiz(category, limit = 10) {
  return quizService.startQuiz(category, limit);
}

export function validateAnswer(questionId, selectedOption) {
  return quizService.validateAnswer(questionId, selectedOption);
}

export function getNextQuestion() {
  return quizService.getNextQuestion();
}

export function getResult() {
  return quizService.getResult();
}

export function getTimeLimitSeconds() {
  return quizService.getTimeLimitSeconds();
}
