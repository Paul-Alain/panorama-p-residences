-- Migration 17 — Colonne advance_amount (CORRECTE)
-- Déjà présente grâce à la Migration 1 corrigée
-- IF NOT EXISTS garantit qu'il n'y a pas d'erreur

ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS advance_amount numeric NOT NULL DEFAULT 0;