Je veux implémenter dans le projet existant la nouvelle modale « Choisissez votre mode de jeu » conformément à la maquette fournie.

Contexte fonctionnel

La landing page propose désormais uniquement deux CTA :

* Jouer
* Rejoindre

Le CTA Catégorie a été supprimé de la landing.

Cependant, la sélection de catégorie reste bien présente dans le parcours du jeu.

Le nouveau journey attendu est :

Landing → Jouer → Authentification si nécessaire → Choix du mode de jeu → Choix de la catégorie → Partie

Le CTA Rejoindre est hors périmètre de cette tâche et ne doit pas être modifié.

⸻

1. Comportement du CTA Jouer

Lorsque l’utilisateur clique sur Jouer :

Utilisateur déjà connecté

Ouvrir directement la nouvelle modale :

CHOISISSEZ VOTRE MODE DE JEU

Utilisateur non connecté

Conserver le système d’authentification Supabase existant :

Jouer
→ modale Se connecter
→ Google/Facebook
→ authentification réussie
→ fermeture de la modale Auth
→ ouverture automatique de la modale Mode.

IMPORTANT :

Après authentification, ne redirige pas vers une ancienne page.

L’action en attente doit être :

ouvrir la modale Mode.

Ne duplique pas la logique OAuth existante.

⸻

2. Parcours après sélection du mode

Lorsqu’un utilisateur choisit un mode :

1. conserver le mode sélectionné ;
2. fermer la modale Mode ;
3. ouvrir immédiatement la modale Catégorie existante ;
4. permettre la sélection de la catégorie ;
5. après sélection de la catégorie, démarrer la partie avec :

mode sélectionné + catégorie sélectionnée

Le parcours doit donc être strictement :

Landing → Jouer → Auth → Mode → Catégorie → Partie

Ne réintroduis pas Catégorie comme CTA sur la landing.

⸻

3. Assets disponibles

Les assets sont déjà présents dans le repository.

Commence par retrouver leurs chemins exacts.

Illustrations principales

* mode-solo.svg
* mode-multi.svg
* mode-room.svg

Pictogrammes

* icon-solo.svg
* icon-multi.svg
* icon-room.svg
* icon-play.svg

Inspecte leur contenu avant utilisation.

Règles :

* mode-* = illustration principale du mode ;
* icon-* = pictogramme séparé ;
* ne superpose pas un icon-* sur un mode-* si le pictogramme est déjà intégré ;
* ne remplace pas les assets fournis par des emojis ou icônes génériques.

⸻

4. Les cartes ne doivent pas être des images complètes

IMPORTANT :

Les SVG servent uniquement pour les illustrations.

Construis les cartes en HTML/CSS.

Les éléments suivants doivent rester en HTML/CSS :

* titre ;
* description ;
* badge nombre de joueurs ;
* bouton Jouer ;
* bordure ;
* background ;
* séparateur ;
* étoiles ;
* ombres ;
* hover ;
* focus.

Ne mets pas les textes dans les SVG.

Ne transforme pas la carte complète en image.

⸻

5. Modale Mode

Afficher la modale au-dessus de la landing existante.

La landing doit rester visible derrière avec :

* vidéo ;
* logo CBQ ;
* navigation ;
* CTA Jouer ;
* CTA Rejoindre.

Lorsque la modale est ouverte :

* appliquer un overlay sombre ;
* conserver la vidéo visible ;
* empêcher les clics sur la landing ;
* empêcher le focus sur les éléments derrière ;
* bloquer le scroll de la landing.

La vidéo doit continuer à jouer.

⸻

6. Conteneur

Créer une grande fenêtre blanche :

* centrée horizontalement ;
* centrée verticalement ;
* coins fortement arrondis ;
* légère ombre ;
* padding généreux ;
* largeur proche de la maquette ;
* hauteur adaptée au contenu.

Ne pas utiliser de dimensions rigides qui cassent le responsive.

⸻

7. Header

Afficher :

CHOISISSEZ VOTRE

puis :

MODE DE JEU

Style :

CHOISISSEZ VOTRE

* uppercase ;
* noir / bleu très foncé ;
* centré.

MODE DE JEU

* uppercase ;
* vert CBQ ;
* beaucoup plus grand ;
* centré.

