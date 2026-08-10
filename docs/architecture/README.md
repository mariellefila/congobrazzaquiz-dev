# Congo-Brazza Quiz — Documentation d’architecture

Ce dossier contient l’analyse de l’architecture du projet et le plan de migration pour les phases suivantes.

## Objectif

- Documenter l’architecture actuelle du projet statique.
- Identifier la logique métier, l’état et les flux utilisateur.
- Préparer une migration progressive vers une architecture séparant présentation, application, métier et API.

## Contenu

- `architecture.md` — vision globale du projet et des composants.
- `data-model.md` — modèle de données actuel et propositions de structuration.
- `business-logic.md` — règles métier et fonctionnement du quiz.
- `frontend.md` — structure front-end et logique de présentation.
- `api.md` — état actuel de l’API (aucune) et proposition de cible.
- `testing.md` — état actuel des tests et stratégie de couverture.
- `migration-plan.md` — plan détaillé pour la migration à venir.

## Remarques

- Le projet actuel est une application statique sans système de build.
- Aucun framework n’est utilisé : HTML, CSS et JavaScript vanilla uniquement.
- La logique métier est actuellement mixée avec le DOM dans `index.html`.
