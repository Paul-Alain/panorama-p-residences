-- Migration 8 — Sécurité handle_new_user (CORRECTE)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() 
FROM PUBLIC, anon, authenticated;