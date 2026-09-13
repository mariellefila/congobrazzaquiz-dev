-- Private Storage for player question submission images.
-- Files are owned by the first path segment: {auth.uid()}/{uuid}.{extension}.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-submissions',
  'question-submissions',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "question_submission_images_owner_insert" ON storage.objects;
CREATE POLICY "question_submission_images_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'question-submissions'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "question_submission_images_owner_read" ON storage.objects;
CREATE POLICY "question_submission_images_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'question-submissions'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "question_submission_images_owner_delete" ON storage.objects;
CREATE POLICY "question_submission_images_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'question-submissions'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

REVOKE ALL ON storage.objects FROM anon;
REVOKE ALL ON storage.buckets FROM anon;

DROP POLICY IF EXISTS "question_submissions_owner_insert" ON public.question_submissions;
CREATE POLICY "question_submissions_owner_insert" ON public.question_submissions
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND published_question_id IS NULL
    AND rejection_reason IS NULL
    AND (
      image IS NULL
      OR image ~ '^https://'
      OR (storage.foldername(image))[1] = (SELECT auth.uid()::text)
    )
  );
