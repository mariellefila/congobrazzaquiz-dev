# **Implémentation — Refonte Landing Page Congo Brazza Quiz**

## **Objectif**

Refondre la landing page actuelle de **Congo Brazza Quiz** afin de l’aligner sur la nouvelle maquette.

Il ne s’agit pas d’un simple changement CSS : **la fonction même de la landing change**.

### **Parcours actuel**

Landing

→ bannière

→ authentification

→ choix direct d’une catégorie

→ informations de build

→ publicité

### **Nouveau parcours**

Landing immersive

→ vidéo plein écran

→ navigation principale

→ identité Congo Brazza Quiz

→ deux points d’entrée : **Catégorie** et **Mode**

La landing ne doit donc plus être l’écran de sélection directe d’une catégorie.

---

# **1. Commencer par analyser l’existant**

Avant toute modification :

1. Identifier le composant/page correspondant à la landing actuelle.
2. Identifier :
    - le layout utilisé ;
    - le composant du logo ;
    - le bloc d’authentification ;
    - la récupération et l’affichage des catégories ;
    - les routes actuellement utilisées lorsqu’une catégorie est sélectionnée ;
    - les fonctionnalités liées aux modes de jeu ;
    - le bloc publicité ;
    - les informations de build ;
    - les routes existantes pour :
        - classement ;
        - proposition de question ;
        - proposition de publicité ;
        - Facebook.
3. Réutiliser autant que possible les routes, composants et fonctionnalités existants.
4. Ne supprimer aucune fonctionnalité métier ou donnée simplement parce qu’elle disparaît de la landing.

L’objectif est de modifier **la présentation et le parcours utilisateur**, pas de casser les fonctionnalités existantes.

---

# **2. Transformer la landing en écran plein écran**

Supprimer la présentation actuelle basée sur :

- fond blanc ;
- colonne centrale ;
- marges latérales importantes ;
- succession verticale de blocs ;
- scroll nécessaire pour voir l’ensemble du contenu.

La nouvelle landing doit occuper immédiatement :

- `100vw`
- `100vh`

Elle doit fonctionner comme un véritable écran d’accueil immersif.

Éviter tout scroll vertical sur desktop tant que la hauteur disponible permet d’afficher le contenu principal.

---

# **3. Remplacer la bannière actuelle par une vidéo plein écran**

La nouvelle landing utilise une **vidéo de Brazzaville comme background principal**.

La vidéo doit :

- couvrir toute la largeur ;
- couvrir toute la hauteur visible ;
- rester en arrière-plan ;
- conserver son ratio ;
- utiliser un comportement équivalent à `cover` ;
- ne pas déformer l’image ;
- être lancée automatiquement lorsque le navigateur le permet ;
- être muette si nécessaire pour permettre l’autoplay ;
- tourner en boucle si le fichier prévu le permet.

Tous les composants de la landing doivent être affichés **au-dessus de cette vidéo**.

Ajouter si nécessaire un overlay sombre ou un traitement léger permettant de garantir la lisibilité des éléments blancs sans masquer excessivement la vidéo.

Ne pas remplacer cette vidéo par une grande image statique.

---

# **4. Créer le header principal**

Ajouter une navigation horizontale directement superposée à la vidéo.

Navigation attendue :

**CLASSEMENT — PROPOSER UNE QUESTION — PROPOSER UNE PUB — Facebook**

Contraintes :

- header transparent ;
- aucun fond opaque ;
- texte blanc ;
- libellés en majuscules ;
- navigation positionnée en haut de l’écran ;
- les trois entrées principales sont regroupées horizontalement ;
- Facebook est placé complètement à droite.

Les entrées doivent utiliser les routes/fonctionnalités existantes lorsque celles-ci existent.

Ne pas recréer une seconde implémentation d’une fonctionnalité déjà disponible.

Corriger le libellé en :

**PROPOSER UNE QUESTION**

et non « PROPOSER UNE QUESTIONS ».

---

# **5. Repositionner le logo Congo Brazza Quiz**

Conserver le logo actuel et son identité graphique.

Modifier uniquement son intégration dans la landing :

- supprimer son intégration dans l’ancienne bannière ;
- le placer directement au-dessus de la vidéo ;
- aligner le logo vers la gauche ;
- le positionner sous le header ;
- augmenter fortement sa taille ;
- en faire l’élément visuel principal de la zone gauche.

