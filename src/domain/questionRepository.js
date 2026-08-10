import { allQuestions } from '../data/allQuestions.js';
import { toSlug, buildQuestionId } from './quizUtils.js';

export function createQuestionRepository(source = allQuestions) {
  const categories = Object.keys(source).map((name, index) => {
    const slug = toSlug(name) || `category-${index + 1}`;
    return { id: slug, name, slug };
  });

  const questionsByCategory = categories.reduce((result, category) => {
    const rawQuestions = source[category.name] || [];
    result[category.slug] = rawQuestions.map((question, index) => ({
      id: buildQuestionId(category.slug, index),
      categoryId: category.slug,
      question: question.question,
      options: question.options.slice(),
      answer: question.answer,
      image: question.image,
    }));
    return result;
  }, {});

  const allQuestionsList = Object.values(questionsByCategory).flat();

  function getCategories() {
    return categories.map((category) => ({ ...category }));
  }

  function getCategoryBySlug(slug) {
    return categories.find((category) => category.slug === slug) || null;
  }

  function getAllQuestions() {
    return allQuestionsList.map((question) => ({
      ...question,
      options: question.options.slice(),
    }));
  }

  function getQuestionsForCategory(slug) {
    return (questionsByCategory[slug] || []).map((question) => ({
      ...question,
      options: question.options.slice(),
    }));
  }

  function getQuestionById(questionId) {
    return allQuestionsList.find((question) => question.id === questionId) || null;
  }

  return {
    getCategories,
    getCategoryBySlug,
    getAllQuestions,
    getQuestionsForCategory,
    getQuestionById,
  };
}
