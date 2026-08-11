# Intégration Supabase — Congo-Brazza Quizz

Ce guide explique comment configurer et déployer l'intégration Supabase pour le projet.

## 📋 Table des matières

1. [Configuration initiale Supabase](#configuration-initiale-supabase)
2. [Créer les secrets GitHub](#créer-les-secrets-github)
3. [Appliquer les migrations](#appliquer-les-migrations)
4. [Importer les données](#importer-les-données)
5. [Configurer OAuth (Google/Facebook)](#configurer-oauth)
6. [Configuration frontend](#configuration-frontend)
7. [Tests locaux](#tests-locaux)
8. [Déploiement sur GitHub Pages](#déploiement-sur-github-pages)

---

## Configuration initiale Supabase

1. **Créer un projet Supabase** (si pas déjà fait)
   - Allez sur [https://app.supabase.com](https://app.supabase.com)
   - Créez un nouveau projet
   - Notez l'URL et la clé `anon` publique

2. **Récupérer les credentials**
   - **Supabase Project URL**: `Settings > API > URL`
   - **Supabase Anon Key**: `Settings > API > anon public`
   - **Supabase Service Role Key**: `Settings > API > service_role secret` (pour les migrations/imports)
   - **Supabase Access Token**: `Account > Access Tokens` (pour CLI)

---

## Créer les secrets GitHub

Dans votre repo GitHub : **Settings > Secrets and variables > Codespaces**

Ajoutez 3 secrets :

| Nom | Valeur | Utilité |
|-----|--------|---------|
| `SUPABASE_ACCESS_TOKEN` | Token d'accès Supabase | Pour CLI (migrations push) |
| `SUPABASE_DB_URL` | `postgresql://...` ou laissez vide | URL PostgreSQL directe (optionnelle) |
| `SUPABASE_PROJECT_REF` | Ex: `abcxyz123` | Référence du projet (optionnelle) |

**Important**: N'ajoutez PAS la clé `service_role` ni la clé `anon` ici ! Elles seront dans le frontend (.env.local) et le script d'import.

---

## Appliquer les migrations

### Depuis le Codespace (recommandé)

```bash
# 1. Initialiser supabase CLI
supabase login --token $SUPABASE_ACCESS_TOKEN

# 2. Vérifier le fichier de migration
cat supabase/migrations/20260811_init_schema.sql

# 3. Pousser les migrations vers Supabase
supabase db push

# 4. Vérifier le résultat
supabase db ls
```

### Depuis Supabase Studio (manuel)

1. Ouvrez [https://app.supabase.com](https://app.supabase.com) → Projet
2. Allez sur l'onglet **SQL Editor**
3. Créez une nouvelle query
4. Copiez-collez le contenu de `supabase/migrations/20260811_init_schema.sql`
5. Exécutez

---

## Importer les données

### Option 1 : Via le script Node.js (depuis le Codespace)

```bash
# 1. Installer @supabase/supabase-js si besoin
npm install

# 2. Exécuter le script d'import avec la clé service_role
# Récupérez votre clé service_role depuis Settings > API de Supabase
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_SERVICE_KEY="your-service-role-key" \
node scripts/import-data.js
```

### Option 2 : Via Supabase Studio (manuel)

1. Allez dans **SQL Editor** → **New Query**
2. Copiez le SQL ci-dessous pour chaque catégorie de `src/data/allQuestions.js`

```sql
-- Exemple pour une catégorie
INSERT INTO public.categories (id, name, slug)
VALUES ('histoire', 'Histoire', 'histoire');

INSERT INTO public.questions (id, category_id, question, options, answer, image)
VALUES 
  ('histoire-q1', 'histoire', 'Quelle est la capitale ?', '["Brazzaville", "Kinshasa", "Libreville"]', 'Brazzaville', NULL),
  ('histoire-q2', 'histoire', 'Quelle est la date d\'indépendance ?', '["1960", "1961", "1962"]', '1960', NULL);
```

3. Ajoutez les publicités :

```sql
INSERT INTO public.advertisements (id, image_url, link_url, title, active)
VALUES 
  ('ad-1', 'reseau120bannere.jpg', 'https://...', 'Réseau 120', TRUE),
  ('ad-2', 'publicite02.jpg', 'https://...', 'Pub 02', TRUE);
```

---

## Configurer OAuth

### Google OAuth

1. Créez une app dans [Google Cloud Console](https://console.cloud.google.com/)
2. Créez des **OAuth 2.0 Client IDs** (type: Web application)
3. Dans Supabase Studio → **Auth > Providers > Google**
   - Copiez le **Client ID** et **Client Secret**
   - Configurez l'URI de redirection : `https://mariellefila.github.io/congo-brazza-quizz/auth/callback`
4. Sauvegardez

### Facebook OAuth

1. Créez une app dans [Facebook Developers](https://developers.facebook.com/)
2. Configurez les paramètres OAuth
3. Dans Supabase Studio → **Auth > Providers > Facebook**
   - Copiez l'**App ID** et **App Secret**
   - Configurez l'URI de redirection : `https://mariellefila.github.io/congo-brazza-quizz/auth/callback`
4. Sauvegardez

---

## Configuration frontend

### 1. Créer le fichier de config

Créez `supabase-config.js` à la racine (`.gitignore`d):

```javascript
// supabase-config.js (NOT COMMITTED - .gitignored)
window.SUPABASE_URL = 'https://your-project.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Ou** définir via variables d'environnement build-time (Vite/Next.js).

### 2. Charger la config dans index.html

`index.html` charge déjà le client Supabase dynamiquement (voir notre ajout précédent).

### 3. Variables d'environnement (si utilisation de Vite/build)

Créez `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Tests locaux

### Vérifier la connexion à Supabase

```javascript
// Dans la console du navigateur
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient('https://your-project.supabase.co', 'your-anon-key');
await supabase.from('categories').select('*').limit(1);
```

### Vérifier les policies RLS

1. Ouvrez Supabase Studio
2. Allez dans **SQL Editor**
3. Exécutez comme **anonymous** (via anon key):

```sql
-- Doit retourner les catégories
SELECT * FROM public.categories LIMIT 1;

-- Doit retourner les questions (sans answer)
SELECT * FROM public.questions_public LIMIT 1;

-- Ne doit PAS retourner les answers
SELECT * FROM public.questions LIMIT 1; -- Column "answer" not visible
```

4. Testez avec la clé **service_role** pour voir les différences.

---

## Déploiement sur GitHub Pages

1. **Vérifier la config**
   - Assurez-vous que `supabase-config.js` ou les variables sont correctes
   - Testez localement que Supabase se charge bien

2. **Push vers GitHub**
   ```bash
   git add .
   git commit -m "feat: integrate Supabase (schema, migration, import)"
   git push origin main
   ```

3. **GitHub Pages se redéploie automatiquement**
   - L'app frontend chargera Supabase via le CDN
   - Actualisez et testez live

4. **Vérifier les redirects OAuth**
   - Testez le login Google/Facebook
   - Vérifiez que les redirects retournent bien vers `https://mariellefila.github.io/congo-brazza-quizz/auth/callback`

---

## Troubleshooting

### Error: "Supabase client not initialized"
- Vérifiez que `supabase-config.js` est chargé **avant** `src/frontend/ui.js`
- Vérifiez `window.SUPABASE_URL` et `window.SUPABASE_ANON_KEY` dans la console

### Error: "permission denied" ou "new row violates row-level security policy"
- Vérifiez les policies RLS dans Supabase Studio
- Testez avec un user authentifié (après login OAuth)
- Vérifiez que `auth.uid()` retourne une valeur valide

### Les questions ne s'affichent pas
- Vérifiez que les migrations ont été appliquées : `SELECT COUNT(*) FROM categories;`
- Vérifiez que le script d'import s'est exécuté sans erreur
- Vérifiez la console du navigateur pour les erreurs

### Publicités ne s'affichent pas
- Vérifiez que les rows `advertisements` avec `active = true` existent
- Vérifiez que la logique de rotation dans `index.html` s'exécute correctement

---

## Fichiers importants

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/20260811_init_schema.sql` | Schéma BD complet + RLS policies |
| `scripts/import-data.js` | Script Node.js pour importer questions/pubs |
| `supabase-config.example.js` | Exemple de config frontend |
| `src/lib/supabaseClient.js` | Client Supabase côté frontend |
| `src/domain/questionRepository.js` | Repository avec support Supabase + fallback local |
| `src/frontend/ui.js` | UI adaptée pour init asynchrone Supabase |

---

## Prochaines étapes

- [ ] Implémenter l'UI d'authentification (login/logout)
- [ ] Ajouter l'UI pour créer/rejoindre des salles de jeu (multiplayer)
- [ ] Implémenter les subscriptions Realtime pour les parties multi
- [ ] Ajouter tests Playwright pour les flows Supabase
- [ ] Documenter les opérations d'administration (ajouter questions, bannir players, etc.)
