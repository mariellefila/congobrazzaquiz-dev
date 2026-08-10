# Modèle de données actuel

## Structure actuelle

Les questions sont stockées dans un objet `allQuestions` défini inline dans `index.html`.

Structure observée :

- `allQuestions` : objet clef/valeur, chaque clef est le nom d’une catégorie.
- Chaque catégorie contient un tableau de questions.
- Chaque question contient :
  - `question` : texte de la question.
  - `options` : tableau de 4 propositions.
  - `answer` : chaîne de caractères correspondant à la bonne réponse.
  - `image` : optionnel, présent uniquement pour certaines questions dans `questions_tourismes.js`.

### Exemple

```js
{
  "Géographie": [
    {
      question: "Quelle est la capitale du Congo-Brazzaville ?",
      options: ["Pointe-Noire", "Kinshasa", "Brazzaville", "Owando"],
      answer: "Brazzaville"
    }
  ]
}
```

## Données identifiées

- Catégories présentes dans `allQuestions` :
  - `Géographie`
  - `Histoire`
  - `Gastronomie`
  - `Politique`
  - `Littérature` (?) — cette catégorie apparaît dans la définition mais son contenu est partiellement visible dans le fichier.
- `questions_tourismes.js` contient une autre liste de questions sur le tourisme, avec des images, mais ce fichier n’est pas chargé par la page.

## Observations

- Il n’y a aucun identifiant unique (`id`) pour les questions.
- Il n’y a pas de champ `difficulty`, `explanation`, `tags` ou `metadata` standard.
- La bonne réponse est stockée en clair dans le champ `answer`.
- Certaines questions se répètent ou utilisent des formulations très proches.
- La catégorie est implicite via la clé d’objet plutôt qu’un champ explicite sur chaque question.
- Le fichier `questions_tourismes.js` existe mais n’est pas importé par `index.html` et n’est pas considéré comme source de vérité actuelle.

## Proposition de modèle cible

Pour une migration vers Supabase et un API plus propre, on recommande :

### Table `categories`

- `id` : identifiant unique
- `name` : texte de la catégorie
- `slug` : valeur normalisée
- `created_at`
- `updated_at`

### Table `questions`

- `id` : identifiant unique
- `category_id` : référence à `categories.id`
- `question_text` : texte de la question
- `options` : `jsonb` ou `text[]`
- `correct_answer` : réponse correcte ou indice de la réponse correcte
- `image_url` : chaîne de texte optionnelle
- `source` : par exemple `static` ou `tourisme`
- `created_at`
- `updated_at`

### Option alternative

- `choices` séparée de `questions` si besoin d’une normalisation extrême.
- `correct_choice_index` au lieu de `correct_answer` pour éviter les erreurs liées au texte.

## Liens avec l’application actuelle

- La migration devra conserver la structure minimale : `question`, `options`, `answer`, `image`.
- La catégorie doit être conservée.
- Il faudra éviter d’exposer `correct_answer` aux clients avant validation.

## Notes de sécurité

- Le champ `correct_answer` ne devrait pas être transmis au frontend avec la liste de questions.
- Si le modèle stocke l’indice correct, il faut renvoyer uniquement l’option sélectionnée ou vérifier côté serveur.
