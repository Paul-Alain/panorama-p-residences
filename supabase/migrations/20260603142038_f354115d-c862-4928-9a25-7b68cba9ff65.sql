-- ══════════════════════════════════════════════════════
-- MIGRATION 4 — Gestion des rôles (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Seuls admin ET propriétaire peuvent gérer les rôles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'proprietaire'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);