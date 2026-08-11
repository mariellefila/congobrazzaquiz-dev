// Example configuration for Supabase on a static site (GitHub Pages).
// Copy to `supabase-config.js` (gitignored) or set values on window before initializing.

window.SUPABASE_URL = 'https://your-project.supabase.co';
window.SUPABASE_ANON_KEY = 'your-anon-public-key';

// In your app you can then do:
// import { initSupabase } from './src/lib/supabaseClient.js';
// await initSupabase(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
