-- Remplace l'email par celui du gestionnaire
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'gestionnaire'::public.app_role
FROM auth.users
WHERE email = 'EMAIL_DU_GESTIONNAIRE_ICI'
ON CONFLICT (user_id, role) DO NOTHING;
