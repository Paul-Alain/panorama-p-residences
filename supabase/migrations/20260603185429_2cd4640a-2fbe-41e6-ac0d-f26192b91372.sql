-- ══════════════════════════════════════════════════════
-- MIGRATION 10 — Jobs automatiques (CORRIGÉE)
-- ══════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Job supprimé : statut "logé" calculé automatiquement côté application
-- Ne jamais exposer de clés API dans les migrations SQL