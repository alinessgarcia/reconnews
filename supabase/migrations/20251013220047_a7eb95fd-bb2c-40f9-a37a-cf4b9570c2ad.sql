-- Drop existing cron jobs with hardcoded keys
SELECT cron.unschedule('scrape-news-morning');
SELECT cron.unschedule('scrape-news-evening');

-- Recreate morning scraping job using Vault for secure key access
-- This uses the service role key stored securely in Vault instead of hardcoding it
SELECT cron.schedule(
  'scrape-news-morning',
  '0 10 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
      ),
      body := '{"scheduled": true, "time": "morning"}'::jsonb
    ) as request_id;
  $$
);

-- Recreate evening scraping job using Vault for secure key access
SELECT cron.schedule(
  'scrape-news-evening',
  '0 22 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
      ),
      body := '{"scheduled": true, "time": "evening"}'::jsonb
    ) as request_id;
  $$
);