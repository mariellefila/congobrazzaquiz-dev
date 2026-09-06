export async function requireAdminAccess(supabase) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData.session?.user;
  if (!user) return { user: null, admin: null };

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id, role, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (adminError) {
    throw Object.assign(new Error('Vérification admin indisponible'), {
      source: 'admin_users',
      cause: adminError,
    });
  }

  return { user, admin };
}