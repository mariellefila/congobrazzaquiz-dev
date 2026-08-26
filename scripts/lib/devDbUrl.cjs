// Construit l'URL de connexion à la base Supabase DEV à partir de l'environnement.
// Aucun secret ni identifiant de projet n'est codé en dur dans le dépôt.
//
// Variables reconnues :
//   SUPABASE_DATABASEPASSWORD  (requis) mot de passe de la base
//   SUPABASE_PROJECT_REF       référence du projet ; à défaut déduite de
//                              SUPABASE_PROJECTURL / SUPABASE_URL / SUPABASE_CONNECTIONSTRING
//   SUPABASE_DB_HOST           hôte du pooler (défaut : aws-0-eu-central-1.pooler.supabase.com)
//   SUPABASE_DB_PORT           port (défaut : 5432)

function resolveProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;

  const candidates = [
    process.env.SUPABASE_PROJECTURL,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_CONNECTIONSTRING,
  ].filter(Boolean);

  for (const value of candidates) {
    const match = value.match(/(?:https:\/\/|@db\.)([a-z0-9]+)\.supabase\.co/i);
    if (match) return match[1];
  }

  return null;
}

function getDevDbUrl() {
  const password = process.env.SUPABASE_DATABASEPASSWORD;
  if (!password) {
    throw new Error("Variable d'environnement SUPABASE_DATABASEPASSWORD manquante.");
  }

  const projectRef = resolveProjectRef();
  if (!projectRef) {
    throw new Error("Impossible de déterminer la référence du projet Supabase : définissez SUPABASE_PROJECT_REF.");
  }

  const host = process.env.SUPABASE_DB_HOST || 'aws-0-eu-central-1.pooler.supabase.com';
  const port = process.env.SUPABASE_DB_PORT || '5432';

  return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
}

// Échoue proprement (message + exit 1) plutôt que de propager une stack contenant l'URL.
function requireDevDbUrl() {
  try {
    return getDevDbUrl();
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

module.exports = { getDevDbUrl, requireDevDbUrl, resolveProjectRef };
