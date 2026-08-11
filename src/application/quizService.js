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

// Initialise le repository depuis Supabase en rechargeant les données en mémoire.
// includeAnswers=true récupère aussi le champ `answer` (utile pour le mode solo),
// mais en production multi compétitif il est recommandé de valider côté serveur.
export async function initWithSupabase(supabaseClient, { includeAnswers = true } = {}) {
  if (!supabaseClient) throw new Error('Supabase client requis');
  const selectCols = includeAnswers ? 'id, category_id, question, options, image, answer' : 'id, category_id, question, options, image';
  const { data, error } = await supabaseClient.from('questions').select(selectCols).order('id', { ascending: true });
  if (error) throw error;
  // rebuild a local `source` object compatible with createQuestionRepository
  const source = {};
  (data || []).forEach((q) => {
    const cat = q.category_id || 'uncategorized';
    source[cat] = source[cat] || [];
    source[cat].push({
      question: q.question,
      options: q.options || [],
      answer: includeAnswers ? q.answer : null,
      image: q.image || null,
    });
  });
  // replace repository with preloaded in-memory repo to keep existing sync API
  const repo = createQuestionRepository(source);
  // mutate current module-level reference
  // eslint-disable-next-line no-unused-vars
  // Note: we intentionally keep the same API surface (sync) by preloading data.
  // For larger datasets consider paginating instead of preloading all questions.
  // Assign to outer-scope variable
  // (can't re-declare const; mutate by assigning to same name via indirect means)
  // We'll replace methods on existing repository object if possible.
  Object.keys(repo).forEach((k) => {
    // eslint-disable-next-line no-param-reassign
    questionRepository[k] = repo[k];
  });
}
