# Architecture actuelle

## Vue d’ensemble

Le projet est une application web statique qui fonctionne en ouvrant `index.html` dans un navigateur. Il s’agit d’un quiz local sur le Congo-Brazzaville avec catégories, minuteur, score, et un affichage de publicité.

## Arborescence principale

- `index.html` — page unique contenant la structure HTML, le CSS externe, les données `allQuestions`, le script de quiz et le script de publicité.
- `style.css` — styles applicatifs et responsive.
- `questions_tourismes.js` — ensemble de questions supplémentaires non importé par `index.html`.
- `images/` — images de questions, pas forcément toutes utilisées.
- `bannere.jpg`, `logo.png`, `reseau120bannere.jpg`, `publicite02.jpg`, etc.

## Principaux composants / modules

### Frontend

- `index.html` : conteneur, titre, menu, zone de quiz, timer, score et publicité.
- `style.css` : styles visuels simples, boutons, conteneur et responsive mobile.

### Données

- `allQuestions` : objet JavaScript défini inline dans `index.html`.
- `questions_tourismes.js` : fichier indépendant contenant une autre liste de questions avec images, mais non utilisé dans l’application.

### Logique métier

- `startMenu()` : affiche les catégories et le bouton aléatoire.
- `startQuiz(category)` : initialise la partie, choisit les questions, mélange et limite à 10.
- `showQuestion()` : affiche la question courante, son image éventuelle, les options et démarre le timer.
- `checkAnswer(selected, clickedBtn)` : valide une réponse, met à jour le score, révèle la bonne réponse et passe à la suivante.
- `showCorrectAnswer()` : gère la fin du timer et révèle la bonne réponse.
- `showFinalScore()` : affiche le score final et propose de rejouer / partager.
- `shuffleArray(arr)` : fonction utilitaire de mélange.

## Flux utilisateur

1. L’utilisateur ouvre `index.html`.
2. `startMenu()` est exécuté automatiquement et affiche les catégories.
3. L’utilisateur choisit une catégorie ou "Aléatoire".
4. `startQuiz()` sélectionne les questions correspondantes, les mélange et appelle `showQuestion()`.
5. `showQuestion()` démarre un timer de 20 secondes.
6. L’utilisateur clique sur une réponse avant la fin du temps ou le temps s’écoule.
7. Le système colore les options correctes / incorrectes, puis passe à la question suivante après 1,5 seconde.
8. Après 10 questions, `showFinalScore()` montre le score et propose de rejouer ou partager.

## Gestion de l’état

L’état est géré dans des variables globales définies dans `index.html` :

- `selectedQuestions` : tableau des questions sélectionnées pour la partie.
- `current` : indice de la question courante.
- `score` : score actuel.
- `timerInterval` : identifiant de l’intervalle pour le timer.
- `timeLeft` : temps restant pour la question courante.
- `selectedCategory` : catégorie choisie, attribuée sans déclaration explicite.

## Observations importantes

- La logique métier est fortement couplée au DOM.
- Le code contient une duplication : deux définitions distinctes de `showFinalScore()`.
- `questions_tourismes.js` est un fichier de données inutilisé.
- Il n’existe aucun fichier de configuration (`package.json`, `tsconfig.json`, `webpack.config.js`, etc.).
- Il n’existe aucun test automatisé.

## Points fragiles

- Bugs probables liés à la variable globale `selectedCategory` non déclarée.
- Deux définitions de `showFinalScore()` peuvent masquer des comportements non attendus.
- Le mélange logique/DOM rend la maintenance difficile.
- L’objet `allQuestions` est très volumineux et stocké inline dans la page.
- Le code dépend de l’attribut `button.dataset.option` pour comparer les réponses.

## Duplications et problèmes

- Deux définitions de `showFinalScore()` dans `index.html`.
- Plusieurs catégories contiennent la même question formulée de manière quasi identique.
- Les questions peuvent répéter la même information sur plusieurs catégories.
- Le script de publicité et le script du quiz sont tous deux embarqués inline dans `index.html`.

## Proposition d’architecture cible

1. Séparer le projet en couches :
   - `frontend/` : HTML, CSS, code d’affichage et interactions.
   - `application/` : orchestration, état de session et communication entre UI et métier.
   - `domain/` : modèles de questions, règles de validation, score, progression.
   - `api/` : endpoints HTTP pour charger les questions et valider les réponses.
   - `data/` ou `supabase/` : stockage des questions.

2. Maintenir la simplicité de la stack : JavaScript vanilla côté frontend et une API légère en Node.js ou serverless simple.
3. Extraire les données `allQuestions` hors du DOM.
4. Ajouter des identifiants de question.
5. Réduire le couplage entre l’état métier et le DOM.
6. Prévoir une API qui ne retourne pas `answer` avant la validation.

## Conclusion

Le projet est un bon candidat pour une migration progressive : l’application est simple, sans dépendances externes, mais la logique métier est actuellement entremêlée au frontend et les données sont hardcodées.
