Modifier la landing page Congo Brazza Quiz afin d’ajouter le contrôle d’authentification sur les CTA Catégorie et Mode.

Comportement attendu

Actuellement :

* Le bouton Catégorie navigue directement vers pages/categorie.html.
* Le bouton Mode navigue directement vers pages/mode.html.

Nouveau comportement :

1. Lorsque l’utilisateur clique sur Catégorie ou Mode, vérifier d’abord s’il est authentifié avec Supabase.
2. Si l’utilisateur est déjà authentifié :
    * Catégorie → continuer vers pages/categorie.html.
    * Mode → continuer vers pages/mode.html.
3. Si l’utilisateur n’est pas authentifié :
    * empêcher la navigation ;
    * ouvrir la modale “Se connecter” ;
    * conserver en mémoire la destination initialement demandée.
4. Après une authentification réussie avec Google ou Facebook :
    * fermer la modale ;
    * rediriger automatiquement l’utilisateur vers la destination qu’il avait sélectionnée avant de se connecter.
5. Si l’utilisateur ferme la modale avec la croix :
    * rester sur la landing page ;
    * ne lancer aucune navigation.

Modale de connexion

Reproduire le design de la maquette fournie.

La modale doit apparaître centrée au-dessus de la landing page.

Pendant son affichage :

* conserver la vidéo de fond visible ;
* appliquer un overlay sombre sur toute la landing page ;
* empêcher les interactions avec les éléments situés derrière la modale.

Contenu :

Titre

Se connecter

Texte

Tu peux jouer à Congo Brazzaville Quiz en te connectant avec ton compte Google ou Facebook.

CTA Facebook

Se connecter avec Facebook

CTA Google

Se connecter avec Google

Footer RGPD

En te connectant, tu acceptes notre politique de confidentialité et consens au traitement de tes données personnelles conformément au RGPD.

La mention notre politique de confidentialité doit être cliquable.

Ajouter un bouton rond × positionné en haut à droite de la modale.

Authentification

Utiliser l’authentification Supabase existante.

Supporter uniquement :

* Google
* Facebook

Ne pas ajouter d’authentification email/password.

Utiliser les providers Supabase OAuth correspondants.

Gestion de la destination

Créer une variable permettant de mémoriser la destination demandée, par exemple :

pendingDestination

Lors du clic :

* Catégorie → pendingDestination = "pages/categorie.html"
* Mode → pendingDestination = "pages/mode.html"

Après authentification réussie :

* si pendingDestination existe, rediriger vers cette URL ;
* sinon rester sur la landing page.

Ne pas dupliquer la logique d’authentification dans chaque CTA : créer une fonction commune du type :

handleProtectedNavigation(destination)

Les deux boutons doivent utiliser cette même logique.

UX

La modale doit :

* s’ouvrir immédiatement au clic ;
* être responsive desktop/mobile ;
* pouvoir être fermée avec × ;
* pouvoir être fermée avec Escape ;
* conserver le focus clavier dans la modale lorsqu’elle est ouverte ;
* avoir des attributs ARIA adaptés.

Ne pas modifier le design actuel de la landing page, du logo, de la vidéo ou des CTA en dehors de l’ajout de cette fonctionnalité.