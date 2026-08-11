let _supabase = null;

export async function initSupabase(supabaseUrl, supabaseAnonKey) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or ANON key for initSupabase');
  }
  if (_supabase) return _supabase;
  const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  const { createClient } = mod;
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

export function getSupabase() {
  if (!_supabase) throw new Error('Supabase client not initialised. Call initSupabase() first.');
  return _supabase;
}

export function isSupabaseInitialized() {
  return !!_supabase;
}
