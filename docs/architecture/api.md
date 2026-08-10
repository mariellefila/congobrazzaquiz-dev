# API

## État actuel

Le projet actuel ne comporte aucune API. Toutes les données et la logique se trouvent dans `index.html` et s’exécutent côté client.

## Besoin d’une API

Pour séparer la logique métier du frontend, une API sera nécessaire pour :

- charger les catégories disponibles,
- obtenir un jeu de questions pour une catégorie ou aléatoire,
- valider une réponse / calculer le score,
- éventuellement gérer l’authentification utilisateur et la persistance de sessions.

## API interne JS réalisée

Pour la Phase 2, l’API est implémentée comme une frontière interne JavaScript, pas comme de véritables endpoints HTTP.

### Interface interne exposée

- `getCategories()`
  - retourne un tableau de catégories : `{ id, name, slug }`
- `getQuestions(category, limit)`
  - retourne un tableau de questions pour une catégorie ou pour `random`
  - chaque question contient : `{ id, question, options, image? }`
- `startQuiz(category, limit)`
  - démarre une session de quiz et retourne l’état initial :
    - `currentQuestion`
    - `totalQuestions`
    - `category`
- `validateAnswer(questionId, selectedOption)`
  - valide une réponse pour la question courante
  - retourne : `{ correct, correctOption }`
- `getNextQuestion()`
  - passeà la question suivante et retourne la question suivante ou `null`
- `getResult()`
  - retourne le score final et le total des questions : `{ score, total, category }`
- `getTimeLimitSeconds()`
  - retourne la durée du timer côté frontend (20 secondes)

### Architecture réelle

- `src/frontend/ui.js` appelle `src/api/quizApi.js`
- `src/api/quizApi.js` appelle `src/application/quizService.js`
- `src/application/quizService.js` appelle `src/domain/questionRepository.js`
- `src/domain/questionRepository.js` s’appuie sur `src/data/allQuestions.js`

### Règles métier dans cette couche

- La validation de la réponse est gérée par `quizService`.
- Le score est calculé dans le domaine métier (`QuizSession`).
- Le frontend ne connaît pas les bonnes réponses ; il reçoit seulement `correctOption` après validation.
- Le timer est géré visuellement dans `ui.js`, tandis que la validation et la progression restent dans le domaine.

## Endpoints HTTP proposés pour plus tard

L’API interne a été conçue pour être remplaçable plus tard par de vrais endpoints HTTP. Les routes suivantes restent pertinentes pour Phase 3 :

- `GET /api/categories`
- `GET /api/questions`
- `POST /api/quiz/answer`
- `POST /api/quiz/score`

## Notes d’implémentation

- L’API interne est légère et ne dépend que des modules JS.
- La source de vérité des questions est `src/data/allQuestions.js`.
- Les bonnes réponses ne sont pas exposées dans les objets question renvoyés au frontend.
- Cette structure permet une migration future vers Supabase ou une API HTTP.
