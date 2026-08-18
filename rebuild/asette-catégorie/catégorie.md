Crée entièrement la modale / page « Choisissez votre catégorie » de Congo Brazza Quiz en respectant la maquette transmise et le Design System CBQ.

L’objectif est de reproduire fidèlement l’écran visible sur la maquette : une grande modale blanche centrée sur un overlay sombre, avec un titre, une courte introduction et une grille de 8 catégories.

1. Structure générale

La page / modale doit contenir :

* un overlay sombre au-dessus de la landing page ;
* une grande modale blanche centrée ;
* un bouton fermer X en haut à droite et le meme que sur les autre pages;
* le titre CHOISISSEZ VOTRE CATÉGORIE ;
* un texte d’introduction ;
* une grille de 8 catégories ;
* chaque catégorie sous forme de card cliquable.

Ordre exact des catégories :

1. Géographie
2. Histoire
3. Gastronomie
4. Politique
5. Littérature
6. Tourisme
7. Droit & société
8. Aléatoire

2. Assets SVG existants

Utilise exactement les SVG déjà présents dans le projet :

* Géographie.svg
* Histoire.svg
* Gastronomie.svg
* Politique.svg
* Littérature.svg
* Tourisme.svg
* Droit & société.svg
* Aléatoire.svg

Avant de coder :

* localise ces 8 fichiers dans le repository ;
* utilise leur chemin réel ;
* ne crée pas de nouveaux SVG ;
* ne remplace pas les assets par des emojis ou des icônes génériques ;
* ne duplique pas les fichiers.

Le SVG sert uniquement de motif décoratif de fond de la card.

3. Modale

Style desktop :

* max-width: 1200px
* largeur : environ calc(100% - 64px)
* fond : #FFFFFF
* border-radius : 24px
* padding : 40px 48px
* centrée horizontalement et verticalement
* ombre : 0 20px 50px rgba(17,24,39,.18)

Overlay :

background: rgba(17, 24, 39, 0.60);

La landing page doit rester visible derrière, assombrie.

4. Header de la modale

Titre :

CHOISISSEZ VOTRE CATÉGORIE

Style :

* Product Sans Bold
* font-weight: 700
* font-size: 36px
* line-height: 120%
* couleur #111827

Texte d’introduction :

Explorez le Congo-Brazzaville à travers nos différentes catégories et testez vos connaissances sur les thèmes qui vous passionnent.

Style :

* Product Sans Regular
* font-weight: 400
* font-size: 18px
* line-height: 150%
* couleur #64748B
* largeur de lecture limitée pour éviter une ligne trop longue

5. Bouton fermer

Placer un bouton circulaire blanc en haut à droite.

Style :

* diamètre : environ 64px
* fond blanc
* icône X noire
* border-radius: 50%
* ombre légère
* zone cliquable confortable
* focus visible clavier

Au clic :

* fermer la modale ;
* revenir à l’écran précédent ;
* ne pas modifier les autres états du jeu inutilement.

6. Grille catégories

Desktop :

* 4 colonnes
* 2 lignes
* gap : 16px

Tablette :

* 2 colonnes

Mobile :

* 2 colonnes si la largeur le permet ;
* sinon 1 colonne.

Exemple :

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

7. Card catégorie

Chaque card doit être cliquable sur toute sa surface.

Style normal :

* hauteur homogène ;
* ratio visuel proche de la maquette ;
* position relative ;
* overflow: hidden
* background noir / presque noir ;
* border : 1px solid #D1D5DB
* border-radius : 16px
* cursor : pointer

Exemple :

.category-card {
  position: relative;
  overflow: hidden;
  min-height: 180px;
  background: #080A09;
  border: 1px solid #D1D5DB;
  border-radius: 16px;
  cursor: pointer;
  transition:
    transform 200ms ease-out,
    border-color 200ms ease-out,
    box-shadow 200ms ease-out;
}

8. Asset SVG dans la card

Le SVG doit occuper toute la card comme motif visuel.

Exemple :

.category-card__asset {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.30;
}

Ne pas mettre le texte dans le SVG.

Ne pas intégrer dans le SVG :

* le fond noir ;
* la bordure ;
* le vert du hover ;
* le nom de catégorie ;
* l’ombre.

9. Overlay interne de la card

Ajouter un overlay sombre entre le SVG et le texte :

.category-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.48);
  transition: background 200ms ease-out;
  z-index: 1;
}

10. Texte catégorie

Le nom de la catégorie doit être centré dans la card.

Style :

* Product Sans Bold
* font-weight: 700
* font-size: 24px
* couleur blanche
* centré horizontalement
* centré verticalement
* z-index: 2

