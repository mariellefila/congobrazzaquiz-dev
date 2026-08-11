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

// Async repository backed by Supabase with local fallback.
export function createSupabaseQuestionRepository(supabaseClient, fallbackSource = allQuestions) {
  async function getCategories() {
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('id, name, slug')
        .order('id', { ascending: true });
      if (error) throw error;
      if (data && data.length) return data.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
    } catch (e) {
      // fallback to local
    }
    return Object.keys(fallbackSource).map((name, index) => {
      const slug = toSlug(name) || `category-${index + 1}`;
      return { id: slug, name, slug };
    });
  }

  async function getCategoryBySlug(slug) {
    const cats = await getCategories();
    return cats.find((c) => c.slug === slug) || null;
  }

  async function getAllQuestions() {
    try {
      // Do NOT select the "answer" column here to avoid exposing correct answers to clients.
      const { data, error } = await supabaseClient
        .from('questions')
        .select('id, category_id, question, options, image')
        .order('id', { ascending: true });
      if (error) throw error;
      if (data) {
        return data.map((q) => ({
          id: q.id,
          categoryId: q.category_id,
          question: q.question,
          options: q.options || [],
          image: q.image || null,
        }));
      }
    } catch (e) {
      // fallback to local
    }
    // fallback: reuse synchronous logic
    const repo = createQuestionRepository(fallbackSource);
    return repo.getAllQuestions();
  }

  async function getQuestionsForCategory(slug) {
    try {
      const { data, error } = await supabaseClient
        .from('questions')
        .select('id, category_id, question, options, image')
        .eq('category_id', slug)
        .order('id', { ascending: true });
      if (error) throw error;
      if (data) return data.map((q) => ({ id: q.id, categoryId: q.category_id, question: q.question, options: q.options || [], image: q.image || null }));
    } catch (e) {
      // fallback
    }
    const repo = createQuestionRepository(fallbackSource);
    return repo.getQuestionsForCategory(slug);
  }

  async function getQuestionById(questionId) {
    try {
      const { data, error } = await supabaseClient.from('questions').select('id, category_id, question, options, image').eq('id', questionId).limit(1).single();
      if (error) throw error;
      if (data) return { id: data.id, categoryId: data.category_id, question: data.question, options: data.options || [], image: data.image || null };
    } catch (e) {
      // fallback
    }
    const repo = createQuestionRepository(fallbackSource);
    return repo.getQuestionById(questionId);
  }

  return {
    getCategories,
    getCategoryBySlug,
    getAllQuestions,
    getQuestionsForCategory,
    getQuestionById,
  };
}
