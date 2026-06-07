-- ══════════════════════════════════════════════════════
-- MIGRATION 16 — Données initiales logements (CORRIGÉE)
-- ══════════════════════════════════════════════════════

UPDATE public.logements
SET
  sort_order = 1,
  price = 20000,
  currency = 'FCFA',
  price_unit = 'unité',
  equipments = ARRAY['Wi-Fi','Cuisine','Douche moderne','Télévision']
WHERE type = 'chambre';

UPDATE public.logements
SET
  sort_order = 2,
  price = 30000,
  currency = 'FCFA',
  price_unit = 'unité',
  equipments = ARRAY['Wi-Fi','Cuisine','Douche moderne','Télévision']
WHERE type = 'studio';

UPDATE public.logements
SET
  sort_order = 3,
  price = 55000,
  currency = 'FCFA',
  price_unit = 'unité',
  equipments = ARRAY['Wi-Fi','Cuisine','Douche moderne','Télévision']
WHERE type = 'appartement';