# Migration Proposal — Physical Units & Occupancy Calendar

> Review only. No schema changes will be executed until you approve.

## Goal

Move Panorama P from **category-level** accommodations (1 row per type) to **per-unit** inventory (9 real units), and link each reservation to a specific unit — without losing any existing data, RLS, or auth.

Target inventory:

```text
4 chambres   → Chambre 1..4
4 studios    → Studio 1..4
1 appartement → Appartement 1
= 9 physical units
```

---

## 1. How to represent each physical unit

Two options. **Recommended: Option A** (cleaner, future-proof).

### Option A — New `logement_units` table (recommended)
Keep the existing `logements` table as the **category/template** (description, price, images, equipment — already used by the public site). Add a child table for physical units.

```text
logement_units
--------------
id            uuid (PK)
logement_id   uuid  -> logements.id   (which category/template this unit belongs to)
label         text  ("Chambre 1", "Studio 2", ...)
unit_number   int   (1..4)
available     boolean default true
sort_order    int
created_at / updated_at
```

- 9 rows total: 4 linked to the "chambre" category, 4 to "studio", 1 to "appartement".
- The marketing pages keep reading `logements` unchanged — zero visual regression.
- Occupancy works at the unit level via `logement_units.id`.

### Option B — Expand `logements` directly
Add `unit_number` / `parent_id` columns to `logements` and insert 9 rows. Simpler table count, but it mixes "marketing template" and "physical inventory" concerns and would duplicate price/description/images per unit or require a self-join. **Not recommended.**

---

## 2. How reservations link to a specific accommodation

Add a nullable foreign key to `reservations`:

```text
reservations.logement_unit_id  uuid NULL  -> logement_units.id  (ON DELETE SET NULL)
```

- **Nullable** so all existing reservations remain valid (they predate units).
- `logement_type` (existing free-text) is **kept** for backward compatibility and historical records — not dropped.
- New bookings populate `logement_unit_id`; the calendar relies on this field.

---

## 3. Preserving existing data

Nothing is deleted or rewritten:
- `reservations`, `testimonials` (reviews), `messages`, `profiles` (users), `user_roles`, notifications data — all untouched.
- Only **additive** changes: 1 new table, 1 new nullable column, new rows.
- Existing 2 reservations keep `logement_type = "chambre"`, with `logement_unit_id = NULL` (or optionally back-filled — see risks).

---

## 4. Preserving RLS & authentication

- Auth system: **no change**.
- `logement_units` gets the **same RLS pattern as `logements`**:
  - `SELECT` for `anon` + `authenticated` (public can view units).
  - `ALL` for admins via `has_role(auth.uid(), 'admin')`.
  - Proper GRANTs (anon+authenticated SELECT, authenticated ALL, service_role ALL).
- `reservations` policies: **unchanged**. Adding a column does not alter existing policies. Anyone can still create a reservation; admins read/update/delete; users read their own.

---

## 5. How booking forms would change

Current form sends `logement_type` (a category word).

After migration:
- Replace the category dropdown with a **unit selector**, grouped by category:
  - "Chambres" → Chambre 1..4, "Studios" → Studio 1..4, "Appartement" → Appartement 1.
- On date selection, **filter out units already booked** for the chosen range (query overlapping reservations by `logement_unit_id`).
- Submit `logement_unit_id` (and still set `logement_type` from the unit's category for continuity).
- Logged-in pre-fill (name/phone/email) behavior stays the same.

No business-logic rewrite to messaging/reviews/notifications is required.

## 6. How the occupancy calendar would work after migration

- Source of truth: `reservations` rows where `status IN ('nouvelle','confirmée')` (configurable), joined to `logement_units`.
- A unit is **occupied** for `[arrival_date, departure_date)` (departure day = checkout, treated as free).
- Calendar grid: rows = 9 units, columns = dates; a cell is blocked if any reservation overlaps that date.
- Overlap rule: `arrival_date < range_end AND departure_date > range_start`.
- Admin view: see all units; public/booking view: see availability only.
- Reservations with `logement_unit_id = NULL` (legacy) can be shown in an "unassigned" lane so admins can assign them a unit.

## 7. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Legacy reservations have no unit → gaps in calendar | Keep `logement_unit_id` nullable; show an "Unassigned" lane; let admins assign units manually. |
| Double-booking during the transition | Add availability filtering in the form; optionally add a DB-level overlap guard (exclusion constraint or validation trigger) in a later step. |
| Dropping `logement_type` breaks history | Do **not** drop it; keep both fields. |
| Public pages break | They read `logements` (categories) — left unchanged. Units live in a separate table. |
| Wrong unit counts | Seed exactly 9 rows in a reviewable data step (insert tool), separate from schema migration. |
| RLS misconfig exposes data | Mirror existing `logements` policies + run the DB linter after applying. |

## 8. Step-by-step migration plan (for later execution)

1. **Schema migration** (migration tool): create `logement_units` (FK → `logements`), with GRANTs, RLS enabled, and SELECT(anon/auth)+ALL(admin) policies + `updated_at` trigger.
2. **Schema migration**: add `reservations.logement_unit_id uuid NULL` with FK `ON DELETE SET NULL`.
3. **Seed data** (insert tool, not migration): insert 9 units mapped to the 3 existing category rows (4 chambre, 4 studio, 1 appartement).
4. *(Optional)* **Back-fill**: assign the 2 existing "chambre" reservations to specific chambre units, or leave NULL for admin assignment.
5. **Code — admin**: add a units management UI (list/add/edit/availability) reusing the `logements` admin patterns.
6. **Code — booking form**: unit selector grouped by category + date-based availability filtering; submit `logement_unit_id`.
7. **Code — occupancy calendar**: build the unit × date grid using the overlap rule.
8. **Verify**: run DB linter, confirm existing reservations/reviews/messages intact, test booking + calendar end-to-end.

---

### Technical notes
- All schema changes are **additive and reversible** (drop new table/column to roll back).
- `logement_type` retained permanently for historical continuity.
- Seeding and back-fill use the data (insert) tool, kept separate from structural migrations for safer review.

**Nothing above has been executed.** On approval I'll start with Step 1 (the `logement_units` schema migration) for your review before it runs.
