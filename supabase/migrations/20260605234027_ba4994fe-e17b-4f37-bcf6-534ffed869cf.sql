-- Migration 21 — Colonne rejected (CORRECTE)
-- Déjà présente grâce à la Migration 20 corrigée
-- IF NOT EXISTS garantit qu'il n'y a pas d'erreur

ALTER TABLE public.reviews 
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false;