Sous-titre :

À CHACUN SON STYLE DE JEU ! AMUSEZ-VOUS ET APPRENEZ EN VOUS ÉCLATANT.

Style :

* uppercase ;
* centré ;
* gris foncé ;
* taille inférieure.

Respecter au maximum la hiérarchie et les proportions de la maquette.

⸻

8. Carte Jouer seul

Utiliser :

mode-solo.svg

Titre :

JOUER SEUL

Description :

Jouez à votre rythme, améliorez vos connaissances et grimpez dans le classement.

Badge :

1 Joueur

CTA :

Jouer

Style dominant : vert.

Prévoir :

* fond vert très clair ;
* bordure verte ;
* titre vert ;
* séparateur vert ;
* badge vert clair ;
* bouton vert.

⸻

9. Carte Jouer à plusieurs

Utiliser :

mode-multi.svg

Titre :

JOUER À PLUSIEURS

Description :

Affrontez votre famille ou vos amis en temps réel.

Badge :

2 à 10 Joueurs

CTA :

Jouer

Style dominant : orange / jaune.

Prévoir :

* fond crème très clair ;
* bordure orange ;
* titre orange ;
* séparateur orange ;
* badge légèrement teinté orange ;
* bouton orange.

⸻

10. Carte Jouer en salle

Utiliser :

mode-room.svg

Titre :

JOUER EN SALLE

Description :

Créez ou rejoignez une salle avec un code et jouez ensemble sur grand écran.

Badge :

4 à 200 joueurs

CTA :

Jouer

Style dominant : rouge.

Prévoir :

* fond rouge très clair ;
* bordure rouge ;
* titre rouge ;
* séparateur rouge ;
* badge légèrement teinté rouge ;
* bouton rouge.

⸻

11. Icône des CTA Jouer

Utiliser icon-play.svg dans les boutons Jouer si cela correspond à la maquette.

Le CTA reste un vrai bouton HTML.

⸻

12. Alignement des cartes

Sur desktop :

3 cartes sur une seule ligne

[ JOUER SEUL ] [ JOUER À PLUSIEURS ] [ JOUER EN SALLE ]

Les trois cartes doivent avoir :

* même largeur ;
* même hauteur ;
* alignement vertical cohérent.

Les éléments internes doivent rester alignés entre les cartes :

* illustration ;
* titre ;
* séparateur ;
* description ;
* badge ;
* CTA.

Une description plus courte ne doit pas faire remonter le bouton.

Utilise Grid/Flex correctement pour maintenir l’alignement.

⸻

13. Décorations

Reproduire les décorations de la maquette :

* étoile verte pour Solo ;
* étoiles orange pour Plusieurs ;
* étoiles rouges pour Salle ;
* lignes horizontales ;
* petits losanges.

Créer ces éléments en CSS lorsque c’est raisonnable.

Ne crée pas de nouveaux assets inutiles.

⸻

14. Bouton de fermeture

Ajouter le bouton rond × en haut à droite.

Réutiliser le style/comportement déjà validé pour les autres modales.

Normal :

* cercle blanc ;
* croix gris foncé ;
* légère ombre 3D ;
* aucun contour jaune ;
* aucun contour vert.

Hover :

* cercle gris foncé ;
* croix blanche ;
* légère élévation ;
* ombre renforcée ;
* transition fluide.

Supporter également :

Escape → fermeture

⸻

15. Responsive

Desktop

3 colonnes.

Tablette

Passer à 2 colonnes si nécessaire.

Mobile

1 colonne :

[ JOUER SEUL ]
[ JOUER À PLUSIEURS ]
[ JOUER EN SALLE ]

Sur mobile :

* conserver les SVG ;
* conserver les textes en HTML ;
* conserver les boutons ;
* conserver des zones tactiles confortables ;
* autoriser le scroll interne de la modale si nécessaire ;
* bloquer le scroll de la landing ;
* aucun débordement horizontal.

Les SVG doivent conserver leur ratio.

⸻

16. Gestion du mode sélectionné

Lorsque l’utilisateur clique sur un CTA Jouer d’une carte :

* récupérer l’identifiant / slug réel du mode existant ;
* conserver ce mode dans l’état du parcours ;
* ne pas démarrer immédiatement la partie ;
* ouvrir ensuite la modale Catégorie.

