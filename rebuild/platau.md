# MISSION — CONGO BRAZZA QUIZ V2
## Implémenter le nouveau système visuel des catégories

Tu travailles sur le projet existant Congo Brazza Quiz V2.

Je veux que tu modifies l'implémentation actuelle des catégories afin qu'elle corresponde au nouveau Design System.

IMPORTANT :
- Travaille directement sur le code existant.
- Analyse d'abord l'architecture actuelle avant de modifier quoi que ce soit.
- Réutilise les composants, classes et variables existants lorsque c'est pertinent.
- Ne recrée pas inutilement des composants déjà présents.
- Ne casse aucune fonctionnalité existante.
- Ne modifie pas le parcours utilisateur.
- Ne remplace pas les assets SVG existants.
- Ne crée pas une nouvelle page si l'élément existe déjà sous forme de modale.
- Ne modifie pas la vidéo de fond de la landing page.
- Ne change pas les comportements fonctionnels des boutons.
- Le travail demandé ici concerne principalement le système visuel des catégories.

--------------------------------------------------
1. OBJECTIF VISUEL
--------------------------------------------------

Chaque catégorie de Congo Brazza Quiz doit posséder une identité visuelle immédiatement reconnaissable composée de :

1. son emoji de référence ;
2. son nom ;
3. son dégradé de couleurs officiel ;
4. son asset SVG existant lorsque le contexte utilise une card illustrée.

Le point le plus important :

LE TEXTE DU NOM DE LA CATÉGORIE DOIT ÊTRE EN DÉGRADÉ.

Je ne veux PAS :
- un texte blanc par défaut ;
- un texte noir ;
- une simple couleur unie ;
- un rectangle en dégradé derrière un texte blanc ;
- un dégradé uniquement appliqué au background.

Je veux que les LETTRES DU NOM DE LA CATÉGORIE soient elles-mêmes en dégradé.

Exemple :

🛕 Histoire

L'emoji reste normal.
Le mot "Histoire" passe progressivement de l'orange au rouge.

--------------------------------------------------
2. PALETTE OFFICIELLE DES CATÉGORIES
--------------------------------------------------

Utiliser exactement ces catégories et ces dégradés.

HISTOIRE
Emoji : 🛕
Gradient :
#FF9A3C → #E53935

GÉOGRAPHIE
Emoji : 🌍
Gradient :
#26C6DA → #1976D2

POLITIQUE
Emoji : 🏛️
Gradient :
#FFB74D → #8D4E26

LITTÉRATURE
Emoji : 📚
Gradient :
#43A047 → #1E7E34

TOURISME
Emoji : ✈️
Gradient :
#4DD0E1 → #0097A7

DROIT & SOCIÉTÉ
Emoji : ⚖️
Gradient :
#607D8B → #263238

ALÉATOIRE
Emoji : 🎲
Gradient :
#BDBDBD → #424242

--------------------------------------------------
3. VARIABLES DU DESIGN SYSTEM
--------------------------------------------------

Centralise les gradients.

Ne répète pas les valeurs hexadécimales partout dans le projet.

Utilise le système de styles déjà présent si le projet possède déjà des design tokens.

Sinon, ajoute des variables sémantiques équivalentes à :

