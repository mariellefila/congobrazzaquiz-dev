REPRODUIRE EXACTEMENT CET ÉCRAN DE FIN DE QUIZ À PARTIR DE LA CAPTURE FOURNIE.

La capture jointe est la SOURCE DE VÉRITÉ VISUELLE.

Ne réinterprète pas le design.
Ne change pas la structure.
Ne refactorise pas le reste de l’application.
Ne modifie pas la logique métier du quiz.

OBJECTIF :
adapter uniquement l’écran de fin de quiz pour reproduire fidèlement la capture.

1. CONTAINER PRINCIPAL
- grande carte blanche centrée ;
- fond extérieur noir / overlay sombre ;
- grands coins arrondis ;
- largeur proche de la capture ;
- hauteur compacte, pas plein écran ;
- bouton X blanc rond en haut à droite, légèrement à cheval sur la carte.

2. BADGE CATÉGORIE
En haut à gauche :
- emoji de catégorie ;
- nom de catégorie ;
- pill blanc légèrement teinté ;
- bordure fine colorée ;
- texte de catégorie avec son gradient correspondant.

Exemple :
🛕 Histoire

La catégorie doit être dynamique.

3. BLOC CENTRAL DU SCORE
Centrer horizontalement :
- branches de laurier dorées à gauche et à droite ;
- texte :
  "Félicitation ! Vous avez terminé le quiz."
- score très grand en doré :
  "1840"
- "PTS" plus petit à droite du score.

Le score doit utiliser la vraie valeur calculée du quiz.

4. STATISTIQUES
Afficher 3 petites cards sur une même ligne :

Card 1 :
✓
8/10
Bonnes réponses

Card 2 :
horloge
12,4 s
Temps moyen
par question

Card 3 :
icône classement
+4
Positions gagnée
dans le classement

Les valeurs doivent être dynamiques.

Style :
- fond blanc ;
- bordure gris clair ;
- coins légèrement arrondis ;
- alignement horizontal propre ;
- icône à gauche ;
- texte à droite.

5. BOUTON PRINCIPAL
Sous les statistiques :
grand bouton vert horizontal centré :

"Voir le classement  →"

- largeur importante ;
- fond vert CBQ ;
- texte blanc ;
- icône classement blanche ;
- même hauteur et proportions que la capture.

6. ACTIONS SECONDAIRES
Sous le bouton principal :
2 boutons côte à côte :

"Rejouer"
"Changer de catégorie"

Style :
- fond blanc ;
- bordure verte ;
- texte vert ;
- mêmes dimensions ;
- centrés.

7. PARTAGE
En dessous :
texte centré :

"Partager mon score"

Puis 3 icônes :
- Facebook
- WhatsApp
- partage natif

Centrer les 3 icônes avec un espace régulier.

8. ESPACEMENTS
Respecter exactement la densité de la capture :
- pas trop d’espace vertical ;
- écran compact ;
- score dominant ;
- stats alignées ;
- boutons bien rapprochés ;
- partage en bas.

9. NE PAS MODIFIER
Ne touche pas :
- au plateau de questions ;
- au header Questions X/10 ;
- au timer ;
- aux réponses ;
- à la landing ;
- aux modales de connexion ;
- au choix du mode ;
- au choix catégorie ;
- au leaderboard ;
- au scoring ;
- à la logique du quiz.

10. VALIDATION
Après modification :
- lancer le quiz ;
- terminer la partie ;
- vérifier que l’écran de fin correspond visuellement à la capture ;
- ajuster dimensions, marges, alignements et tailles jusqu’à obtenir un rendu très proche.

Effectue directement les modifications dans le repository.
À la fin, indique uniquement :
- fichiers modifiés ;
- CSS modifié ;
- éventuel HTML/JS modifié ;
- confirmation que la logique du quiz n’a pas été changée.Corrige uniquement les bugs visuels des boutons de l’écran de résultat actuel.

Ne modifie pas les dimensions de la modale ni la disposition générale.

1. Bouton X de fermeture

Le bouton X en haut à droite est actuellement coupé / masqué par le conteneur.