Ne pas modifier :

- le contenu du logo ;
- ses couleurs ;
- son identité graphique.

---

# **6. Supprimer le titre redondant**

Retirer complètement de cette landing :

**Quiz : Congo-Brazzaville**

Le logo suffit désormais à identifier l’application.

Ne pas supprimer ce texte globalement de l’application s’il est utilisé ailleurs.

---

# **7. Retirer le bloc d’authentification de cette landing**

Ne plus afficher sur la landing :

- Mode invité / Supabase non configuré ;
- Connexion Google ;
- Connexion Facebook ;
- Déconnexion.

IMPORTANT :

Ne supprimer ni le système d’authentification ni les composants métier associés.

Ils doivent simplement **ne plus être rendus sur cette landing**.

Les autres écrans utilisant l’authentification doivent continuer à fonctionner normalement.

---

# **8. Retirer le choix direct des catégories**

Supprimer de la landing :

- le titre « Choisissez une catégorie » ;
- les boutons Géographie ;
- Histoire ;
- Gastronomie ;
- Politique ;
- Littérature ;
- Tourisme ;
- Droit et Société ;
- Aléatoire ;
- toutes les autres catégories éventuellement retournées par le backend.

Ne supprimer :

- aucune catégorie ;
- aucune donnée ;
- aucune API ;
- aucune logique métier liée aux catégories.

La landing ne doit simplement plus afficher directement cette liste.

---

# **9. Ajouter le CTA « Catégorie »**

Ajouter sous le logo un bouton :

**Catégorie**

Ce bouton devient le point d’entrée vers l’écran ou l’étape permettant de sélectionner une catégorie.

Nouveau parcours attendu :

Landing

→ Catégorie

→ sélection d’une catégorie

→ suite du parcours du quiz

Réutiliser l’écran ou les composants de sélection de catégorie existants s’ils existent déjà.

Si la sélection est actuellement intégrée directement dans la landing, l’extraire proprement vers l’étape suivante sans dupliquer la logique métier.

---

# **10. Ajouter le CTA « Mode »**

Ajouter à droite de **Catégorie** un deuxième bouton :

**Mode**

Ce bouton doit permettre d’accéder au choix du mode de jeu.

Parcours cible :

Landing

→ Mode

→ choix parmi :

- Solo
- Plusieurs
- Salle

Réutiliser les routes/composants existants correspondant à ces modes.

Le bouton Mode doit avoir exactement le même niveau hiérarchique que Catégorie.

---

# **11. Refaire le design des CTA**

Les anciens grands boutons verts ne doivent plus être utilisés sur cette landing.

Créer deux CTA :

**Catégorie | Mode**

Design attendu :

- fond blanc ;
- texte noir ou gris très foncé ;
- forme fortement arrondie ;
- hauteur relativement compacte ;
- largeur nettement inférieure aux anciens boutons catégories ;
- dimensions cohérentes entre les deux boutons ;
- disposition horizontale sur desktop ;
- espace raisonnable entre les deux.

Les boutons sont directement superposés à la vidéo.

Ils doivent être positionnés sous le logo.

Prévoir les états habituels :

- hover ;
- focus ;
- active ;
- navigation clavier.

---

# **12. Recomposer toute la zone principale**

Abandonner le centrage horizontal systématique actuel.

Créer une composition orientée vers la gauche :

Header

puis :

Logo

puis :

Catégorie | Mode

Le groupe :

**Logo + CTA**

doit constituer une unité visuelle.

La partie droite de la landing doit rester volontairement beaucoup plus libre afin de laisser visible la vidéo de Brazzaville.

Ne pas chercher à équilibrer artificiellement l’écran en remplissant la partie droite.

---

# **13. Supprimer les informations techniques de build**

Ne plus afficher sur cette landing les informations du type :

`Build: main@8896491 — Publié le 2026-08-10 09:46`

Les informations peuvent continuer à exister techniquement si elles sont nécessaires ailleurs.

Elles ne doivent simplement plus être visibles sur la landing publique.

---

# **14. Retirer complètement le bloc publicité**

Supprimer de cette landing :

- le bloc gris publicité ;
- « Pour votre publicité sur le site cliquez ici » ;
- le visuel publicitaire ;
- le texte explicatif associé à Facebook.

IMPORTANT :

