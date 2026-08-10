export class QuizSession {
  constructor({ questions = [] } = {}) {
    this.questions = questions.slice();
    this.currentIndex = 0;
    this.score = 0;
    this.answers = [];
    this.started = false;
    this.finished = false;
  }

  start() {
    this.currentIndex = 0;
    this.score = 0;
    this.answers = [];
    this.started = true;
    this.finished = this.questions.length === 0;
  }

  getCurrentQuestion() {
    if (!this.started || this.finished) {
      return null;
    }
    return this.questions[this.currentIndex] || null;
  }

  submitAnswer(questionId, selectedOption) {
    const question = this.getCurrentQuestion();
    if (!question || question.id !== questionId) {
      throw new Error('Invalid question or session state.');
    }

    const correct = question.answer === selectedOption;
    this.answers.push({
      questionId,
      selectedOption,
      correct,
      timedOut: selectedOption === null,
    });

    if (correct) {
      this.score += 1;
    }

    return { correct, question };
  }

  next() {
    if (this.finished) {
      return false;
    }

    this.currentIndex += 1;
    if (this.currentIndex >= this.questions.length) {
      this.finished = true;
      return false;
    }

    return true;
  }

  isComplete() {
    return this.finished;
  }

  getScore() {
    return this.score;
  }

  getTotalQuestions() {
    return this.questions.length;
  }
}
