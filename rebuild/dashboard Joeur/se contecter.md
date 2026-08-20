Transforme complètement l’écran profil joueur actuel pour qu’il corresponde à la maquette de référence fournie.

La landing, le login et le retour vers la landing avec AMELIA.B fonctionnent déjà.
Ne touche pas à ce parcours.

L’objectif est uniquement de corriger et finaliser l’écran profil ouvert lorsqu’on clique sur AMELIA.B.

Parcours à conserver

Landing → SE CONNECTER → Login existant → retour Landing → AMELIA.B → clic → Profil joueur

Ne modifie pas :

* la landing ;
* le login ;
* le header ;
* la simulation actuelle de AMELIA.B ;
* le fond vidéo.

⸻

1. Structure générale du profil

Le profil doit reprendre la structure de la maquette :

* fond vidéo toujours visible derrière ;
* overlay sombre sur le fond ;
* une colonne blanche indépendante à gauche ;
* un grand panneau blanc indépendant à droite ;
* espace visible entre les deux ;
* bouton rond X en haut à droite, légèrement à cheval sur le panneau.

Le profil doit occuper une grande partie de la largeur de l’écran comme sur la maquette.

⸻

2. Colonne profil à gauche

Afficher dans cet ordre :

1. avatar utilisateur
2. AMELIA.B
3. carte Points
4. carte Classement
5. carte Série
6. bouton SE DÉCONNECTER
7. watermark Congo Brazza Quiz en fond dans la partie basse

Avatar

Utiliser le SVG profil déjà présent dans le projet.

L’avatar doit être grand, centré et reprendre les proportions visibles sur la maquette.

Nom

Afficher :

AMELIA.B

en gras sous l’avatar.

⸻

3. Statistiques utilisateur

Créer trois cartes distinctes.

Points

Afficher :

⭐
2480
POINTS

Classement

Afficher :

🏆
#127
CLASSEMENT

Série

Afficher :

🔥
4
SÉRIE

Les cartes doivent avoir :

* fond blanc ;
* bordure fine grise ;
* coins arrondis ;
* icône à gauche ;
* valeur principale bien visible ;
* libellé en dessous ou à côté comme sur la maquette.

⸻

4. Bouton Se déconnecter

Afficher sous les statistiques :

SE DÉCONNECTER

Style :

* fond blanc ;
* bordure rouge fine ;
* texte rouge ;
* coins très arrondis ;
* largeur proche de celle de la maquette.

Ne change pas son comportement existant.

⸻

5. Watermark Congo Brazza Quiz

Le watermark doit être placé dans la partie basse de la colonne gauche.

Il doit être :

* très transparent ;
* décoratif ;
* partiellement visible ;
* contenu dans la colonne gauche.

Supprime le gros logo actuellement affiché dans le panneau droit.

⸻

6. Panneau droit

Le panneau droit doit contenir deux cartes :

* Mes dernières parties
* Mes badges

Les deux cartes doivent :

* avoir une bordure grise fine ;
* des coins arrondis ;
* un titre en gras ;
* une ligne horizontale sous le titre ;
* des espacements proches de la maquette.

⸻

7. Mes dernières parties

Afficher 5 parties de test.

Pour chaque ligne afficher :

* icône de catégorie ;
* score ;
* XP gagné ;
* nom de catégorie ;
* date ;
* bouton Rejouer.

Utiliser temporairement :

16/10
+10xp
Géographie
12 août 2023

Le bouton :

Rejouer

doit être :

* vert ;
* texte blanc ;
* forme arrondie ;
* même largeur sur toutes les lignes.

Le nom Géographie doit être l’élément principal de la ligne.

⸻

8. Mes badges

Afficher toujours les 3 badges disponibles, même s’ils ne sont pas encore acquis.

Les fichiers SVG déjà présents dans le projet sont :

Badge 10 bonnes réponses...filée.svg
Badge Contributeur.svg
Badge Expert Brazzaville.svg

Repère leurs noms exacts dans le dossier existant et utilise directement ces fichiers.

Ne recrée pas les badges.

Ne convertis pas les SVG.

Ne remplace pas les badges par des icônes.

⸻

9. Correspondance des badges

Utiliser :

Badge 10 bonnes réponses...filée.svg

pour :

Obtenir 10 bonnes réponses d’affilée

