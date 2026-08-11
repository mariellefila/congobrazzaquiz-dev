# Manifest Rebuild V2 - Congo Brazza Quizz

Statut: draft operationnel
Portee: cadrage de la creation et de la modification des ecrans/pages V2
Contexte: site statique deploye sur GitHub Pages + integration Supabase en phase 1 terminee

## 1) Objectif du manifest

Ce document definit une methode unique pour:

- creer une nouvelle page V2,
- modifier une section d'une page existante,
- garder la coherence avec le Design System V2,
- respecter les regles UX/UI,
- rester compatible GitHub Pages,
- ne pas casser les flux quiz existants ni le fallback local/Supabase.

## 2) Rappels d'architecture actuelle (base de depart)

- Frontend principal: `index.html` + `style.css` + `src/frontend/ui.js`.
- Couches applicatives deja en place:
  - `src/api/quizApi.js`
  - `src/application/quizService.js`
  - `src/domain/*`
  - `src/data/allQuestions.js`
- Supabase:
  - init client dans `src/lib/supabaseClient.js`
  - repository async avec fallback local dans `src/domain/questionRepository.js`
- Tests e2e: Playwright (`tests/quiz.spec.js`).

Decision: V2 doit continuer sur cette separation (UI -> API interne -> application -> domain -> data/repository).

## 3) Contraintes non negociables

### 3.1 GitHub Pages

- Pas de backend Node runtime sur le site.
- Tout doit fonctionner en fichiers statiques (HTML/CSS/JS modules).
- Les assets doivent etre references en chemins relatifs stables.
- Les pages doivent etre accessibles directement par URL statique.

### 3.2 Supabase

- Cle `anon` uniquement cote client.
- Jamais de `service_role` dans le frontend.
- Les reponses correctes ne doivent pas etre exposees avant validation.
- Garder un mode degrade/fallback local quand Supabase n'est pas disponible.

### 3.3 Design System + UX spec

- Mobile-first.
- Action principale evidente par ecran.
- Une decision principale par ecran.
- Feedback immediat sur actions utilisateur.
- Reutilisation des tokens et composants (typographie, couleurs, spacing, radius, motion).

## 4) Structure cible recommandee pour V2

## 4.1 Pages

Creer un dossier pages statiques dedie:

- `index.html` (landing / entree)
- `pages/quiz.html`
- `pages/multijoueur.html`
- `pages/salle.html`
- `pages/leaderboard.html`
- `pages/proposer-question.html`
- `pages/proposer-publicite.html`

Note: si la migration est progressive, `index.html` peut temporairement rester point d'entree principal et charger des sections V2 incrementales.

## 4.2 JS frontend

- `src/frontend/pages/` : scripts d'initialisation par page.
- `src/frontend/components/` : composants UI reutilisables.
- `src/frontend/state/` : etat UI local par page si necessaire.
- `src/frontend/navigation/` : helpers de navigation/pages.

## 4.3 CSS

- `style.css` garde la compatibilite legacy.
- Ajouter `src/frontend/styles/tokens.css` (variables design system).
- Ajouter `src/frontend/styles/components.css` (boutons, cards, forms, badges, modal).
- Ajouter `src/frontend/styles/layout.css` (grille, sections, responsive).

## 5) Workflow: creer une nouvelle page

## 5.1 Etape 1 - Definition fonctionnelle

Pour chaque nouvelle page, definir:

- objectif unique de la page,
- action principale,
- donnees necessaires (locales ou Supabase),
- etats UX minimums: loading, vide, erreur, succes.

Sortie attendue: mini spec de page (1 bloc markdown) avant implementation.

## 5.2 Etape 2 - Squelette HTML statique

Creer la page dans `pages/` avec:

- `header` commun,
- `main` avec sections semantiques,
- `footer` (version/build si utile),
- liens vers CSS communs,
- script module dedie a la page.

Convention:

