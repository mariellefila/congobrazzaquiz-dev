# Instructions Copilot pour Congo-Brazza Quizz

## Contexte et stack
- Ce dépôt est un site web statique.
- Stack existante : HTML simple, CSS, JavaScript vanilla.
- Pas de framework frontend (React/Vue/Angular), pas de build npm / package.json / Webpack.
- L’application se lance en ouvrant `index.html` dans le navigateur.

## Architecture du frontend
- `index.html` contient la page unique du quiz, la structure HTML, l’interface utilisateur et la logique métier principale.
- `style.css` contient les styles visuels, le responsive et quelques animations.
- `allQuestions` est défini inline dans `index.html` et contient toutes les catégories et questions du jeu.
- Le fichier `questions_tourismes.js` est présent dans le dépôt mais n’est pas importé par `index.html`; il n’est donc pas exécuté par le site actuel.

## Pages et composants existants
- Page unique : `index.html`.
- Composants visuels dans le document : header/logo, titre de catégorie, menu de catégories, zone de quiz, timer, score, bloc publicité.
- Boutons dynamiques : catégories, réponses, rejouer, partager.
- Images de questions intégrées dans l’objet de données (`q.image`) ajoutent des visuels aux questions.

## Styles et responsive
- `style.css` gère le layout principal, le style des boutons, les options de quiz, le conteneur, et le responsive mobile (`max-width: 480px`).
- Certaines classes CSS clés : `.container`, `.logo`, `.ad`, `.timer`, `.quiz-image`, `.quiz-option-btn`, `.quiz-option-index`, `.quiz-option-text`, `.rejouer`, `.partager`.
- Il existe déjà des animations CSS pour le bloc publicitaire et des hover states.

## Assets
- Images racine : `bannere.jpg`, `logo.png`, et plusieurs visuels de publicité.
- Dossier `images/` avec les illustrations de questions.
- Dossier `og/` probablement réservé aux images Open Graph.

## Logique métier vs présentation
- Logique métier du jeu dans `index.html` :
  - `startMenu()` pour afficher les catégories.
  - `startQuiz(category)` pour démarrer une session.
  - `showQuestion()` pour afficher chaque question.
  - `checkAnswer(selected, clickedBtn)` pour valider une réponse.
  - `showCorrectAnswer()` pour gérer le temps écoulé.
  - `showFinalScore()` pour afficher le score final et les boutons.
  - `shuffleArray(arr)` pour mélanger les questions.
- Présentation séparée : `style.css` et le HTML statique.
- Quelques styles inline JS existent pour les images et la marge des boutons, mais l’essentiel du visuel est dans `style.css`.

## Commandes de build et démarrage
- Aucun script de build ou commande `npm` n’est défini.
- Le site fonctionne comme un projet statique : ouvrir `index.html` avec un navigateur ou servir le dossier avec un serveur statique léger.

## Consignes pour Copilot
1. Priorise toujours la modification du design visuel et de l’UX via `style.css` et `index.html`.
2. Garde la logique du quiz intacte. Ne casse pas les fonctions de navigation, de chronométrage ou de validation des réponses.
3. Ne modifie pas les identifiants HTML suivants : `categoryTitle`, `menu`, `quiz`, `timer`, `score`.
4. Ne déplace ni ne supprime l’objet `allQuestions` défini dans `index.html`, car c’est le cœur des données du jeu.
5. Si tu changes un visuel, préfère les classes CSS et les animations CSS plutôt que d’ajouter du style inline dans le JavaScript.
6. Si tu veux améliorer le responsive, agrandis la zone mobile au-delà de `max-width: 480px` mais conserve la compatibilité pour petites résolutions.
7. Si tu ajoutes de nouveaux éléments visuels ou sections, vérifie qu’ils ne perturbent pas la logique du quiz dynamique.
8. Pour les assets, utilise les images existantes d’abord. Si tu remplaces ou ajoutes des visuels, mets-les dans le même dossier et adapte les chemins.
9. Ne tente pas de convertir le projet en application buildée ou d’introduire un système de bundling sans une raison claire.
10. Evite de toucher à `questions_tourismes.js` : ce fichier est présent mais pas utilisé par la page active.

## Objectif pour la personne créative
- Tu peux librement améliorer l’apparence, les animations, l’ambiance graphique, la typographie et le responsive.
- Tu peux modifier l’UX du menu, des boutons de réponse, de l’affichage du score et des transitions entre questions.
- Tu dois éviter de modifier involontairement :
  - la logique de sélection des questions,
  - le système de timer,
  - le calcul du score,
  - le comportement du bouton "Rejouer" et du partage Facebook.

> En résumé : concentre-toi sur l’habillage, le flow visuel et l’expérience utilisateur. Laisse la logique métier du quiz en place sauf si une refonte visuelle nécessite des ajustements mineurs clairement séparés du calcul du score et du timer.
