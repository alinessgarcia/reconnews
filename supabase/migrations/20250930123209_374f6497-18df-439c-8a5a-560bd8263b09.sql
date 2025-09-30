-- Fix security warning: Set search_path for cleanup function
DROP FUNCTION IF EXISTS public.cleanup_old_articles();

CREATE OR REPLACE FUNCTION public.cleanup_old_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.articles
  WHERE scraped_at < now() - INTERVAL '30 days';
END;
$$;