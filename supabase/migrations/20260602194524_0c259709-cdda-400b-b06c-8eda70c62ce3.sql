-- ══════════════════════════════════════════════════════
-- MIGRATION 3 — Restauration droits has_role (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Donner accès à authenticated ET service_role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;