Ne supprimer aucune fonctionnalité publicitaire du projet.

L’accès à cette fonctionnalité doit désormais être réalisé depuis :

**PROPOSER UNE PUB**

dans le header.

---

# **15. Responsive**

Adapter la nouvelle landing aux différentes tailles d’écran.

## **Desktop**

Conserver le concept de la maquette :

- vidéo plein écran ;
- navigation en haut ;
- contenu principal à gauche ;
- logo important ;
- Catégorie et Mode sur une même ligne ;
- grande zone visuelle libre à droite.

## **Mobile**

Conserver la même hiérarchie :

- vidéo toujours en background ;
- logo clairement visible ;
- CTA facilement accessibles ;
- navigation adaptée à la largeur disponible.

Si le header complet ne tient pas correctement, prévoir une adaptation responsive propre plutôt que de réduire excessivement les textes.

Ne pas faire réapparaître l’ancien layout vertical blanc sur mobile.

---

# **16. Préserver le comportement existant**

La refonte ne doit provoquer aucune régression sur :

- récupération des catégories ;
- démarrage d’un quiz ;
- modes de jeu ;
- authentification ;
- classement ;
- proposition de questions ;
- publicité ;
- routage ;
- données Supabase ;
- appels API existants.

Le fait qu’un composant disparaisse de la landing ne signifie pas que sa fonctionnalité doit être supprimée du projet.

---

# **17. Nettoyage du code**

Après implémentation :

- supprimer les imports devenus inutiles sur la landing ;
- supprimer le CSS spécifique à l’ancienne landing devenu inutilisé ;
- ne pas supprimer du CSS ou des composants encore utilisés par d’autres pages ;
- éviter les duplications de composants ;
- conserver l’architecture et les conventions existantes du projet.

---

# **18. Critères d’acceptation visuels**

La tâche est considérée comme terminée lorsque, à l’ouverture de la landing :

1. La vidéo de Brazzaville couvre tout l’écran.
2. Il n’existe plus de grand fond blanc central.
3. Le header est visible directement sur la vidéo.
4. Les entrées suivantes sont présentes :
    - CLASSEMENT
    - PROPOSER UNE QUESTION
    - PROPOSER UNE PUB
    - Facebook
5. Le logo Congo Brazza Quiz apparaît en grand dans la partie gauche.
6. Deux boutons sont visibles sous le logo :
    - Catégorie
    - Mode
7. Les boutons sont blancs, arrondis et disposés horizontalement sur desktop.
8. Le titre « Quiz : Congo-Brazzaville » n’est plus affiché.
9. Le bloc d’authentification n’est plus affiché.
10. La liste complète des catégories n’est plus affichée.
11. Les informations de build ne sont plus affichées.
12. Le bloc publicité n’est plus affiché.
13. La partie droite reste majoritairement dédiée à la vidéo.
14. La landing ne nécessite plus de parcourir une longue page verticale pour accéder aux actions principales.

---

# **19. Critères d’acceptation fonctionnels**

Vérifier également :

- clic sur **Catégorie** → accès à la sélection de catégorie ;
- clic sur **Mode** → accès au choix Solo / Plusieurs / Salle ;
- clic sur **Classement** → fonctionnalité existante correspondante ;
- clic sur **Proposer une question** → fonctionnalité existante correspondante ;
- clic sur **Proposer une pub** → fonctionnalité existante correspondante ;
- accès Facebook fonctionnel ;
- aucune régression sur le démarrage réel d’un quiz.

---

# **20. Méthode de travail demandée**

Procéder directement dans le repository.

Avant de modifier :

1. analyser les fichiers concernés ;
2. identifier les composants et routes existants à réutiliser ;
3. identifier précisément les fichiers qui devront être modifiés.

Puis implémenter la refonte.

Ne pas simplement me fournir du code théorique ou une proposition d’architecture : **effectuer réellement les modifications dans le projet.**

À la fin, fournir un compte rendu contenant :

- fichiers créés ;
- fichiers modifiés ;
- composants réutilisés ;
- composants éventuellement extraits ;
- routes utilisées pour chaque entrée ;
- fonctionnalités volontairement retirées uniquement de la landing ;
- éventuels points restant à traiter ;
- résultat des tests/build/lint exécutés.

Ne modifier aucun élément fonctionnel non nécessaire à cette refonte.