:root {
  --gradient-histoire:
    linear-gradient(90deg, #FF9A3C 0%, #E53935 100%);

  --gradient-geographie:
    linear-gradient(90deg, #26C6DA 0%, #1976D2 100%);

  --gradient-politique:
    linear-gradient(90deg, #FFB74D 0%, #8D4E26 100%);

  --gradient-litterature:
    linear-gradient(90deg, #43A047 0%, #1E7E34 100%);

  --gradient-tourisme:
    linear-gradient(90deg, #4DD0E1 0%, #0097A7 100%);

  --gradient-droit:
    linear-gradient(90deg, #607D8B 0%, #263238 100%);

  --gradient-aleatoire:
    linear-gradient(90deg, #BDBDBD 0%, #424242 100%);
}

Si le projet possède déjà un fichier de tokens / variables / thème :
INTÈGRE ces variables dans ce fichier au lieu de créer une deuxième architecture parallèle.

--------------------------------------------------
4. TEXTE EN DÉGRADÉ
--------------------------------------------------

Créer ou adapter une classe réutilisable permettant d'appliquer le gradient au TEXTE.

Principe attendu :

.category-title {
  display: inline-block;
  background: var(--category-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

Puis associer chaque catégorie à son gradient.

Exemple conceptuel :

.category--histoire {
  --category-gradient: var(--gradient-histoire);
}

.category--geographie {
  --category-gradient: var(--gradient-geographie);
}

.category--politique {
  --category-gradient: var(--gradient-politique);
}

.category--litterature {
  --category-gradient: var(--gradient-litterature);
}

.category--tourisme {
  --category-gradient: var(--gradient-tourisme);
}

.category--droit {
  --category-gradient: var(--gradient-droit);
}

.category--aleatoire {
  --category-gradient: var(--gradient-aleatoire);
}

Adapte les noms de classes à l'architecture existante du projet.

NE CRÉE PAS une nouvelle convention CSS si une convention existe déjà.

--------------------------------------------------
5. CONTEXTES D'UTILISATION
--------------------------------------------------

Ce système doit devenir la référence unique lorsque l'application affiche une catégorie.

Il doit notamment être utilisable dans :

- le quiz ;
- le badge de catégorie d'une question ;
- les salles d'attente ;
- les écrans de résultat ;
- le leaderboard si une catégorie y est affichée ;
- les écrans multijoueur ;
- le mode Salle ;
- les composants de navigation qui affichent une catégorie ;
- les formulaires lorsque la catégorie est affichée ;
- les autres composants existants qui utilisent explicitement le nom d'une catégorie.

Quand le contexte utilise :

emoji + nom

le résultat attendu est par exemple :

🛕 Histoire
🌍 Géographie
🏛️ Politique
📚 Littérature
✈️ Tourisme
⚖️ Droit & société
🎲 Aléatoire

avec le NOM en gradient.

--------------------------------------------------
6. CARDS ET BADGES
--------------------------------------------------

ATTENTION :

Ne transforme PAS toutes les interfaces en gros rectangles de couleur.

Le Design System de Congo Brazza Quiz repose principalement sur :

- fond blanc ;
- cards blanches ;
- contours gris clair ;
- ombres légères ;
- grands rayons de bordure ;
- interfaces aérées ;
- architecture de pop-up / modales ;
- couleurs utilisées comme accent visuel.

Par conséquent :

CARD STANDARD

Fond :
blanc.

Bordure :
gris clair.

Ombre :
subtile.

Nom de catégorie :
gradient officiel.

Emoji :
couleurs natives.

Le gradient sert principalement à identifier la catégorie.

--------------------------------------------------
7. BADGE DE CATÉGORIE DANS LE QUIZ
--------------------------------------------------

Pendant une question du quiz, la catégorie doit pouvoir être affichée dans une petite card/badge blanc.

Exemple :

┌─────────────────────┐
│ 🛕 Histoire         │
└─────────────────────┘

Le conteneur reste :

- blanc ou très légèrement teinté ;
- contour gris clair ;
- propre et minimaliste.

Mais :

"Histoire"

doit utiliser :

#FF9A3C → #E53935

Même principe pour toutes les autres catégories.

--------------------------------------------------
8. MODALE DE CHOIX DES CATÉGORIES
--------------------------------------------------

IMPORTANT :

La sélection des catégories n'est PAS une page indépendante.

Elle appartient au parcours :

Landing page
→ clic sur JOUER
→ choix du MODE DE JEU
→ clic sur JOUER SEUL
→ ouverture de la MODALE de choix des catégories.

La landing page reste visible derrière.

Le fond de la landing page est la VIDÉO existante.

Lorsqu'une modale est ouverte :

- conserver la vidéo en arrière-plan ;
- appliquer l'overlay sombre existant ;
- afficher la modale blanche au-dessus.

NE PAS :
- remplacer la vidéo par une image ;
- créer une nouvelle page avec un background artificiel ;
- naviguer vers une page category.html uniquement pour afficher la sélection.

Si l'ancienne implémentation fait encore une navigation vers une page dédiée alors que le nouveau parcours utilise déjà une modale, corrige cette incohérence en réutilisant la modale existante.

--------------------------------------------------
9. ASSETS SVG EXISTANTS
--------------------------------------------------

Les assets SVG des catégories existent déjà dans le projet.

Utiliser les fichiers existants :

Géographie.svg
Histoire.svg
Gastronomie.svg
Politique.svg
Littérature.svg
Tourisme.svg
Droit & société.svg
Aléatoire.svg

IMPORTANT :

Ne génère PAS de nouvelles illustrations.

Ne remplace PAS ces SVG par des emojis dans la modale de sélection.

Les emojis et les SVG ont deux fonctions différentes :

SVG
→ grandes cards illustrées de sélection.

Emoji
→ badges, libellés, identification compacte de catégorie.

Respecter les noms réels et les chemins existants dans le repository.

Si les noms contiennent accents, espaces ou caractères spéciaux, vérifie leur import réel avant toute modification.

--------------------------------------------------
10. CAS GASTRONOMIE
--------------------------------------------------

La modale de sélection actuelle contient également :

Gastronomie.

Ne supprime pas cette catégorie si elle est fonctionnelle dans le projet.

Le système de catégories existant doit continuer à fonctionner.

Si Gastronomie doit également recevoir un gradient typographique et qu'aucun token officiel n'existe actuellement, identifie d'abord ses couleurs dans les styles/assets existants et réutilise-les.

Ne choisis pas arbitrairement une nouvelle palette si une palette existe déjà dans le projet.

--------------------------------------------------
11. ÉTAT NORMAL DES CARDS DE SÉLECTION
--------------------------------------------------

Dans la modale de sélection des catégories :

les cards utilisent leurs SVG existants.

État normal :

- visuel sombre/noir tel que prévu dans la maquette ;
- SVG visible ;
- texte lisible ;
- aucune transformation arbitraire.

Ne remplace pas automatiquement les titres de ces cards par le système de gradient si cela dégrade la lisibilité sur le fond sombre.

Le système de texte en gradient est principalement destiné aux contextes sur fond clair/blanc et aux badges de catégorie.

--------------------------------------------------
12. HOVER DES CARDS
--------------------------------------------------

Le comportement de hover existant doit être conservé.

Lorsqu'on survole une catégorie :

- utiliser l'identité couleur correspondante ;
- transition fluide ;
- aucun déplacement brutal ;
- aucun changement de dimensions ;
- aucune modification de layout.

Si le projet possède déjà ce comportement :
NE LE RÉÉCRIS PAS inutilement.

Corrige seulement ce qui est nécessaire pour utiliser les nouveaux tokens.

--------------------------------------------------
13. TYPOGRAPHIE
--------------------------------------------------

Respecter la typographie existante du Design System CBQ.

Ne change pas globalement les fonts.

Pour les noms de catégories :

- font-weight fort ;
- excellente lisibilité ;
- gradient visible ;
- pas d'effet 3D ;
- pas de glow ;
- pas de contour ;
- pas de text-shadow excessif.

Le résultat doit rester moderne, propre et minimaliste.

--------------------------------------------------
14. RESPONSIVE
--------------------------------------------------

Le système doit fonctionner correctement :

Desktop
>= 1024px

Tablette
768px – 1023px

Mobile
< 768px

Le gradient du texte doit rester actif sur tous les breakpoints.

NE PAS remplacer le gradient par une couleur unie sur mobile.

Les textes doivent rester lisibles sans :
- débordement ;
- clipping ;
- coupure ;
- scroll horizontal.

--------------------------------------------------
15. THÈME SOMBRE
--------------------------------------------------

Si le projet possède déjà un thème sombre :

ne crée pas un deuxième système de gradients.

Les gradients des catégories doivent rester identiques.

Adapte seulement les surfaces et contours si nécessaire pour conserver suffisamment de contraste.

--------------------------------------------------
16. ACCESSIBILITÉ
--------------------------------------------------

Le gradient ne doit pas être la seule information permettant d'identifier une catégorie.

Conserver :
- le nom textuel ;
- l'emoji lorsque prévu ;
- le SVG lorsque prévu.

Ne supprime aucun label accessible existant.

Les éléments interactifs doivent conserver :
- hover ;
- focus ;
- focus-visible ;
- navigation clavier.

--------------------------------------------------
17. CENTRALISER LES MÉTADONNÉES SI PERTINENT
--------------------------------------------------

Analyse la manière dont les catégories sont actuellement déclarées.

Si plusieurs composants répètent actuellement :

- nom ;
- emoji ;
- slug ;
- asset ;
- couleur ;
- gradient ;

et si le projet possède déjà une structure de configuration des catégories, enrichis cette structure au lieu de dupliquer les données.

L'objectif idéal est qu'une catégorie puisse être décrite par quelque chose conceptuellement équivalent à :

{
  id,
  name,
  emoji,
  asset,
  gradient
}

Mais :

NE CRÉE PAS une nouvelle architecture si l'application possède déjà un modèle équivalent.

Adapte l'existant.

--------------------------------------------------
18. NE PAS CASSER LE FONCTIONNEL
--------------------------------------------------

Les modifications graphiques ne doivent pas casser :

- bouton Jouer ;
- bouton Rejoindre ;
- sélection du mode ;
- Jouer seul ;
- sélection d'une catégorie ;
- fermeture des modales ;
- lancement du quiz ;
- navigation entre les questions ;
- timer ;
- score ;
- résultats ;
- leaderboard ;
- responsive existant.

Le bouton Fermer "X" doit rester le composant commun déjà utilisé dans les autres modales/pages de CBQ.

Ne crée pas une variante spécifique du bouton X pour cette fonctionnalité.

--------------------------------------------------
19. AVANT DE CODER
--------------------------------------------------

Commence obligatoirement par inspecter le repository.

Identifie :

1. où sont déclarées les catégories ;
2. où sont définies les couleurs ;
3. où se trouve le Design System ;
4. quels composants affichent une catégorie ;
5. quels fichiers CSS/styles sont concernés ;
6. comment fonctionne la modale de catégories ;
7. comment les SVG sont chargés ;
8. comment fonctionne le hover ;
9. comment le thème clair/sombre est géré ;
10. comment le responsive est organisé.

Ensuite seulement, modifie le code.

--------------------------------------------------
20. STRATÉGIE DE MODIFICATION
--------------------------------------------------

Procède dans cet ordre :

ÉTAPE 1
Analyser l'existant.

ÉTAPE 2
Identifier les tokens/couleurs existants.

ÉTAPE 3
Ajouter les gradients au Design System existant.

ÉTAPE 4
Créer ou adapter le mécanisme réutilisable de texte en gradient.

ÉTAPE 5
Mapper chaque catégorie à son gradient.

ÉTAPE 6
Appliquer le système aux badges/libellés de catégories.

ÉTAPE 7
Vérifier la modale de sélection sans casser les SVG.

ÉTAPE 8
Vérifier desktop/tablette/mobile.

ÉTAPE 9
Vérifier les interactions existantes.

ÉTAPE 10
Nettoyer les duplications éventuelles introduites par la modification.

--------------------------------------------------
21. CRITÈRES D'ACCEPTATION
--------------------------------------------------

Le travail est terminé uniquement si :

[ ] Histoire utilise #FF9A3C → #E53935
[ ] Géographie utilise #26C6DA → #1976D2
[ ] Politique utilise #FFB74D → #8D4E26
[ ] Littérature utilise #43A047 → #1E7E34
[ ] Tourisme utilise #4DD0E1 → #0097A7
[ ] Droit & société utilise #607D8B → #263238
[ ] Aléatoire utilise #BDBDBD → #424242

[ ] Le gradient est réellement appliqué AUX LETTRES des noms de catégories dans les contextes prévus.

[ ] Les emojis restent dans leurs couleurs natives.

[ ] Les SVG existants ne sont pas remplacés.

[ ] Les cards standards restent principalement blanches avec contour gris.

[ ] Les gradients sont centralisés dans le Design System.

[ ] Il n'y a pas de duplication inutile des valeurs hexadécimales.

[ ] La modale catégorie reste intégrée à la landing page.

[ ] La vidéo de landing reste visible derrière l'overlay.

[ ] Le parcours reste :
Landing → Jouer → Jouer seul → Catégorie.

[ ] Le bouton X commun est conservé.

[ ] Desktop fonctionne.

[ ] Tablette fonctionne.

[ ] Mobile fonctionne.

[ ] Aucun scroll horizontal involontaire n'est introduit.

[ ] Les boutons et interactions existants fonctionnent toujours.

--------------------------------------------------
22. VALIDATION TECHNIQUE
--------------------------------------------------

Après modification :

1. lance les vérifications disponibles dans le projet ;
2. vérifie les erreurs console ;
3. vérifie les imports des SVG ;
4. vérifie les chemins contenant des accents/espaces ;
5. vérifie qu'aucune erreur JavaScript n'empêche les boutons de fonctionner ;
6. vérifie le rendu desktop ;
7. vérifie le rendu mobile ;
8. vérifie le hover ;
9. vérifie la fermeture des modales ;
10. vérifie le parcours complet jusqu'au lancement du quiz.

Ne considère pas la tâche terminée uniquement parce que le CSS compile.

--------------------------------------------------
23. COMPTE RENDU FINAL
--------------------------------------------------

À la fin, indique-moi uniquement :

1. les fichiers modifiés ;
2. ce qui a été changé ;
3. les éventuels problèmes découverts dans l'ancien code ;
4. les tests effectués ;
5. ce qu'il reste éventuellement à faire.

Ne me donne pas seulement des exemples de code :
EFFECTUE les modifications dans le repository.