Le mode choisi doit rester disponible jusqu’au démarrage de la partie.

Ne crée pas une seconde représentation des modes si une structure existe déjà.

Réutilise les IDs/slugs/fonctions existants.

⸻

17. Modale Catégorie

La modale Catégorie reste une étape du parcours.

Ne la supprime pas.

Ne la réimplémente pas si elle existe déjà.

Après sélection du mode :

ouvrir la modale Catégorie existante.

Lorsqu’une catégorie est sélectionnée :

* conserver son slug/ID existant ;
* combiner le mode sélectionné avec la catégorie sélectionnée ;
* poursuivre le parcours du jeu.

Le flux final doit être :

mode + category → démarrage de la partie

Réutilise la logique métier existante.

Ne recrée pas un deuxième startQuiz() ou équivalent.

⸻

18. Ne pas réintroduire Catégorie sur la landing

IMPORTANT :

La catégorie existe dans le journey, mais plus sur la landing.

Ne fais donc pas :

Landing → Catégorie

Le seul parcours Jouer est :

Landing → Jouer → Mode → Catégorie

⸻

19. CTA Rejoindre

Le CTA Rejoindre est hors périmètre.

Ne modifie :

* ni son HTML ;
* ni son CSS ;
* ni son comportement ;
* ni sa destination.

⸻

20. Préserver l’existant

Ne modifie pas inutilement :

* landing ;
* vidéo ;
* logo ;
* navigation ;
* Rejoindre ;
* Supabase ;
* OAuth ;
* modale Auth ;
* modale Catégorie ;
* moteur de quiz ;
* questions ;
* scoring ;
* timers ;
* sessions.

Pas de refactoring hors périmètre.

⸻

21. Analyse avant implémentation

Avant de modifier le code, analyse rapidement l’existant.

Vérifie :

1. où est implémenté le CTA Jouer ;
2. ce qu’il fait actuellement ;
3. comment l’authentification protège ce CTA ;
4. comment ouvrir la modale Mode après Auth ;
5. où se trouve la modale Catégorie existante ;
6. comment elle reçoit aujourd’hui une catégorie ;
7. comment stocker temporairement le mode sélectionné ;
8. comment transmettre ensuite mode + category au moteur de jeu ;
9. où sont définis Solo / Plusieurs / Salle ;
10. les routes/fonctions existantes pour chaque mode ;
11. les chemins exacts des assets mode-* et icon-* ;
12. les fichiers à modifier ;
13. les nouveaux fichiers réellement nécessaires ;
14. les risques de régression.

Après cette analyse, établis un plan fichier par fichier puis implémente.

Ne demande une validation intermédiaire que si tu rencontres une ambiguïté fonctionnelle réellement bloquante.

⸻

22. Validation obligatoire

Après implémentation, vérifier :

1. Landing chargée.
2. Jouer visible.
3. Rejoindre inchangé.
4. Utilisateur connecté → Jouer → modale Mode.
5. Utilisateur non connecté → Jouer → Auth.
6. Auth réussie → modale Mode.
7. Trois cartes visibles.
8. Bons SVG utilisés.
9. Cartes de même hauteur.
10. CTA Jouer fonctionnels.
11. Sélection du mode conservée.
12. Après sélection du mode → ouverture de la modale Catégorie.
13. Aucun retour vers une ancienne page intermédiaire.
14. Sélection d’une catégorie fonctionnelle.
15. Le moteur reçoit correctement mode + category.
16. La partie démarre avec le bon mode et la bonne catégorie.
17. Bouton × fonctionnel.
18. Escape fonctionnel.
19. Landing non interactive derrière les modales.
20. Responsive desktop.
21. Responsive mobile.
22. Aucune erreur JS console.
23. Aucun 404 sur les assets/modules.

⸻

23. Compte rendu final

À la fin, donne-moi :

* fichiers modifiés ;
* fichiers créés ;
* fonctions/composants ajoutés ;
* comportement avant/après du CTA Jouer ;
* mécanisme utilisé pour conserver le mode sélectionné ;
* mécanisme utilisé pour transmettre mode + category ;
* tests exécutés ;
* résultats ;
* éventuelles limitations restantes.

Ne fais aucune modification hors périmètre.