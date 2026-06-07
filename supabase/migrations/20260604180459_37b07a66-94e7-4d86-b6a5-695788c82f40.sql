-- Migration 14 — Colonnes réservations (CORRECTE)
-- Ces colonnes sont déjà présentes grâce à la Migration 1 corrigée
-- IF NOT EXISTS garantit qu'il n'y a pas d'erreur de doublon

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS arrival_time text NOT NULL DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS departure_time text NOT NULL DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'website';