# Frontend

## Structure actuelle

Le frontend est entièrement contenu dans `index.html` et `style.css`.

### `index.html`

- Contient l’HTML principal.
- Importe `style.css`.
- Définit des styles inline pour la publicité.
- Définit `allQuestions` inline.
- Contient le script de rotation des publicités.
- Contient le script du quiz, avec logique, gestion des événements et rendu.

### `style.css`

- Définit le style du body, du conteneur, des titres et des boutons.
- Gère le layout responsive pour `max-width: 480px`.
- Définit les classes `.quiz-image`, `.quiz-option-btn`, `.rejouer`, `.partager`, etc.

## Composants visuels identifiés

- `header` avec bannière/logo.
- `#categoryTitle` : titre dynamique du quiz.
- `#menu` : menu des catégories.
- `#quiz` : zone d’affichage des questions et des options.
- `#timer` : affichage du temps restant.
- `#score` : affichage du score final.
- `.ad` : zone de publicité.

## Logique de présentation

- Le rendu est fait dynamiquement en JavaScript en créant des éléments DOM.
- Les boutons de catégories sont créés à la volée dans `startMenu()`.
- Les questions et options sont également rendues par DOM dans `showQuestion()`.
- Le bon/mauvais état des réponses est présenté via des classes CSS appliquées dynamiquement (`is-correct`, `is-wrong`).
- Le partage Facebook est géré via `window.open()` sur un URL préformaté.

## État de séparation

- La logique de rendu est désormais distincte de la logique métier.
- Le frontend ne dépend plus directement de l’objet `allQuestions`.
- Les données sont chargées via `src/api/quizApi.js`.
- `questions_tourismes.js` reste présent mais n’est toujours pas utilisé.

## Architecture frontend réalisée

- `index.html` contient la structure HTML principale et charge `src/frontend/ui.js` comme module.
- `src/frontend/ui.js` : écoute les événements utilisateur, appelle l’API interne, affiche les questions, gère le timer, le score, le rejouer et le partage Facebook.
- `style.css` reste inchangé pour l’essentiel.

## Points de vérification réalisés

- L’affichage d’une image reste conditionnel selon la présence du champ `image`.
- Les classes CSS `is-correct` et `is-wrong` sont appliquées via le JS du frontend.
- Le frontend n’accède plus aux réponses correctes avant validation.
- La largeur de la zone de jeu reste gérée par `style.css`.

## Notes techniques

- Le frontend utilise désormais un module ES `type="module"`.
- L’API interne est consommée via `src/api/quizApi.js`.
- Aucun endpoint HTTP n’a été créé à ce stade.

- L’affichage de l’image dans une question n’est pas systématique.
- Certaines classes CSS sont appliquées dynamiquement sans protection contre les doublons.
- La largeur du conteneur est fixe à 480px et peut être ajustée pour une meilleure compatibilité.

## Notes techniques

- Aucun package manager n’est utilisé.
- Aucun module JavaScript n’est chargé en dehors du script inline.
- La page est conçue pour servir localement sans serveur spécifique.
