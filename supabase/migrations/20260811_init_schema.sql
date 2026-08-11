-- Initial schema for Congo-Brazza Quizz with Supabase & RLS
-- Tables: categories, questions, advertisements, players, games, game_players, answers

-- ============================================================================
-- Categories (public read, admin write)
-- ============================================================================
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read categories
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (TRUE);

-- Policy: only admins (service_role) can insert/update/delete
CREATE POLICY "categories_admin_write" ON public.categories
  FOR INSERT WITH CHECK (FALSE); -- disallow via anon key
CREATE POLICY "categories_admin_update" ON public.categories
  FOR UPDATE USING (FALSE);
CREATE POLICY "categories_admin_delete" ON public.categories
  FOR DELETE USING (FALSE);

-- ============================================================================
-- Questions (public read without answer, admin write/update)
-- ============================================================================
CREATE TABLE public.questions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of answer strings
  answer TEXT NOT NULL, -- Correct answer (hidden from anon clients via view)
  image TEXT, -- URL to question image
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read questions (but view questions_public hides answer)
CREATE POLICY "questions_public_read" ON public.questions
  FOR SELECT USING (TRUE);

-- Policy: only admins can write
CREATE POLICY "questions_admin_write" ON public.questions
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "questions_admin_update" ON public.questions
  FOR UPDATE USING (FALSE);
CREATE POLICY "questions_admin_delete" ON public.questions
  FOR DELETE USING (FALSE);

-- Public view (WITHOUT answer column) for frontend consumption
CREATE VIEW public.questions_public AS
  SELECT id, category_id, question, options, image, created_at, updated_at
  FROM public.questions;

ALTER VIEW public.questions_public OWNER TO postgres;

GRANT SELECT ON public.questions_public TO anon;

-- ============================================================================
-- Advertisements (public read, admin write)
-- ============================================================================
CREATE TABLE public.advertisements (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  title TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read active ads
CREATE POLICY "advertisements_public_read" ON public.advertisements
  FOR SELECT USING (active = TRUE);

-- Policy: only admins can write
CREATE POLICY "advertisements_admin_write" ON public.advertisements
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "advertisements_admin_update" ON public.advertisements
  FOR UPDATE USING (FALSE);
CREATE POLICY "advertisements_admin_delete" ON public.advertisements
  FOR DELETE USING (FALSE);

-- ============================================================================
-- Players (auth required, self-referential)
-- ============================================================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  score INT DEFAULT 0,
  games_played INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read player profiles (public)
CREATE POLICY "players_public_read" ON public.players
  FOR SELECT USING (TRUE);

-- Policy: authenticated users can insert only their own profile
CREATE POLICY "players_auth_insert" ON public.players
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: users can update only their own profile
CREATE POLICY "players_auth_update" ON public.players
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: users can delete only their own profile
CREATE POLICY "players_auth_delete" ON public.players
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Games (multiplayer sessions)
-- ============================================================================
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  host_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting', -- waiting, active, finished
  state JSONB DEFAULT '{}', -- Game-specific state (scores, current question index, etc.)
  max_players INT DEFAULT 4,
  current_question_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read public games
CREATE POLICY "games_public_read" ON public.games
  FOR SELECT USING (TRUE);

-- Policy: authenticated users can create games
CREATE POLICY "games_auth_insert" ON public.games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: host can update own game
CREATE POLICY "games_auth_update" ON public.games
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE players.id = games.host_player_id
      AND players.user_id = auth.uid()
    )
  );

-- Policy: host can delete own game
CREATE POLICY "games_auth_delete" ON public.games
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE players.id = games.host_player_id
      AND players.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Game Players (join table for multiplayer)
-- ============================================================================
CREATE TABLE public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  answered_count INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read game_players
CREATE POLICY "game_players_public_read" ON public.game_players
  FOR SELECT USING (TRUE);

-- Policy: authenticated users can join games
CREATE POLICY "game_players_auth_insert" ON public.game_players
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.players WHERE id = player_id AND user_id = auth.uid())
  );

-- Policy: players can update their own game_player record
CREATE POLICY "game_players_auth_update" ON public.game_players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE players.id = game_players.player_id
      AND players.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Answers (player responses to questions)
-- ============================================================================
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read answers for games they're in
CREATE POLICY "answers_auth_read" ON public.answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_players gp
      WHERE gp.game_id = answers.game_id
      AND gp.player_id IN (
        SELECT id FROM public.players
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: authenticated users can submit answers (via RPC validate_answer)
CREATE POLICY "answers_auth_insert" ON public.answers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.players
      WHERE id = player_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- RPC Function: validate_answer (server-side answer validation)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_answer(
  game_id UUID,
  player_id UUID,
  question_id TEXT,
  selected_option TEXT
)
RETURNS TABLE (
  is_correct BOOLEAN,
  correct_answer TEXT
) AS $$
DECLARE
  v_correct_answer TEXT;
  v_is_correct BOOLEAN;
BEGIN
  -- Fetch the correct answer (only accessible to this function via SECURITY DEFINER)
  SELECT answer INTO v_correct_answer
  FROM public.questions
  WHERE id = question_id;

  -- Check if selected option matches correct answer
  v_is_correct := (selected_option = v_correct_answer);

  -- Record the answer
  INSERT INTO public.answers (game_id, player_id, question_id, selected_option, is_correct)
  VALUES (game_id, player_id, question_id, selected_option, v_is_correct);

  -- Update game_players score
  IF v_is_correct THEN
    UPDATE public.game_players
    SET score = score + 1, answered_count = answered_count + 1
    WHERE game_id = game_id AND player_id = player_id;
  ELSE
    UPDATE public.game_players
    SET answered_count = answered_count + 1
    WHERE game_id = game_id AND player_id = player_id;
  END IF;

  RETURN QUERY SELECT v_is_correct, v_correct_answer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION public.validate_answer(UUID, UUID, TEXT, TEXT) TO anon;

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX idx_questions_category_id ON public.questions(category_id);
CREATE INDEX idx_games_category_id ON public.games(category_id);
CREATE INDEX idx_games_host_player_id ON public.games(host_player_id);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_game_players_game_id ON public.game_players(game_id);
CREATE INDEX idx_game_players_player_id ON public.game_players(player_id);
CREATE INDEX idx_answers_game_id ON public.answers(game_id);
CREATE INDEX idx_answers_player_id ON public.answers(player_id);
CREATE INDEX idx_answers_question_id ON public.answers(question_id);
CREATE INDEX idx_players_user_id ON public.players(user_id);
