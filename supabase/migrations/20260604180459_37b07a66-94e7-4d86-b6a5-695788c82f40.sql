ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS arrival_time text NOT NULL DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS departure_time text NOT NULL DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'website';