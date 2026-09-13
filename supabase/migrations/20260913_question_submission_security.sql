-- Restrict moderation RPCs to authenticated callers; each function still
-- verifies public.is_admin() before changing a submission.

REVOKE ALL ON FUNCTION public.approve_question_submission(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_question_submission(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.edit_question_submission(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.approve_question_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_question_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_question_submission(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated;