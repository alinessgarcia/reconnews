-- Atualizar função de limpeza de artigos com nova lógica de rotação
CREATE OR REPLACE FUNCTION public.cleanup_old_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Remover notícias do dia atual que têm mais de 24 horas desde a coleta
  DELETE FROM public.articles
  WHERE published_at >= CURRENT_DATE 
    AND scraped_at < now() - INTERVAL '24 hours';
  
  -- Remover notícias antigas (anteriores a hoje) que têm mais de 12 horas desde a coleta
  DELETE FROM public.articles
  WHERE (published_at < CURRENT_DATE OR published_at IS NULL)
    AND scraped_at < now() - INTERVAL '12 hours';
END;
$function$