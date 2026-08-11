# Supabase Migrations

Ce dossier contient les migrations SQL pour initialiser et gérer le schéma de base de données du projet Congo-Brazza Quizz.

## Fichiers

### `20260811_init_schema.sql`

Migration initiale qui crée :

**Tables principales :**
- `categories` — Catégories de questions (histoire, géographie, etc.)
- `questions` — Questions avec options et réponses
- `advertisements` — Publicités affichées sur le site
- `players` — Profils de joueurs (authentifiés)
- `games` — Sessions de jeu multiplayer
- `game_players` — Membres d'une partie (many-to-many)
- `answers` — Réponses des joueurs aux questions

**Views :**
- `questions_public` — Vue publique sans colonne `answer` (pour le frontend)

**RLS Policies :**
- Public read pour catégories, questions (via view), publicités, players, games
- Authentification requise pour créer/modifier players, games, answers
- Chaque joueur ne peut modifier que ses propres données

**RPC Functions :**
- `validate_answer(game_id, player_id, question_id, selected_option)` — Valide une réponse côté serveur et met à jour les scores

**Indexes :**
- Index sur `category_id`, `player_id`, `game_id` pour les performances

## Utilisation

### Appliquer les migrations

```bash
# Connectez-vous à Supabase via CLI
supabase login --token $SUPABASE_ACCESS_TOKEN

# Poussez les migrations vers le projet
supabase db push

# Vérifiez les tables créées
supabase db ls
```

### Réinitialiser localement

```bash
# Reset la base locale (dev uniquement)
supabase db reset
```

### Tester une migration avant de la pousser

```bash
# Créez une base de test locale
supabase start

# Testez la migration
supabase db push

# Arrêtez le conteneur
supabase stop
```

## Ajouter une nouvelle migration

```bash
# Créez une nouvelle migration vierge
supabase migration new add_new_feature

# Éditez le fichier .sql généré
nano supabase/migrations/TIMESTAMP_add_new_feature.sql

# Testez localement
supabase db reset
supabase db push

# Poussez vers le projet distant
supabase db push
```

## Notes

- Les migrations sont versionnées par timestamp (ISO 8601)
- Chaque migration est idempotente autant que possible
- Les scripts d'import de données (via `scripts/import-data.js`) exécutent les insertions APRÈS les migrations
