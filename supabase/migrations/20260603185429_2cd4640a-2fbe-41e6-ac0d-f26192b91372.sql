-- ══════════════════════════════════════════════════════
-- MIGRATION 10 — Jobs automatiques (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- NB: Le job de synchronisation des statuts est supprimé car :
-- 1. Le statut "logé" est calculé automatiquement côté application
-- 2. L'URL Lovable ne sera plus valide après migration
-- 3. La clé API ne doit jamais être exposée dans les migrations SQL

-- Si un job automatique est nécessaire à l'avenir,
-- utiliser des variables d'environnement et non des clés en dur