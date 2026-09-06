-- Back-office admin read access.
-- Authentication remains Supabase Auth; authorization is stored in public.admin_users.

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_role_not_empty CHECK (length(trim(role)) > 0)
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO service_role;

DROP POLICY IF EXISTS "admin_users_self_read" ON public.admin_users;
CREATE POLICY "admin_users_self_read" ON public.admin_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "questions_admin_read" ON public.questions;
CREATE POLICY "questions_admin_read" ON public.questions
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "advertisements_admin_read" ON public.advertisements;
CREATE POLICY "advertisements_admin_read" ON public.advertisements
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "solo_games_admin_read" ON public.solo_games;
CREATE POLICY "solo_games_admin_read" ON public.solo_games
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "question_submissions_admin_read" ON public.question_submissions;
CREATE POLICY "question_submissions_admin_read" ON public.question_submissions
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "answers_admin_read" ON public.answers;
CREATE POLICY "answers_admin_read" ON public.answers
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "game_players_admin_read" ON public.game_players;
CREATE POLICY "game_players_admin_read" ON public.game_players
  FOR SELECT TO authenticated USING (public.is_admin());