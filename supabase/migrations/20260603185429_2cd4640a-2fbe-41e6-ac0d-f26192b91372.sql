CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'reservation-status-sync-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--7b778ff9-74cc-484d-b552-abc2d2333774.lovable.app/api/public/hooks/reservation-status-sync',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_Ptp-4bt-k8lzGIRl_PkHbw_FgR1L2Ov"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);