-- Limpar dados antigos inválidos
DELETE FROM public.articles WHERE source IN ('BBC', 'CNN') OR title LIKE '%Nossos parceiros%' OR title LIKE '%Redes sociais%' OR description IS NULL;

-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remover cron jobs anteriores se existirem
DO $$ 
BEGIN
    PERFORM cron.unschedule('scrape-news-morning');
    PERFORM cron.unschedule('scrape-news-evening');
EXCEPTION WHEN OTHERS THEN
    -- Ignora erro se os jobs não existirem
END $$;

-- Criar cron job para executar às 10:00 (manhã)
SELECT cron.schedule(
    'scrape-news-morning',
    '0 10 * * *', -- Todo dia às 10:00
    $$
    SELECT
      net.http_post(
          url:='https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer __REDACTED_ROTATE_KEY__"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Criar cron job para executar às 22:00 (noite)
SELECT cron.schedule(
    'scrape-news-evening',
    '0 22 * * *', -- Todo dia às 22:00
    $$
    SELECT
      net.http_post(
          url:='https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer __REDACTED_ROTATE_KEY__"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
