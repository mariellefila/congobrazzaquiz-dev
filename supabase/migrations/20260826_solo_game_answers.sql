-- Historique détaillé des parties solo : une ligne par réponse.
-- Complète 20260820_player_profile.sql. Ne modifie ni les règles de score,
-- ni le contrat existant côté agrégat (solo_games conserve le résumé).

-- ============================================================================
-- solo_game_answers : détail des réponses d'une partie solo
-- Relation : solo_games 1 -> N solo_game_answers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.solo_game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solo_game_id UUID NOT NULL REFERENCES public.solo_games(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_order INT NOT NULL,
  selected_option TEXT,
  is_correct BOOLEAN NOT NULL,
  elapsed_seconds NUMERIC(6,2),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.solo_game_answers ENABLE ROW LEVEL SECURITY;

-- Un joueur ne lit que les réponses de SES propres parties.
DROP POLICY IF EXISTS "solo_game_answers_owner_read" ON public.solo_game_answers;
CREATE POLICY "solo_game_answers_owner_read" ON public.solo_game_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.solo_games sg
      JOIN public.players p ON p.id = sg.player_id
      WHERE sg.id = solo_game_answers.solo_game_id
        AND p.user_id = auth.uid()
    )
  );

-- Aucune écriture directe : tout passe par record_solo_game (SECURITY DEFINER),
-- ce qui garantit la transactionnalité partie + réponses.
DROP POLICY IF EXISTS "solo_game_answers_no_direct_insert" ON public.solo_game_answers;
CREATE POLICY "solo_game_answers_no_direct_insert" ON public.solo_game_answers
  FOR INSERT WITH CHECK (FALSE);

-- Index utiles : lecture des réponses d'une partie (ordre) et stats par question.
CREATE INDEX IF NOT EXISTS idx_solo_game_answers_game
  ON public.solo_game_answers(solo_game_id, question_order);
CREATE INDEX IF NOT EXISTS idx_solo_game_answers_question
  ON public.solo_game_answers(question_id);

-- ============================================================================
-- record_solo_game : ajout du paramètre p_answers (détail des réponses).
-- p_answers : tableau JSONB d'objets, dans l'ordre des questions :
--   [ { "question_id": "...", "selected_option": "...",
--       "is_correct": true, "elapsed_seconds": 12.3 }, ... ]
-- Le paramètre est optionnel : les appels existants (sans p_answers) continuent
-- de fonctionner et n'enregistrent alors que l'agrégat.
-- Tout est effectué dans UNE transaction implicite de fonction : si l'insertion
-- d'une réponse échoue, la partie, l'XP et les séries sont annulés (rollback).
-- ============================================================================
-- Supprime l'ancienne surcharge (4 paramètres) pour n'exposer qu'une seule
-- signature : les appels existants sans p_answers utilisent le défaut NULL.
DROP FUNCTION IF EXISTS public.record_solo_game(TEXT, TEXT, INT, BOOLEAN[]);

CREATE OR REPLACE FUNCTION public.record_solo_game(
  p_category_slug TEXT,
  p_category_name TEXT,
  p_score INT,
  p_results BOOLEAN[],
  p_answers JSONB DEFAULT NULL
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
  v_answer JSONB;
  v_order INT := 0;
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

  -- Détail des réponses (même transaction que la partie ci-dessus).
  -- jsonb_typeof protège contre le cas p_answers = 'null'::jsonb (scalaire).
  IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
      v_order := v_order + 1;
      INSERT INTO public.solo_game_answers (
        solo_game_id, question_id, question_order,
        selected_option, is_correct, elapsed_seconds
      )
      VALUES (
        v_game_id,
        v_answer->>'question_id',
        COALESCE((v_answer->>'question_order')::INT, v_order),
        v_answer->>'selected_option',
        COALESCE((v_answer->>'is_correct')::BOOLEAN, FALSE),
        NULLIF(v_answer->>'elapsed_seconds', '')::NUMERIC
      );
    END LOOP;
  END IF;

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
-- Les migrations antérieures accordent des privilèges larges par défaut :
-- on les retire explicitement ici. Seule la lecture (filtrée par RLS) reste
-- possible ; toute écriture passe par record_solo_game (SECURITY DEFINER).
-- ============================================================================
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.solo_game_answers FROM anon, authenticated;
REVOKE ALL ON public.solo_game_answers FROM anon;

GRANT SELECT ON public.solo_game_answers TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_solo_game(TEXT, TEXT, INT, BOOLEAN[], JSONB) TO authenticated;
