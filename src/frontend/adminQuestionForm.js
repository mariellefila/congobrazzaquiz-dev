export function buildQuestionUpdatePayload(form, question) {
  const formData = new FormData(form);
  const correctAnswer = String(formData.get('correctAnswer') || '').trim();
  const wrongAnswers = ['wrongAnswer1', 'wrongAnswer2', 'wrongAnswer3']
    .map((field) => String(formData.get(field) || '').trim())
    .filter(Boolean);
  const answers = [correctAnswer, ...wrongAnswers];

  if (new Set(answers).size !== answers.length) {
    throw new Error('Chaque réponse doit être différente.');
  }

  return {
    id: question.id,
    source: question.source,
    question: String(formData.get('question') || '').trim(),
    categoryId: String(formData.get('categoryId') || ''),
    correctAnswer,
    wrongAnswers,
    image: question.source === 'published' ? String(formData.get('image') || '').trim() : null,
  };
}

export function questionEditFormMarkup(question, categories) {
  const categoryOptions = categories.map((category) => {
    const value = question.source === 'submission' ? category.slug : category.id;
    const selected = value === question.categoryId ? ' selected' : '';
    return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(category.name)}</option>`;
  }).join('');
  const imageField = question.source === 'published'
    ? `<label>Image (URL ou chemin existant)<input name="image" value="${escapeHtml(question.image)}" /></label>`
    : '';

  return `
    <h2>Modifier la question</h2>
    <form class="bo-inline-edit-form" data-inline-question-edit>
      <label>Question<textarea name="question" required rows="3">${escapeHtml(question.question)}</textarea></label>
      <label>Catégorie<select name="categoryId" required>${categoryOptions}</select></label>
      <label class="bo-correct-answer-field"><span><span aria-hidden="true">✓</span> Bonne réponse</span><input name="correctAnswer" required value="${escapeHtml(question.correctAnswer)}" /></label>
      <fieldset>
        <legend>Mauvaises réponses</legend>
        <label>Réponse 1<input name="wrongAnswer1" value="${escapeHtml(question.wrongAnswers[0])}" /></label>
        <label>Réponse 2<input name="wrongAnswer2" value="${escapeHtml(question.wrongAnswers[1])}" /></label>
        <label>Réponse 3<input name="wrongAnswer3" value="${escapeHtml(question.wrongAnswers[2])}" /></label>
      </fieldset>
      ${imageField}
      <p class="bo-inline-edit-status" data-inline-edit-status role="status" aria-live="polite"></p>
      <div class="bo-edit-actions">
        <button type="button" data-inline-edit-cancel>Annuler</button>
        <button type="submit" data-inline-edit-save>Enregistrer les modifications</button>
      </div>
    </form>
  `;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[character]);
}
