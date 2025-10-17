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
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obnRhZGN5cXNkcWdoZnRpdm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzgzMzQsImV4cCI6MjA3NDc1NDMzNH0.H7ZUI6E-U89B6BdSo67coLOZMsDLQ-u1QPbt3atOcVs"}'::jsonb,
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
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obnRhZGN5cXNkcWdoZnRpdm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzgzMzQsImV4cCI6MjA3NDc1NDMzNH0.H7ZUI6E-U89B6BdSo67coLOZMsDLQ-u1QPbt3atOcVs"}'::jsonb,
        body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);