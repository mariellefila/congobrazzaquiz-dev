-- Badges : un badge n'est obtenu que si sa condition métier est réellement
-- satisfaite par les données persistées, et sa date d'obtention correspond à
-- la première occurrence où la condition a été remplie.
-- Complète 20260820_player_profile.sql (aucune règle de score modifiée).

-- ============================================================================
-- evaluate_player_badges : calcul déterministe des badges MÉRITÉS
-- Retourne uniquement les badges dont la condition est satisfaite, avec la
-- date réelle de première satisfaction. Aucune écriture.
--   serie-10           : une partie où la série a atteint 10 bonnes réponses
--   expert-brazzaville : 4 parties terminées avec >= 90 % de bonnes réponses
--   contributeur       : une question proposée passée au statut 'approved'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.evaluate_player_badges(p_player_id UUID)
RETURNS TABLE (badge_id TEXT, earned_at TIMESTAMPTZ) AS $$
  -- Première partie ayant atteint une série de 10 (la série peut courir
  -- d'une partie à l'autre : solo_games.best_streak intègre ce report).
  SELECT 'serie-10'::TEXT, MIN(g.played_at)
  FROM public.solo_games g
  WHERE g.player_id = p_player_id
    AND g.best_streak >= 10
  HAVING COUNT(*) > 0

  UNION ALL

  -- Date de la 4e partie atteignant le seuil de 90 %.
  SELECT 'expert-brazzaville'::TEXT, q.played_at
  FROM (
    SELECT g.played_at, ROW_NUMBER() OVER (ORDER BY g.played_at, g.id) AS rn
    FROM public.solo_games g
    WHERE g.player_id = p_player_id
      AND g.total_questions > 0
      AND g.correct_answers::NUMERIC / g.total_questions >= 0.9
  ) q
  WHERE q.rn = 4

  UNION ALL

  -- Date d'approbation de la première question approuvée.
  SELECT 'contributeur'::TEXT, MIN(COALESCE(s.reviewed_at, s.created_at))
  FROM public.question_submissions s
  WHERE s.player_id = p_player_id
    AND s.status = 'approved'
  HAVING COUNT(*) > 0;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- refresh_player_badges : synchronise player_badges avec l'évaluation réelle.
-- Ajoute les badges mérités (avec leur date réelle) ET retire ceux qui ne le
-- sont pas : la présence d'une ligne ne peut donc plus survivre à sa condition.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_player_badges(p_player_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.player_badges pb
  WHERE pb.player_id = p_player_id
    AND NOT EXISTS (
      SELECT 1 FROM public.evaluate_player_badges(p_player_id) e
      WHERE e.badge_id = pb.badge_id
        AND e.earned_at IS NOT NULL
    );

  INSERT INTO public.player_badges (player_id, badge_id, earned_at)
  SELECT p_player_id, e.badge_id, e.earned_at
  FROM public.evaluate_player_badges(p_player_id) e
  WHERE e.earned_at IS NOT NULL
  ON CONFLICT (player_id, badge_id) DO UPDATE
    SET earned_at = EXCLUDED.earned_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Le badge Contributeur ne dépend pas d'une partie : il doit être réévalué
-- dès qu'une proposition change de statut, pas à la prochaine partie jouée.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.question_submissions_refresh_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_player_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_player_id := OLD.player_id;
  ELSE
    v_player_id := NEW.player_id;
  END IF;

  PERFORM public.refresh_player_badges(v_player_id);

  IF TG_OP = 'UPDATE' AND OLD.player_id IS DISTINCT FROM NEW.player_id THEN
    PERFORM public.refresh_player_badges(OLD.player_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS question_submissions_badges ON public.question_submissions;
CREATE TRIGGER question_submissions_badges
  AFTER INSERT OR DELETE OR UPDATE OF status, player_id, reviewed_at
  ON public.question_submissions
  FOR EACH ROW EXECUTE FUNCTION public.question_submissions_refresh_badges();

-- ============================================================================
-- Reprise des données : retire les badges attribués à tort par l'ancienne
-- logique et recale les dates d'obtention sur les données réelles.
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.players p
    WHERE EXISTS (SELECT 1 FROM public.player_badges b WHERE b.player_id = p.id)
       OR EXISTS (SELECT 1 FROM public.solo_games g WHERE g.player_id = p.id)
       OR EXISTS (SELECT 1 FROM public.question_submissions s WHERE s.player_id = p.id)
  LOOP
    PERFORM public.refresh_player_badges(r.id);
  END LOOP;
END $$;

-- Aucune exécution directe côté client : l'évaluation reste serveur.
REVOKE ALL ON FUNCTION public.evaluate_player_badges(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_player_badges(UUID) FROM anon, authenticated;
