-- Unschedule legacy cron jobs that relied on embedded API tokens
DO $$
BEGIN
  PERFORM cron.unschedule('scrape-news-morning');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('scrape-news-evening');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Ensure the required secret exists before creating the schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  ) THEN
    RAISE EXCEPTION 'Vault secret % is required before running this migration.', 'SUPABASE_SERVICE_ROLE_KEY';
  END IF;
END;
$$;

-- Recreate morning scraping job with Authorization header resolved securely from Vault
SELECT cron.schedule(
  'scrape-news-morning',
  '0 10 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
          LIMIT 1
        )
      ),
      body := jsonb_build_object('scheduled', true, 'time', 'morning')
    ) AS request_id;
  $$
);

-- Recreate evening scraping job with Authorization header resolved securely from Vault
SELECT cron.schedule(
  'scrape-news-evening',
  '0 22 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ohntadcyqsdqghftivou.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
          LIMIT 1
        )
      ),
      body := jsonb_build_object('scheduled', true, 'time', 'evening')
    ) AS request_id;
  $$
);
