-- Parcours de soumission et de modération des questions.
-- Les transitions de statut et la publication passent uniquement par les RPC
-- SECURITY DEFINER ci-dessous afin de rester atomiques.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS explanation_source TEXT;

ALTER TABLE public.question_submissions
  ADD COLUMN IF NOT EXISTS explanation_source TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS published_question_id TEXT REFERENCES public.questions(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE OR REPLACE FUNCTION public.has_valid_question_answers(
  p_options JSONB,
  p_answer TEXT
)
RETURNS BOOLEAN AS $$
  SELECT jsonb_typeof(p_options) = 'array'
    AND jsonb_array_length(p_options) = 4
    AND p_answer = btrim(p_answer)
    AND p_answer <> ''
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p_options) AS option_value
      WHERE option_value = p_answer
    )
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p_options) AS option_value
      WHERE btrim(option_value) = '' OR option_value <> btrim(option_value)
    )
    AND (
      SELECT COUNT(DISTINCT option_value)
      FROM jsonb_array_elements_text(p_options) AS option_value
    ) = 4;
$$ LANGUAGE sql IMMUTABLE SET search_path = public;

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_valid_answers_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_valid_answers_check
  CHECK (public.has_valid_question_answers(options, answer)) NOT VALID;

ALTER TABLE public.question_submissions
  DROP CONSTRAINT IF EXISTS question_submissions_valid_answers_check;
ALTER TABLE public.question_submissions
  ADD CONSTRAINT question_submissions_valid_answers_check
  CHECK (
    question = btrim(question)
    AND question <> ''
    AND public.has_valid_question_answers(options, answer)
  ) NOT VALID;

ALTER TABLE public.question_submissions
  DROP CONSTRAINT IF EXISTS question_submissions_category_slug_fkey;
ALTER TABLE public.question_submissions
  ADD CONSTRAINT question_submissions_category_slug_fkey
  FOREIGN KEY (category_slug) REFERENCES public.categories(slug) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS question_submissions_published_question_id_unique
  ON public.question_submissions(published_question_id)
  WHERE published_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_submissions_status_created_at
  ON public.question_submissions(status, created_at DESC);

GRANT SELECT, INSERT ON public.question_submissions TO authenticated;
GRANT SELECT, UPDATE ON public.questions TO authenticated;

DROP POLICY IF EXISTS "question_submissions_owner_insert" ON public.question_submissions;
CREATE POLICY "question_submissions_owner_insert" ON public.question_submissions
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND published_question_id IS NULL
    AND rejection_reason IS NULL
  );

DROP POLICY IF EXISTS "question_submissions_owner_update" ON public.question_submissions;
CREATE POLICY "question_submissions_owner_update" ON public.question_submissions
  FOR UPDATE TO authenticated
  USING (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    AND NOT public.is_admin()
  )
  WITH CHECK (FALSE);

CREATE OR REPLACE FUNCTION public.edit_question_submission(
  p_submission_id UUID,
  p_category_slug TEXT,
  p_question TEXT,
  p_options JSONB,
  p_answer TEXT,
  p_explanation_source TEXT DEFAULT NULL,
  p_image TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_submission public.question_submissions%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès administrateur requis' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_submission
  FROM public.question_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposition introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_submission.status <> 'pending' THEN
    RAISE EXCEPTION 'Seules les propositions en attente peuvent être modifiées' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = p_category_slug) THEN
    RAISE EXCEPTION 'Catégorie invalide' USING ERRCODE = '23503';
  END IF;
  IF p_question <> btrim(p_question) OR p_question = ''
    OR NOT public.has_valid_question_answers(p_options, p_answer) THEN
    RAISE EXCEPTION 'Question ou réponses invalides' USING ERRCODE = '23514';
  END IF;

  UPDATE public.question_submissions
  SET category_slug = p_category_slug,
      question = p_question,
      options = p_options,
      answer = p_answer,
      explanation_source = NULLIF(btrim(p_explanation_source), ''),
      image = NULLIF(btrim(p_image), '')
  WHERE id = v_submission.id;

  RETURN v_submission.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.approve_question_submission(p_submission_id UUID)
RETURNS TABLE (
  submission_id UUID,
  published_question_id TEXT,
  reviewed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_submission public.question_submissions%ROWTYPE;
  v_question_id TEXT;
  v_reviewed_at TIMESTAMPTZ := NOW();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès administrateur requis' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_submission
  FROM public.question_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposition introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_submission.status <> 'pending' OR v_submission.published_question_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cette proposition a déjà été traitée' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = v_submission.category_slug) THEN
    RAISE EXCEPTION 'Catégorie invalide' USING ERRCODE = '23503';
  END IF;
  IF NOT public.has_valid_question_answers(v_submission.options, v_submission.answer) THEN
    RAISE EXCEPTION 'Les quatre réponses doivent être distinctes et inclure la bonne réponse' USING ERRCODE = '23514';
  END IF;

  v_question_id := 'submission-' || replace(v_submission.id::TEXT, '-', '');
  INSERT INTO public.questions (id, category_id, question, options, answer, image, explanation_source)
  SELECT v_question_id, c.id, v_submission.question, v_submission.options,
         v_submission.answer, v_submission.image, v_submission.explanation_source
  FROM public.categories c
  WHERE c.slug = v_submission.category_slug;

  UPDATE public.question_submissions
  SET status = 'approved',
      reviewed_at = v_reviewed_at,
      reviewed_by = auth.uid(),
      published_question_id = v_question_id,
      rejection_reason = NULL
  WHERE id = v_submission.id;

  RETURN QUERY SELECT v_submission.id, v_question_id, v_reviewed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_question_submission(
  p_submission_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  submission_id UUID,
  reviewed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_submission public.question_submissions%ROWTYPE;
  v_reviewed_at TIMESTAMPTZ := NOW();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès administrateur requis' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_submission
  FROM public.question_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposition introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_submission.status <> 'pending' THEN
    RAISE EXCEPTION 'Cette proposition a déjà été traitée' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.question_submissions
  SET status = 'rejected',
      reviewed_at = v_reviewed_at,
      reviewed_by = auth.uid(),
      rejection_reason = NULLIF(btrim(p_rejection_reason), '')
  WHERE id = v_submission.id;

  RETURN QUERY SELECT v_submission.id, v_reviewed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.approve_question_submission(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_question_submission(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.edit_question_submission(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_question_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_question_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_question_submission(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated;