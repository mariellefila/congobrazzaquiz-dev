-- Profil joueur : historique des parties solo, série de bonnes réponses,
-- badges et questions proposées.
-- Complète 20260811_init_schema.sql sans modifier les tables multijoueur.

-- ============================================================================
-- players : série de bonnes réponses consécutives
-- ============================================================================
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS current_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak INT NOT NULL DEFAULT 0;

-- ============================================================================
-- solo_games : une ligne par partie solo terminée
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.solo_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL,
  category_name TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  correct_answers INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.solo_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo_games_owner_read" ON public.solo_games
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE players.id = solo_games.player_id
      AND players.user_id = auth.uid()
    )
  );

-- Les écritures passent exclusivement par record_solo_game (SECURITY DEFINER).
CREATE POLICY "solo_games_no_direct_insert" ON public.solo_games
  FOR INSERT WITH CHECK (FALSE);

CREATE INDEX IF NOT EXISTS idx_solo_games_player_played_at
  ON public.solo_games(player_id, played_at DESC);

-- ============================================================================
-- badges : catalogue public
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition_label TEXT NOT NULL,
  icon_url TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_public_read" ON public.badges
  FOR SELECT USING (TRUE);
CREATE POLICY "badges_admin_write" ON public.badges
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "badges_admin_update" ON public.badges
  FOR UPDATE USING (FALSE);
CREATE POLICY "badges_admin_delete" ON public.badges
  FOR DELETE USING (FALSE);

INSERT INTO public.badges (id, name, condition_label, icon_url, sort_order) VALUES
  ('serie-10', 'Série de 10', '10 bonnes réponses d''affilée', 'rebuild/dashboard Joeur/Badge 10 bonnes réponses d''affilée.svg', 1),
  ('expert-brazzaville', 'Expert Brazzaville', 'Atteindre 90 % dans 4 parties', 'rebuild/dashboard Joeur/Badge Expert Brazzaville.svg', 2),
  ('contributeur', 'Contributeur', 'Proposer une question approuvée', 'rebuild/dashboard Joeur/Badge Contributeur.svg', 3)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      condition_label = EXCLUDED.condition_label,
      icon_url = EXCLUDED.icon_url,
      sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- player_badges : badges obtenus
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.player_badges (
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, badge_id)
);

ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_badges_public_read" ON public.player_badges
  FOR SELECT USING (TRUE);
CREATE POLICY "player_badges_no_direct_insert" ON public.player_badges
  FOR INSERT WITH CHECK (FALSE);

-- ============================================================================
-- question_submissions : questions proposées par les joueurs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.question_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_slug TEXT,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT question_submissions_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE public.question_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_submissions_owner_read" ON public.question_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.players
      WHERE players.id = question_submissions.player_id
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "question_submissions_owner_insert" ON public.question_submissions
  FOR INSERT WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.players
      WHERE players.id = question_submissions.player_id
      AND players.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_question_submissions_player_id
  ON public.question_submissions(player_id);

-- ============================================================================
-- Classement : position du joueur au score global
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_player_rank(p_player_id UUID)
RETURNS INT AS $$
  SELECT position FROM (
    SELECT id, RANK() OVER (ORDER BY score DESC, created_at ASC) AS position
    FROM public.players
  ) ranked
  WHERE ranked.id = p_player_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Attribution des badges à partir des données réelles du joueur
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_player_badges(p_player_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 10 bonnes réponses d'affilée
  IF EXISTS (SELECT 1 FROM public.players WHERE id = p_player_id AND best_streak >= 10) THEN
    INSERT INTO public.player_badges (player_id, badge_id)
    VALUES (p_player_id, 'serie-10')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Expert Brazzaville : au moins 90 % de bonnes réponses sur 4 parties
  IF (
    SELECT COUNT(*) FROM public.solo_games
    WHERE player_id = p_player_id
      AND total_questions > 0
      AND correct_answers::NUMERIC / total_questions >= 0.9
  ) >= 4 THEN
    INSERT INTO public.player_badges (player_id, badge_id)
    VALUES (p_player_id, 'expert-brazzaville')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Contributeur : une question proposée puis approuvée
  IF EXISTS (
    SELECT 1 FROM public.question_submissions
    WHERE player_id = p_player_id AND status = 'approved'
  ) THEN
    INSERT INTO public.player_badges (player_id, badge_id)
    VALUES (p_player_id, 'contributeur')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Enregistrement d'une partie solo terminée
-- p_results : suite ordonnée des réponses (TRUE = bonne réponse)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_solo_game(
  p_category_slug TEXT,
  p_category_name TEXT,
  p_score INT,
  p_results BOOLEAN[]
)
RETURNS TABLE (
  game_id UUID,
  xp_earned INT,
  current_streak INT,
  best_streak INT,
  total_points INT,
  player_rank INT
) AS $$
DECLARE
  v_player_id UUID;
  v_correct INT := 0;
  v_total INT := COALESCE(array_length(p_results, 1), 0);
  v_streak INT;
  v_best INT;
  v_game_best INT := 0;
  v_xp INT;
  v_result BOOLEAN;
  v_game_id UUID;
BEGIN
  SELECT id, players.current_streak, players.best_streak
    INTO v_player_id, v_streak, v_best
  FROM public.players
  WHERE user_id = auth.uid();

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Aucun profil joueur pour cet utilisateur';
  END IF;

  FOREACH v_result IN ARRAY COALESCE(p_results, ARRAY[]::BOOLEAN[]) LOOP
    IF v_result THEN
      v_correct := v_correct + 1;
      v_streak := v_streak + 1;
      v_best := GREATEST(v_best, v_streak);
      v_game_best := GREATEST(v_game_best, v_streak);
    ELSE
      v_streak := 0;
    END IF;
  END LOOP;

  v_xp := v_correct * 10 + CASE WHEN v_total > 0 AND v_correct = v_total THEN 50 ELSE 0 END;

  INSERT INTO public.solo_games (
    player_id, category_slug, category_name, score,
    correct_answers, total_questions, xp_earned, best_streak
  )
  VALUES (
    v_player_id, p_category_slug, COALESCE(p_category_name, p_category_slug), COALESCE(p_score, 0),
    v_correct, v_total, v_xp, v_game_best
  )
  RETURNING id INTO v_game_id;

  UPDATE public.players
  SET score = score + v_xp,
      games_played = games_played + 1,
      current_streak = v_streak,
      best_streak = v_best,
      updated_at = NOW()
  WHERE id = v_player_id;

  PERFORM public.refresh_player_badges(v_player_id);

  RETURN QUERY
  SELECT v_game_id, v_xp, v_streak, v_best,
         (SELECT score FROM public.players WHERE id = v_player_id),
         public.get_player_rank(v_player_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Droits
-- ============================================================================
GRANT SELECT ON public.solo_games TO authenticated;
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT SELECT ON public.player_badges TO anon, authenticated;
GRANT SELECT, INSERT ON public.question_submissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_rank(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_solo_game(TEXT, TEXT, INT, BOOLEAN[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_player_badges(UUID) FROM anon, authenticated;
