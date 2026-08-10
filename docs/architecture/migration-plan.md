# Plan de migration

## Objectif

Préparer une migration progressive de l’application actuelle vers une architecture séparant clairement la présentation, l’application, le domaine métier et l’API.

## Phases

### Phase 1 — Audit et documentation

- Analyser le code existant.
- Documenter l’architecture, les données, la logique métier et le frontend.
- Valider que le projet est statique et sans build.
- Résultat : documentation complète dans `/docs/architecture/`.

### Phase 2 — Extraction de la logique métier et création d’une API

#### Étape 2.1 : Isoler les données

- Extraire `allQuestions` dans un fichier de données ou un module séparé.
- Supprimer le gros objet inline de `index.html`.
- Identifier si `questions_tourismes.js` doit être réintégré ou conservé comme source de questions additionnelle.

#### Étape 2.2 : Créer un module métier

- Créer une couche `domain/` avec :
  - `QuestionRepository` : chargement et normalisation des questions.
  - `QuizSession` : sélection, progression, score, validation des réponses.
  - `quiz-utils` : mélange de tableau et génération de sessions.
- Assurer que ces modules ne dépendent pas du DOM.

#### Étape 2.3 : Créer une couche application

- Créer une couche `application/` responsable de l’état courant et de l’interaction entre UI et domaine.
- Exposer un point d’entrée simple pour le frontend.

#### Étape 2.4 : Ajouter une API légère

- Créer des endpoints locaux utilisant le module métier.
- Implémenter `GET /api/categories`, `GET /api/questions`, `POST /api/quiz/answer`, éventuellement `POST /api/quiz/score`.
- Faire en sorte que le frontend consomme l’API au lieu d’accéder directement aux données.

#### Étape 2.5 : Vérifier le fonctionnement

- Assurer que l’application fonctionne toujours après chaque extraction importante.
- Tester manuellement la navigation : catégorie, quiz, timer, score, partage.

### Phase 3 — Intégration Supabase

#### Étape 3.1 : Préparer Supabase et l’authentification

- Définir le modèle de données Supabase.
- Préparer les migrations SQL.
- Prévoir Supabase Auth avec Google (sans inclure de secrets dans le dépôt).
- Documenter les variables d’environnement nécessaires.

#### Étape 3.2 : Migrer les données

- Créer un script d’import pour transférer les questions existantes vers Supabase.
- S’assurer que les questions importées conservent catégorie, options, image et bonne réponse.
- Mettre en place une politique de sécurité RLS.

#### Étape 3.3 : Adapter l’API pour Supabase

- Remplacer le stockage local par Supabase dans les endpoints.
- S’assurer que l’API ne renvoie pas les bonnes réponses inutilement.
- Valider le fonctionnement du quiz avec les questions depuis Supabase.

### Phase 4 — Tests unitaires et E2E

#### Étape 4.1 : Tests unitaires

- Créer les tests unitaires pour le domaine métier.
- Couvrir : sélection de questions, validation, score, progression, expiration du temps.
- Utiliser un runner léger (`vitest` recommandé).

#### Étape 4.2 : Tests API

- Tester chaque endpoint.
- Valider les cas d’erreur.
- S’assurer que le backend renvoie les données attendues.

#### Étape 4.3 : Tests E2E

- Mettre en place un scénario E2E.
- Couvrir le parcours utilisateur complet.
- Ajouter des cas négatifs : API indisponible, question manquante, utilisateur non authentifié.

## Architecture cible proposée

### Dossier `src/`

- `src/frontend/` — code d’interface utilisateur.
- `src/application/` — orchestrateur et gestion de session.
- `src/domain/` — règles métier, entités et validation.
- `src/api/` — endpoints HTTP.
- `src/data/` — données initiales ou importées.

### Dossier `docs/`

- `docs/architecture/` — documentation d’analyse et de migration.
- `docs/security.md` — politique de sécurité pour Supabase et API.

### Serveur local

- Si nécessaire, ajouter un petit serveur Node.js/Express minimal pour l’API.
- Conserver la capacité de servir l’application statique sans bundler.

## Risques et décisions

- Ne pas casser la logique métier : garder les mêmes règles de jeu jusqu’à validation.
- Ne pas introduire de framework lourd inutilement.
- Créer une API légère qui pourra évoluer vers Supabase.
- Laisser `questions_tourismes.js` en dehors si elle n’est pas utilisée.

## Priorités de la phase 1

- Documenter l’état exact du projet.
- Faire l’inventaire des composants et des risques.
- Valider qu’il n’y a pas de tests ou de configuration existants.
- Ne rien modifier fonctionnellement.
