# Business Logic

## Règles métier identifiées

1. L’utilisateur choisit une catégorie ou le mode aléatoire.
2. Une partie comporte exactement 10 questions.
3. Les questions sont mélangées avant d’être présentées.
4. Chaque question dispose de 4 options.
5. Le joueur dispose de 20 secondes par question.
6. Si le joueur ne répond pas à temps, la bonne réponse est révélée et la partie continue.
7. Après chaque réponse, les options sont marquées en vert/rouge pendant 1,5 seconde avant de passer à la suivante.
8. Le score est compté uniquement sur les réponses correctes.
9. Un écran de fin affiche le score et propose de rejouer ou de partager sur Facebook.

## Fonctions métier actuelles

### Domaine métier extrait

- `QuizSession`
  - `start()` : initialise la session.
  - `getCurrentQuestion()` : retourne la question courante.
  - `submitAnswer(questionId, selectedOption)` : valide la réponse, met à jour le score et conserve l’historique.
  - `next()` : passe à la question suivante.
  - `isComplete()` : indique si la session est terminée.
  - `getScore()` : retourne le score actuel.
  - `getTotalQuestions()` : retourne le nombre total de questions de la session.

- `questionRepository`
  - `getCategories()` : retourne toutes les catégories.
  - `getQuestionsForCategory(slug)` : retourne les questions d’une catégorie.
  - `getAllQuestions()` : retourne toutes les questions.
  - `getQuestionById(questionId)` : recherche une question par identifiant.
  - Source de données actuellement locale depuis `src/data/allQuestions.js`, remplaçable par une autre implémentation.

- `quizService`
  - `getCategories()` : expose les catégories au frontend.
  - `getQuestions(category, limit)` : retourne des questions pour le frontend sans exposer les bonnes réponses.
  - `startQuiz(category, limit)` : démarre la session en sélectionnant et mélangeant les questions.
  - `validateAnswer(questionId, selectedOption)` : valide la réponse via `QuizSession`.
  - `getNextQuestion()` : passe à la question suivante.
  - `getResult()` : retourne le score final.
  - `getTimeLimitSeconds()` : expose la durée du timer.

### Règles métier prises en charge

- Le quiz utilise 10 questions par partie.
- Les questions sont mélangées par catégorie ou aléatoirement.
- Les bonnes réponses ne sont jamais exposées directement au frontend dans les objets de question.
- Le score est calculé uniquement à partir des validations dans `QuizSession`.
- La progression est contrôlée par `next()` et `isComplete()`.
- La validation temporaire de `null` correspond au cas de temps écoulé.

## État géré par les fonctions

- Dans `QuizSession` :
  - `questions`
  - `currentIndex`
  - `score`
  - `answers`
  - `started`
  - `finished`

- Dans `quizService` :
  - `activeCategory`
  - `quizSession`

- Dans le frontend UI :
  - `timerInterval`
  - `timeLeft`
  - `currentQuestion`
  - `currentCategory`
  - `totalQuestions`

## Problèmes de couplage résolus

- La logique métier est maintenant séparée du DOM.
- Le frontend ne calcule plus le score ni ne vérifie la réponse.
- `quizSession` est indépendante du navigateur et ne dépend d’aucune API externe.
- L’accès direct aux données des questions se fait uniquement par repository/service.

## Refactorisation réalisée

1. Extraction d’un module de données unique : `src/data/allQuestions.js`.
2. Création d’un repository abstrait `src/domain/questionRepository.js`.
3. Mise en place d’une session pure `src/domain/quizSession.js`.
4. Ajout d’un service métier `src/application/quizService.js`.
5. Mise en place d’une API interne JS `src/api/quizApi.js`.
6. Frontend consommateur isolé dans `src/frontend/ui.js`.

1. Extraire un module métier indépendant :
   - `QuizSession` ou `GameEngine` gère la sélection, la progression, le score et le temps.
   - `QuestionRepository` charge les questions et les expose à l’application.

2. Distinguer les responsabilités :
   - `frontend/` : rendu, événements utilisateur, états visuels.
   - `application/` : orchestrateur entre frontend et domaine.
   - `domain/` : règles métier (valider, avancer, calculer score).
   - `api/` : endpoints pour récupérer questions et valider si la réponse est correcte.

3. Limiter l’accès direct aux données correctes :
   - Côté API, retourner une représentation de la question sans `correct_answer`.
   - Validation des réponses côté métier/API.

4. Standardiser les données :
   - Ajouter des `id` question et `category_id`.
   - Utiliser `options: string[]` et `correct_choice_index: number`.

## Cas limites à couvrir

- Sélection de catégorie non existante.
- Catégorie vide.
- `selectedQuestions` vide.
- Temps expiré avant toute réponse.
- Réponse invalide (option non présente).
- Redémarrage du quiz entre deux questions.
- Partage social en fin de quiz.
