-- Fix grants and validate_answer implementation
-- This migration is intended for projects where the initial schema was already applied
-- without complete grants.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Public read tables for quiz bootstrap.
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.advertisements TO anon, authenticated;

-- Questions are readable by clients in the current solo architecture.
-- If answer leakage becomes a concern, switch frontend reads to questions_public view.
GRANT SELECT ON public.questions TO anon, authenticated;

-- Admin/service writes for seed/import and maintenance.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO service_role;

-- Authenticated users need SQL privileges; RLS still enforces row-level limits.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;

DROP FUNCTION IF EXISTS public.validate_answer(UUID, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.validate_answer(
  p_game_id UUID,
  p_player_id UUID,
  p_question_id TEXT,
  p_selected_option TEXT
)
RETURNS TABLE (
  is_correct BOOLEAN,
  correct_answer TEXT
) AS $$
DECLARE
  v_correct_answer TEXT;
  v_is_correct BOOLEAN;
BEGIN
  SELECT q.answer INTO v_correct_answer
  FROM public.questions q
  WHERE q.id = p_question_id;

  v_is_correct := (p_selected_option = v_correct_answer);

  INSERT INTO public.answers (game_id, player_id, question_id, selected_option, is_correct)
  VALUES (p_game_id, p_player_id, p_question_id, p_selected_option, v_is_correct);

  IF v_is_correct THEN
    UPDATE public.game_players gp
    SET score = gp.score + 1,
        answered_count = gp.answered_count + 1
    WHERE gp.game_id = p_game_id
      AND gp.player_id = p_player_id;
  ELSE
    UPDATE public.game_players gp
    SET answered_count = gp.answered_count + 1
    WHERE gp.game_id = p_game_id
      AND gp.player_id = p_player_id;
  END IF;

  RETURN QUERY SELECT v_is_correct, v_correct_answer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.validate_answer(UUID, UUID, TEXT, TEXT) TO anon, authenticated;
