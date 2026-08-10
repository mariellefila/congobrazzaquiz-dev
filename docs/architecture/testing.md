# Testing

## État actuel

Aucun test n’est présent dans le projet. Il n’existe ni tests unitaires, ni tests d’intégration, ni tests E2E.

## Recommandation initiale

### Tests unitaires

- Tester les règles métier extraites : sélection des questions, progression, validation des réponses, score, expiration du temps.
- Tester les utilitaires : mélange de tableau, sélection aléatoire, contrôle des catégories.
- Faire en sorte que ces tests n’aient pas besoin du DOM.

### Tests API

- Tester les endpoints proposés : `GET /api/categories`, `GET /api/questions`, `POST /api/quiz/answer`, `POST /api/quiz/score`.
- Vérifier les cas d’erreur : catégorie invalide, question inconnue, body manquant.

### Tests E2E

- Couvrir le parcours utilisateur : ouverture de l’application, sélection d’une catégorie, réponse à une question, fin de quiz, affichage du score.
- Ajouter des scénarios négatifs : réponse invalide, absence de questions, API indisponible.

## Choix de la stack de tests

Étant donné l’absence de dépendances existantes, il est recommandé de démarrer avec une solution légère :

- `vitest` ou `jest` pour les tests unitaires côté JavaScript.
- `supertest` pour tester l’API HTTP.
- `playwright` ou `cypress` pour les tests E2E si un serveur local est mis en place.

## Phasing

1. Phase 2 : tests unitaires de la logique métier extraite.
2. Phase 3 : tests API sur la nouvelle interface.
3. Phase 4 : tests E2E sur le parcours complet.
