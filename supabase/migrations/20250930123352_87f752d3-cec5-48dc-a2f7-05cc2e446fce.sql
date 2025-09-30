-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable realtime for articles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;

-- Schedule scraping twice daily at 7:00 AM and 7:00 PM (Brazil time = UTC-3)
-- 7:00 AM Brazil = 10:00 UTC
-- 7:00 PM Brazil = 22:00 UTC

-- Morning scraping job (7:00 AM Brazil = 10:00 UTC)
SELECT cron.schedule(
  'scrape-news-morning',
  '0 10 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obnRhZGN5cXNkcWdoZnRpdm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzgzMzQsImV4cCI6MjA3NDc1NDMzNH0.H7ZUI6E-U89B6BdSo67coLOZMsDLQ-u1QPbt3atOcVs"}'::jsonb,
      body := '{"scheduled": true, "time": "morning"}'::jsonb
    ) as request_id;
  $$
);

-- Evening scraping job (7:00 PM Brazil = 22:00 UTC)
SELECT cron.schedule(
  'scrape-news-evening',
  '0 22 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obnRhZGN5cXNkcWdoZnRpdm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzgzMzQsImV4cCI6MjA3NDc1NDMzNH0.H7ZUI6E-U89B6BdSo67coLOZMsDLQ-u1QPbt3atOcVs"}'::jsonb,
      body := '{"scheduled": true, "time": "evening"}'::jsonb
    ) as request_id;
  $$
);