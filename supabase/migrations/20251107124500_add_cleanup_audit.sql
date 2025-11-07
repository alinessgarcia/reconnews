CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.cleanup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  delete_count integer NOT NULL,
  source text,
  run_id text
);
ALTER TABLE public.cleanup_runs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.cleanup_old_articles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  DELETE FROM public.articles
  WHERE scraped_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.cleanup_runs (run_at, delete_count, source, run_id)
  VALUES (now(), v_count, 'github_actions', NULL);
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_old_articles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_articles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_articles() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_articles() TO service_role;