Utiliser :

Badge Expert Brazzaville.svg

pour :

Atteindre 90% dans 4 parties

Utiliser :

Badge Contributeur.svg

pour :

Proposer une question et qu’elle soit approuvée

⸻

10. Affichage des badges NON acquis

Tous les badges doivent apparaître, même verrouillés.

Lorsqu’un badge n’est pas encore acquis :

opacity: 0.07;

Important :

L’opacité doit être appliquée uniquement à l’image SVG du badge.

Ne pas appliquer opacity: 0.07 au texte ni au conteneur complet.

Le texte sous le badge doit rester parfaitement lisible.

Ne pas afficher de date d’obtention.

Exemple :

[badge à 7%]
Obtenir 10 bonnes
réponses d’affilée

⸻

11. Affichage des badges acquis

Lorsqu’un badge est acquis :

opacity: 1;

Le SVG devient donc visible à 100%.

Afficher également la date réelle d’obtention.

Exemple :

[badge visible à 100%]
20 août 2026
Obtenir 10 bonnes
réponses d’affilée

La date doit apparaître uniquement si le badge a été acquis.

⸻

12. Structure des données badges

Prévoir une structure simple permettant de gérer les états :

const badges = [
  {
    id: "streak-10",
    label: "Obtenir 10 bonnes réponses d’affilée",
    image: "...",
    acquired: false,
    acquiredAt: null
  },
  {
    id: "expert-brazzaville",
    label: "Atteindre 90% dans 4 parties",
    image: "...",
    acquired: false,
    acquiredAt: null
  },
  {
    id: "contributor",
    label: "Proposer une question et qu’elle soit approuvée",
    image: "...",
    acquired: false,
    acquiredAt: null
  }
];

Le rendu doit dépendre uniquement de :

acquired
acquiredAt

Si :

acquired === false

alors :

* SVG opacity: 0.07
* pas de date

Si :

acquired === true

alors :

* SVG opacity: 1
* afficher acquiredAt

⸻

13. Test visuel

Pour vérifier immédiatement le comportement, tu peux temporairement configurer :

streak-10 -> acquired: true
expert-brazzaville -> acquired: false
contributor -> acquired: false

Pour le badge acquis, utiliser temporairement :

20 août 2026

Cela doit permettre de voir immédiatement :

* 1 badge à 100 % ;
* 2 badges à 7 %.

La donnée de test doit être clairement isolée pour pouvoir être retirée ensuite.

⸻

14. Disposition des badges

Respecter la maquette :

Première ligne :

* badge 10 bonnes réponses
* badge Expert Brazzaville

Deuxième ligne :

* badge Contributeur

Ne pas les aligner en une seule ligne si cela ne correspond pas à la maquette.

⸻

15. Bouton fermer

Le bouton X doit être :

* rond ;
* blanc ;
* légèrement à cheval sur le coin supérieur droit ;
* avec une légère ombre ;
* X noir centré.

Le clic doit fermer le profil et revenir à la landing sans déconnecter l’utilisateur.

⸻

16. Responsive

Conserver un rendu correct sur desktop et mobile.

Sur desktop, priorité absolue à la fidélité avec la maquette fournie.

Ne compresse pas excessivement la version desktop pour anticiper le mobile.

⸻

17. Contraintes importantes

Ne modifie pas :

* la landing ;
* le login ;
* le fond vidéo ;
* la logique de connexion simulée ;
* les autres écrans du quiz.

Ne fais pas seulement quelques corrections locales.

Compare réellement l’écran actuel à la maquette et corrige :

* structure ;
* largeur ;
* hauteur ;
* position des blocs ;
* espacements ;
* alignements ;
* tailles ;
* typographies ;
* cartes ;
* bordures ;
* arrondis ;
* emplacement du watermark ;
* position du bouton fermer ;
* rendu des badges ;
* opacité des badges ;
* dates des badges.

Utilise les assets SVG déjà présents dans le projet.

Avant de coder, retrouve les noms exacts et chemins exacts des trois fichiers :

Badge 10 bonnes réponses...filée.svg
Badge Contributeur.svg
Badge Expert Brazzaville.svg

Puis utilise ces chemins directement dans le composant profil.

Implémente ensuite directement les modifications et teste visuellement l’écran profil.!