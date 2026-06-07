-- ══════════════════════════════════════════════════════
-- MIGRATION 18 — Rôles staff (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Ajouter technicien à l'enum (existe en base mais jamais assigné)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technicien';

-- is_staff : uniquement les rôles actifs (proprietaire et gestionnaire)
-- technicien, reception, menage, comptable exclus de l'accès staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = ANY (ARRAY[
        'admin',
        'proprietaire',
        'gestionnaire'
      ])
  )
$$;

-- Promouvoir les admins existants en propriétaires
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'proprietaire'::public.app_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;