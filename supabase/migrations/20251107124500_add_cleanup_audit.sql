-- Cleanup audit and function (final version)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Auditoria das execuções de limpeza
CREATE TABLE IF NOT EXISTS public.cleanup_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamp NOT NULL DEFAULT now(),
  deleted_count integer NOT NULL,
  run_text text
);

-- Garantir recriação da função com critério de 90 dias em published_at
DROP FUNCTION IF EXISTS public.cleanup_old_articles();
CREATE OR REPLACE FUNCTION public.cleanup_old_articles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Remove artigos publicados há mais de 90 dias
  DELETE FROM public.articles a
  WHERE a.published_at IS NOT NULL
    AND a.published_at < (now() - interval '90 days');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.cleanup_runs (deleted_count, run_text)
  VALUES (v_count, 'cleanup_old_articles executed');

  RETURN v_count;
END;
$$;

-- Privilégios: apenas service_role pode executar via RPC/REST
REVOKE ALL ON FUNCTION public.cleanup_old_articles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_articles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_articles() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_articles() TO service_role;