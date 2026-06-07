-- Attribuer le rôle gestionnaire à residencespanoramap@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'gestionnaire'::public.app_role
FROM auth.users
WHERE email = 'residencespanoramap@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