- utiliser des attributs `data-page` et `data-section` pour clarifier le ciblage JS/CSS,
- limiter les `id` globaux aux points d'ancrage de script.

## 5.3 Etape 3 - Composition UI par composants

- assembler la page avec composants design system (cards, boutons, formulaires, labels).
- ne pas coder les styles inline via JS (sauf exception justifiee).
- appliquer les tokens (couleurs, typo, espaces) plutot que des valeurs hardcodees.

## 5.4 Etape 4 - Branchement data

- utiliser `quizApi`/`quizService`/repositories existants.
- si besoin de nouvelles donnees Supabase, ajouter un adapter dans `src/domain` ou `src/api`.
- toujours prevoir fallback local ou etat non connecte.

## 5.5 Etape 5 - Accessibilite et UX

- hierarchie des titres (H1 unique, puis H2/H3),
- contrastes conformes,
- focus visible clavier,
- labels explicites sur inputs/actions,
- messages d'etat lisibles (erreur/succes/chargement).

## 5.6 Etape 6 - Validation

- test manuel desktop + mobile,
- test du chemin nominal,
- test des etats erreur/fallback,
- ajout/adaptation de tests Playwright pour le flux principal.

## 6) Workflow: modifier une section d'une page

## 6.1 Regle de base

Modifier une section sans regression sur:

- logique metier,
- navigation,
- timer/score pour le quiz,
- authentification/fallback Supabase.

## 6.2 Procedure standard

1. Identifier la section cible (`data-section` ou conteneur dedie).
2. Lister ce qui depend de cette section (JS events, classes CSS, donnees).
3. Isoler le changement:
   - HTML: structure de la section,
   - CSS: style de la section,
   - JS: comportements strictement lies.
4. Verifier les effets de bord sur les autres sections/page.
5. Executer les tests impactes.

## 6.3 Matrice d'impact minimale

Avant merge, verifier:

- compatibilite responsive,
- etats chargement/erreur,
- accessibilite clavier,
- coherence visuelle avec tokens,
- absence de style inline ajoute dans la logique JS.

## 7) Contrat d'integration Supabase pour V2

Toute nouvelle section/page utilisant Supabase doit respecter:

- initialisation defensive du client,
- gestion explicite des erreurs reseau/API,
- UI de mode invite si non connecte,
- aucune logique sensible cote client,
- validation sensible cote base/RLS/RPC.

Pattern recommande:

1. UI demande action
2. `src/api/*` orchestre l'appel
3. repository/domain transforme les donnees
4. UI affiche succes/erreur/fallback

## 8) Convention de livraison pour chaque ecran V2

Definition of Done (DoD):

- Page/section alignee UX spec (action principale claire).
- Design conforme tokens typographie/couleurs/espacements.
- Fonctionne sur mobile, tablette, desktop.
- Aucun blocage si Supabase indisponible (fallback prevu).
- Tests manuels faits + tests Playwright maj/ajoutes si flux critique.
- Documentation courte ajoutee dans `docs/architecture/frontend.md` si structure modifiee.

## 9) Priorites de build pour le rebuild V2

Ordre de construction recommande:

1. Fondations UI
   - tokens CSS
   - composants globaux (Button, Card, Form, Badge, Alert)
2. Landing + choix categorie/mode
3. Quiz solo V2 (sans regression)
4. Auth UI (Google/Facebook) + profil joueur
5. Multijoueur (creer/rejoindre/lobby)
6. Leaderboard
7. Formulaires contribution question/publicite
8. Back-office (phase separee si necessaire)

## 10) Gouvernance des changements

Pour chaque PR V2, inclure:

- ce qui est cree/modifie (page/section),
- impact data/Supabase,
- impact UX (etats, feedback),
- impact tests,
- captures desktop/mobile.

Ce manifest est la reference de cadrage pour les evolutions V2 tant que le lot rebuild n'est pas finalise.