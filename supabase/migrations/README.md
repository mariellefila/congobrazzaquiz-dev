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

### `20260826_solo_game_answers.sql`

Historique détaillé des parties solo.

**Table `solo_game_answers`** — une ligne par réponse, reliée à `solo_games` :

| Colonne | Type | Notes |
| --- | --- | --- |
| `id` | `UUID` | PK, `gen_random_uuid()` |
| `solo_game_id` | `UUID` | FK `solo_games(id)` `ON DELETE CASCADE` |
| `question_id` | `TEXT` | identifiant de la question jouée |
| `question_order` | `INT` | rang de la question dans la partie (1..N) |
| `selected_option` | `TEXT` | `NULL` si le temps est écoulé |
| `is_correct` | `BOOLEAN` | |
| `elapsed_seconds` | `NUMERIC(6,2)` | temps de réponse, borné par le timer (20 s) |
| `answered_at` | `TIMESTAMPTZ` | `NOW()` |

**Sécurité :**
- RLS activée ; `solo_game_answers_owner_read` limite la lecture aux parties du joueur courant.
- Aucune écriture directe : policy `INSERT WITH CHECK (FALSE)` et `REVOKE INSERT/UPDATE/DELETE/TRUNCATE` pour `anon` et `authenticated`. Seul `record_solo_game` (SECURITY DEFINER) écrit.

**Indexes :**
- `idx_solo_game_answers_game (solo_game_id, question_order)`
- `idx_solo_game_answers_question (question_id)`

**RPC `record_solo_game` (contrat mis à jour) :**

```
record_solo_game(p_category_slug TEXT, p_category_name TEXT, p_score INT,
                 p_results BOOLEAN[], p_answers JSONB DEFAULT NULL)
```

- `p_answers` est un tableau JSONB ordonné : `{ question_id, question_order, selected_option, is_correct, elapsed_seconds }`.
- Paramètre optionnel : les appels sans `p_answers` restent valides et n'enregistrent que l'agrégat dans `solo_games`.
- La partie, le détail des réponses, l'XP, les séries et les badges sont écrits dans **la même transaction** : l'échec d'une réponse annule l'ensemble (aucune partie ni XP fantôme).
- Les règles de score et d'XP sont inchangées par cette migration.

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