Pour Droit & société, autoriser deux lignes :

Droit
& société

11. Hover

Important : les cards sont noires par défaut.

Le vert visible dans la maquette correspond à l’état hover / actif.

Au survol :

* appliquer un overlay vert CBQ ;
* conserver le SVG visible ;
* bordure verte ;
* légère élévation ;
* ombre légère.

Exemple :

.category-card:hover::after {
  background: rgba(22, 163, 74, 0.68);
}
.category-card:hover {
  border-color: #16A34A;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17,24,39,.10);
}

Ne transforme pas simplement la card en bloc vert uni.

Le motif SVG doit rester perceptible.

12. État sélectionné

Au clic sur une catégorie :

* enregistrer la catégorie sélectionnée ;
* garder temporairement un état visuel sélectionné ;
* border verte ;
* overlay vert ;
* indication supplémentaire si nécessaire ;
* ne pas dépendre uniquement de la couleur pour l’accessibilité.

Exemple :

.category-card.is-selected {
  border-color: #16A34A;
}

13. Mapping des catégories

Créer un mapping centralisé propre, en adaptant uniquement les chemins aux fichiers réels :

const categories = [
  {
    id: "geographie",
    label: "Géographie",
    asset: "/assets/categories/Géographie.svg"
  },
  {
    id: "histoire",
    label: "Histoire",
    asset: "/assets/categories/Histoire.svg"
  },
  {
    id: "gastronomie",
    label: "Gastronomie",
    asset: "/assets/categories/Gastronomie.svg"
  },
  {
    id: "politique",
    label: "Politique",
    asset: "/assets/categories/Politique.svg"
  },
  {
    id: "litterature",
    label: "Littérature",
    asset: "/assets/categories/Littérature.svg"
  },
  {
    id: "tourisme",
    label: "Tourisme",
    asset: "/assets/categories/Tourisme.svg"
  },
  {
    id: "droit-societe",
    label: "Droit & société",
    asset: "/assets/categories/Droit & société.svg"
  },
  {
    id: "aleatoire",
    label: "Aléatoire",
    asset: "/assets/categories/Aléatoire.svg"
  }
];

14. Comportement fonctionnel

Au clic sur une catégorie :

1. utiliser le handler existant si le flow existe déjà ;
2. enregistrer la catégorie choisie ;
3. poursuivre vers l’étape suivante du flow de jeu ;
4. ne pas casser le choix du mode ou le quiz ;
5. ne pas recréer une nouvelle logique métier si elle existe déjà.

Le flow attendu reste :

Landing → Jouer → Choix catégorie → Choix mode → Solo / Plusieurs / Salle

15. Responsive

Desktop ≥ 1024px

* 4 colonnes ;
* modale large ;
* texte 24px sur les cards.

Tablette 768–1023px

* 2 colonnes ;
* padding modale réduit ;
* cards gardent un ratio homogène.

Mobile < 768px

* 2 colonnes si possible ;
* sinon 1 colonne ;
* modale :

max-height: calc(100dvh - 32px);
overflow-y: auto;

* padding : 20px
* border-radius : 20px
* titre : 30px
* texte intro : 16px
* nom catégorie : 18–20px
* cartes tactiles avec zone d’interaction confortable

16. Accessibilité

Respecter :

* navigation clavier ;
* Enter / Space pour sélectionner ;
* focus visible ;
* contraste suffisant ;
* aria-label si nécessaire ;
* ne pas utiliser uniquement la couleur pour transmettre l’état sélectionné.

17. Contraintes strictes

Ne modifie pas :

* la landing page derrière ;
* les autres modales ;
* le flow d’authentification ;
* les handlers de jeu existants ;
* les routes existantes ;
* les couleurs globales du site ;
* les noms des catégories.

Ne crée pas :

* de nouveaux SVG ;
* de nouvelles catégories ;
* de nouveau flow métier.

Réutilise au maximum :

* composants existants ;
* Design Tokens existants ;
* handlers existants ;
* styles Product Sans existants.

18. Vérifications finales

Tester obligatoirement :

* ouverture de la modale ;
* fermeture avec X ;
* 8 SVG chargés sans erreur 404 ;
* état normal noir ;
* hover vert ;
* sélection de chaque catégorie ;
* passage à l’écran suivant ;
* desktop ;
* tablette ;
* mobile ;
* navigation clavier ;
* console sans erreur.

À la fin, fournis un résumé précis :

1. fichiers modifiés ;
2. composant créé ou modifié ;
3. chemins réels des 8 SVG ;
4. mapping final ;
5. comportement hover ;
6. comportement selected ;
7. comportement responsive ;
8. tests effectués.