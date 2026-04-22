-- Habilitar extensões necessárias para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar coleta de notícias às 10:00 (horário de Brasília UTC-3, então 13:00 UTC)
SELECT cron.schedule(
  'collect-news-morning',
  '0 13 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer __REDACTED_ROTATE_KEY__"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Agendar coleta de notícias às 22:00 (horário de Brasília UTC-3, então 01:00 UTC do dia seguinte)
SELECT cron.schedule(
  'collect-news-night',
  '0 1 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer __REDACTED_ROTATE_KEY__"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
