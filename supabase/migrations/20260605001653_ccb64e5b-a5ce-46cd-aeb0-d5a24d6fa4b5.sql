-- 1. Add the technicien role to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technicien';

-- 2. Include technicien in the staff check (text comparison keeps this safe in-tx)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = ANY (ARRAY['admin','proprietaire','gestionnaire','technicien','reception','menage','comptable'])
  )
$function$;

-- 3. Configure current admins as owners (proprietaire already exists in the enum)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'proprietaire'::public.app_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;