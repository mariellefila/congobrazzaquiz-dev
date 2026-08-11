# Spécification UI/UX

Status: In progress
Project: Brief UI/UX  (https://app.notion.com/p/Brief-UI-UX-3b8e1795086680bd8c12e0459fa8cf88?pvs=21)
version : V1

# 

---

## Sommaire

1. Vision UX
2. Design System
3. Architecture des écrans
4. Parcours Solo
5. Parcours Multijoueur
6. Parcours Mode Salle
7. Leaderboard
8. Contribution — Proposition de question
9. Publicité
10. Back-office Administration
11. Navigation transversale
12. Règles UX globales
13. Responsive
14. Accessibilité
15. Hypothèses UX

---

# 1. Vision UX

## 1.1 Objectif

Congo Brazza Quiz V2 fait évoluer le jeu Solo existant vers une plateforme culturelle, ludique et communautaire.

La plateforme doit permettre de :

- jouer seul ;
- jouer à plusieurs en temps réel ;
- organiser une partie en salle ;
- consulter les classements ;
- proposer des questions ;
- proposer des publicités ;
- administrer questions, utilisateurs, publicités et parties ;
- suivre l’activité via des KPI.

## 1.2 Principes UX

| Principe | Règle |
| --- | --- |
| **Mobile First** | Les écrans sont conçus pour mobile puis adaptés tablette/desktop. |
| **Action First** | Chaque écran doit avoir une action principale clairement identifiable. |
| **Une décision par écran** | Éviter de présenter plusieurs choix complexes au même niveau. |
| **Feedback immédiat** | Toute réponse, soumission, connexion ou changement d’état doit produire un feedback clair. |
| **Cohérence** | Les mêmes composants et tokens sont réutilisés dans tous les modes. |
| **Lisibilité** | Le contenu de la question reste prioritaire pendant une partie. |
| **Progression visible** | Question X/Y, timer et état de partie toujours compréhensibles. |
| **Temps réel maîtrisé** | En Multijoueur et Salle, l’état de connexion et de synchronisation doit être explicite. |
| **Contribution contrôlée** | Une question ou publicité proposée n’est jamais publiée automatiquement. |
| **Administration sobre** | Le back-office privilégie la lisibilité et la productivité plutôt que l’esthétique ludique. |

## 1.3 Personas

- **Visiteur**
- **Joueur**
- **Animateur / Hôte**
- **Contributeur**
- **Annonceur**
- **Administrateur**

---

# 2. Design System

## 2.1 Typographie

Famille principale : **Product Sans**

| Style CBQ | Variante | Poids | Desktop | Mobile | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | Product Sans Black | 900 | 48px | 36px | Hero, chiffres événementiels |
| H1 | Product Sans Bold | 700 | 36px | 30px | Titres de pages |
| H2 | Product Sans Bold | 700 | 30px | 26px | Grandes sections, modales |
| H3 | Product Sans Medium | 500 | 24px | 22px | Sous-sections |
| Question | Product Sans Bold | 700 | 28px | 22px | Question du quiz |
| Score XL | Product Sans Black | 900 | 32px | 28px | Podium, score final |
| Score | Product Sans Bold | 700 | 24px | 20px | Score pendant le jeu |
| Card Title | Product Sans Medium | 500 | 20px | 18px | Cartes |
| Body Large | Product Sans Regular | 400 | 18px | 18px | Introduction |
| Body | Product Sans Regular | 400 | 16px | 16px | Texte standard |
| Button | Product Sans Medium | 500 | 16px | 16px | Boutons |
| Label | Product Sans Medium | 500 | 14px | 14px | Labels, statuts |
| Navigation | Product Sans Medium | 500 | 15px | 14px | Navigation |
| Caption | Product Sans Regular | 400 | 13px | 12px | Informations secondaires |

## 2.2 Palette — Light

| Token | Valeur | Usage |
| --- | --- | --- |
| `--color-primary` | `#16A34A` | CTA, sélection, progression |
| `--color-primary-hover` | `#15803D` | Hover CTA |
| `--color-primary-soft` | `#ECFDF3` | Fond sélection/succès |
| `--color-secondary` | `#FBBF24` | Jeu, récompense |
| `--color-danger` | `#DC2626` | Erreur, quitter, supprimer |
| `--color-background` | `#F8FAF9` | Fond général |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-surface-secondary` | `#F5F7F6` | Zones secondaires |
| `--color-text-primary` | `#111827` | Titres, questions |
| `--color-text-secondary` | `#4B5563` | Body |
| `--color-text-muted` | `#6B7280` | Caption |
| `--color-border` | `#E5E7EB` | Bordures |
| `--color-border-strong` | `#D1D5DB` | Bordures fortes |
| `--color-overlay` | `rgba(17,24,39,.60)` | Overlay modal |

### Surfaces / Cards

| Type | Background | Border | Usage |
| --- | --- | --- | --- |
| Standard | `#FFFFFF` | `#E5E7EB` | Card générale |
| Interactive | `#FFFFFF` | `#D1D5DB` | Catégorie/mode |
| Selected | `#ECFDF3` | `#16A34A` | Card sélectionnée |
| Success | `#ECFDF3` | `#86EFAC` | Bonne réponse |
| Warning | `#FFFBEB` | `#FCD34D` | Avertissement |
| Error | `#FEF2F2` | `#FCA5A5` | Erreur |
| Info | `#EFF6FF` | `#93C5FD` | Information |
| Waiting | `#F9FAFB` | `#E5E7EB` | État attente |

### Dégradés de catégories

Utilisés uniquement pour identifier la catégorie dans le Quiz et les salles d’attente, dans une card blanche à bordure grise.

| Catégorie | Dégradé |
| --- | --- |
| Histoire | `#FF9A3C → #D62828` |
| Géographie | `#34D399 → #2563EB` |
| Gastronomie | `#FDCB3C → #F97316` |
| Littérature | `#10B981 → #84CC16` |
| Tourisme | `#38BDF8 → #8B5CF6` |
| Droit & Société | `#475569 → #B45309` |
| Aléatoire | `#8B5CF6 → #6D28D9` |

## 2.3 Spacing

| Token | Valeur |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |

## 2.4 Border Radius

| Token | Valeur | Usage |
| --- | --- | --- |
| `--radius-sm` | 8px | Badge / petit élément |
| `--radius-md` | 12px | Input / réponse |
| `--radius-lg` | 16px | Card |
| `--radius-xl` | 24px | Panel / Modal |
| `--radius-pill` | 9999px | CTA / badge |
| `--radius-circle` | 50% | Avatar |

## 2.5 Ombres

| Token | Valeur | Usage |
| --- | --- | --- |
| `--shadow-sm` | `0 1px 3px rgba(17,24,39,.08)` | Input / petite card |
| `--shadow-md` | `0 4px 12px rgba(17,24,39,.10)` | Card |
| `--shadow-lg` | `0 10px 30px rgba(17,24,39,.12)` | Panel |
| `--shadow-xl` | `0 20px 50px rgba(17,24,39,.18)` | Modal |

## 2.6 Motion

| Token | Durée | Usage |
| --- | --- | --- |
| `--duration-fast` | 120ms | Hover / focus |
| `--duration-normal` | 200ms | Card / bouton |
| `--duration-slow` | 300ms | Modal |
| `--duration-game` | 450ms | Score / classement |

## 2.7 Z-index

| Token | Valeur |
| --- | --- |
| `--z-base` | 0 |
| `--z-raised` | 10 |
| `--z-sticky` | 100 |
| `--z-dropdown` | 200 |
| `--z-tooltip` | 300 |
| `--z-overlay` | 400 |
| `--z-modal` | 500 |
| `--z-popover` | 600 |
| `--z-toast` | 700 |
| `--z-critical` | 800 |

## 2.8 Composants

### Boutons

- Primary
- Secondary
- Ghost
- Danger
- Icon

### Cards

- Category Card
- Game Mode Card
- Player Card
- Rule Card
- KPI Card
- Ranking Card
- Info Card

### Formulaires

- Input
- Select
- Textarea
- Checkbox
- Radio
- Upload
- Search
- Form Error
- Form Hint

### Quiz

- Progress
- Category Badge
- Question
- Answer
- Timer
- Score
- Feedback
- Next Action

### Multijoueur / Salle

- Game Code
- QR Code
- Player Avatar
- Player Status
- Player List
- Lobby
- Room Settings
- External Screen Selector
- Room Actions

### Leaderboard

- Podium
- Ranking Row
- Current Player
- Score Badge

### Modal

- Modal Header
- Modal Body
- Modal Footer
- Close
- Overlay

## 2.9 Breakpoints

| Point | Usage |
| --- | --- |
| `<480px` | Petit mobile |
| `480–639px` | Mobile |
| `640–767px` | Grand mobile |
| `768–1023px` | Tablette |
| `1024–1279px` | Desktop |
| `≥1280px` | Large desktop / Mode Salle |

## 2.10 Dark Mode

Le thème sombre est prévu par le Design System mais peut être livré en phase ultérieure.

- Background : `#0F1412`
- Surface : `#171D1A`
- Surface soft : `#1F2723`
- Text : `#F9FAFB`
- Text secondary : `#C4CBC7`
- Border : `rgba(255,255,255,.08)`
- Overlay : `rgba(0,0,0,.72)`

---

# 3. Architecture des écrans

Les maquettes V2 se répartissent en grandes familles :

1. Landing
2. Connexion
3. Choix catégorie
4. Choix mode
5. Quiz
6. Créer / rejoindre une partie
7. Administration de partie
8. Lobby / salle d’attente
9. Réponse enregistrée
10. Résultats intermédiaires
11. Leaderboard global
12. Mode Salle — sélection écran externe
13. Mode Salle — écran animateur
14. Mode Salle — écran participant
15. Formulaire email
16. Proposition de question
17. Proposition de publicité
18. Back-office Dashboard
19. Questions
20. Utilisateurs
21. Publicités
22. Parties
23. Paramètres

Les variantes, états, modales et responsive portent le volume total de maquettes au-delà de ces familles.

---

# 4. Parcours Solo

```
Landing
  ↓
Choix catégorie
  ↓
Choix mode
  ↓
Solo
  ↓
Question
  ↓
Feedback
  ↓
Question suivante
  ↓
Résultat
  ↓
Leaderboard
```

## Règles

- Une réponse validée ne peut plus être modifiée.
- Question et réponses occupent la zone visuelle principale.
- Progression visible : `Question 3/20`.
- Timer visible sans concurrencer la question.
- Feedback correct/incorrect explicite par couleur + symbole.
- Score mis à jour après validation.

---

# 5. Parcours Multijoueur

## 5.1 Créer ou rejoindre

Écran à deux choix :

- **Créer une partie**
- **Rejoindre une partie**

### Création

1. Choisir catégorie
2. Définir règles
3. Générer code
4. Générer QR
5. Inviter
6. Attendre les joueurs
7. Verrouiller
8. Démarrer

### Rejoindre

1. Saisir code ou scanner QR
2. Choisir pseudo
3. Choisir avatar
4. Rejoindre lobby
5. Attendre démarrage

## 5.2 Administration de partie

Contenu :
- code de partie ;
- QR ;
- catégorie ;
- nombre de questions ;
- scoring ;
- temps ;
- joueurs présents ;
- verrouillage ;
- démarrage ;
- quitter.

## 5.3 Lobby

Chaque joueur affiche :
- avatar ;
- pseudo ;
- rôle ;
- état de connexion.

Statuts :
- En ligne
- En attente
- Déconnecté

---

# 6. Mode Salle

## 6.1 Principe

Le Mode Salle nécessite un **écran externe** pour l’affichage collectif.

L’animateur ne peut pas lancer la salle tant qu’un écran externe n’est pas sélectionné.

## 6.2 Écran préalable

Titre : **Avant de créer votre salle**

Contenu :
- message expliquant l’obligation d’un écran externe ;
- liste des écrans détectés ;
- résolution ;
- écran recommandé ;
- actualiser ;
- continuer.

Règle bloquante :

> Aucun écran externe sélectionné = CTA Continuer désactivé.
> 

## 6.3 Écran collectif

Affiche :
- question ;
- réponses ;
- timer ;
- progression ;
- nombre de joueurs ;
- résultats intermédiaires ;
- podium final.

## 6.4 Smartphone participant

Affiche :
- question ;
- réponses ;
- confirmation de réponse ;
- attente des autres joueurs ;
- classement si prévu.

---

# 7. Leaderboard

## Leaderboard global

Contenu :
- podium Top 3 ;
- Top 10 ;
- score ;
- pseudo/avatar ;
- position de l’utilisateur courant ;
- statistiques de réponses par catégorie.

Hiérarchie :
- podium très visuel ;
- liste compacte ;
- utilisateur courant mis en évidence.

---

# 8. Contribution — Proposition de question

## Flow

```
Landing
  ↓
Proposer une question
  ↓
Vos informations
  ↓
Détails de la question
  ↓
Prévisualisation
  ↓
Soumettre
  ↓
Confirmation
```

## Informations

- nom ;
- email.

## Question

- catégorie ;
- question ;
- bonne réponse ;
- mauvaises réponses ;
- image optionnelle.

## Workflow

`Soumise → En attente → Approuvée / Refusée → Publiée`

---

# 9. Publicité

## Formulaire

- annonceur ;
- titre ;
- description ;
- visuel ;
- URL ;
- emplacement ;
- dates ;
- aperçu Desktop / Tablette / Mobile.

## Workflow

`Brouillon → Soumise → Validée → Programmée → Active → Terminée`

Aucune publicité publique sans validation.

---

# 10. Back-office Administration

## 10.1 Navigation

```
Dashboard
├── Questions
├── Utilisateurs
├── Parties
├── Publicités
└── Paramètres
```

## 10.2 Dashboard

KPI :
- utilisateurs actifs ;
- parties jouées ;
- questions ;
- joueurs en ligne ;
- publicités actives ;
- contributions en attente.

## 10.3 Questions

Fonctions :
- recherche ;
- filtre ;
- statut ;
- création ;
- modification ;
- approbation ;
- refus ;
- suppression.

## 10.4 Utilisateurs

- pseudo ;
- email ;
- rôle ;
- date d’inscription ;
- parties ;
- statut.

## 10.5 Publicités

- campagne ;
- annonceur ;
- emplacement ;
- période ;
- statut ;
- aperçu ;
- activation/désactivation.

## 10.6 Parties

- mode ;
- hôte ;
- joueurs ;
- état ;
- date ;
- score / résultat.

---

# 11. Navigation transversale

## Front

- Classement
- Proposer une question
- Proposer une pub
- Profil / Connexion

## Jeu

Navigation réduite au minimum pour ne pas distraire.

## Admin

Sidebar desktop ; drawer mobile.

---

# 12. Règles UX globales

## Feedback

- toast de succès ;
- message erreur ;
- loading state ;
- empty state ;
- offline state.

## Action irréversible

Suppression, refus, quitter une partie en cours → confirmation obligatoire.

## Temps réel

Affichage clair :
- connecté ;
- reconnexion ;
- déconnecté.

## Formulaires

- labels visibles ;
- validation au bon moment ;
- message d’erreur sous le champ ;
- bouton désactivé si données invalides.

---

# 13. Responsive

## Mobile

- 1 colonne ;
- boutons principaux pleine largeur ;
- cards empilées ;
- modales quasi plein écran ;
- actions tactiles ≥ 44px.

## Tablette

- 2 colonnes quand pertinent.

## Desktop

- conteneur max 1200px ;
- formulaire + preview côte à côte ;
- lobby / règles en colonnes.

## Mode Salle

- grand écran optimisé pour lecture à distance.

---

# 14. Accessibilité

- WCAG 2.2 AA cible ;
- contraste texte 4.5:1 ;
- focus visible ;
- navigation clavier ;
- labels persistants ;
- aria-live pour temps réel ;
- feedback non basé uniquement sur la couleur ;
- `prefers-reduced-motion`;
- taille tactile ≥ 44×44px.

---

# 15. Hypothèses UX

| # | Hypothèse |
| --- | --- |
| H1 | Product Sans reste la famille officielle. |
| H2 | Le vert CBQ est l’accent principal de l’interface. |
| H3 | Les dégradés catégories servent uniquement à identifier la catégorie dans Quiz/Lobby. |
| H4 | Solo, Multijoueur et Salle réutilisent le même moteur de questions. |
| H5 | Une réponse envoyée ne peut plus être modifiée. |
| H6 | Le Multijoueur utilise un code et un QR. |
| H7 | Le Mode Salle exige un écran externe avant création/lancement. |
| H8 | Les questions et publicités proposées nécessitent une validation admin. |
| H9 | Le back-office est plus sobre que le Front. |
| H10 | Le responsive est Mobile First. |
| H11 | Les composants sont mutualisés et gouvernés par les tokens du Design System. |
| H12 | Dark Mode est prévu mais pas nécessairement inclus dans le MVP. |

---

# Règle de référence

> Les maquettes validées constituent la source visuelle de référence.
> 
> 
> Cette spécification formalise les règles d’UX, de responsive et de composants permettant de les implémenter de manière cohérente.
> 

> GitHub Copilot ne doit pas introduire de nouvelle couleur, variante typographique, espacement, rayon ou composant sans justification et sans réutiliser d’abord le Design System existant.
>