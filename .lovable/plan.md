# Panorama P → Professional Hotel Management System

This upgrades the existing platform without breaking the current database structure, RLS, or production data. Every schema change is additive (new nullable columns / new enum values), and existing rows keep working through fallbacks.

The work is split into phases. Each phase is shippable and testable on its own.

---

## Phase 1 — Datetime foundation (DB, additive)

The booking-unit rule and the reservation forms need arrival/departure **times**, which today don't exist (only `arrival_date` / `departure_date` as `date`).

- Add nullable columns to `reservations`: `arrival_time` (text `HH:MM`, default `14:00`), `departure_time` (text `HH:MM`, default `11:00`), `channel` (text, default `website`).
- Keep existing date columns untouched. New logic reads `date + time`; old rows fall back to default check-in/checkout times from `residence_settings`.
- No destructive changes; all existing reservations remain valid.

```text
reservations  +arrival_time  +departure_time  +channel
```

## Phase 2 — Booking-unit billing engine (the keystone)

Replace the nights/24h rule everywhere with the new checkpoint rule, in `src/lib/operations.ts`:

- New `bookingUnits(arrivalISO, departureISO)`: 1 unit at check-in, +1 each time a **12:00 noon** checkpoint is crossed while still occupying.
  - 10 Jun 09:00 → 11 Jun 11:59 = 1
  - 10 Jun 09:00 → 11 Jun 12:01 = 2
  - 10 Jun 20:00 → 12 Jun 13:00 = 3
- `effectiveTotal` becomes `bookingUnits × unitPrice` (manual `total_amount` override still wins).
- Used consistently by reservations list, dashboard, payments/balance, invoices (`pdf-documents.ts`), and analytics.

## Phase 3 — Real-time consistency

Guarantee no stale data after any edit (dates, times, type, unit, guests, status, payment, amount):

- All mutations already run through server functions; standardize them to invalidate the full set of query keys (`op-dashboard`, `admin-reservations`, `admin-occupancy`, `op-clients`, `payments`, analytics, messages) via a shared `invalidateAll` helper after every write.
- Totals, balance, and `payment_status` recomputed server-side on every reservation/payment change so the DB is always the source of truth.

## Phase 4 — Reservation forms (website + admin)

- Add arrival **time** and departure **time** fields to the public form and the admin new/edit dialogs.
- Validation: arrival datetime not in the past; departure strictly after arrival; guest caps (Chambre 2 / Studio 2 / Appartement 4) with a red blocking error.
- Persist `arrival_time` / `departure_time` and set `channel`.

## Phase 5 — WhatsApp-first booking flow

- "Réserver via WhatsApp" opens `wa.me/237655862405` with an **editable, bilingual FR+EN** prefilled message containing greeting, full name, phone, email, arrival date+time, departure date+time, accommodation type, guests, and optional comments.
- Website submissions set `channel = website`; WhatsApp path tagged accordingly.

## Phase 6 — Customer + manager notifications

- Guest confirmation email already exists; make it strictly single-language (FR/EN/DE per selected language) — "request under review", no technical wording.
- Manager alert: email to `residencespanoramap@gmail.com` (already wired) upgraded to a professional ops-alert with client name, contact, type, arrival/departure datetime, guests, and channel.
- WhatsApp manager notification: provide a one-tap "Notifier sur WhatsApp" deep link to `+237 655 862 405` from the new-reservation success + admin (browser cannot auto-send WhatsApp without a provider; this is the no-secret approach). If you want fully automatic WhatsApp sending, that needs a paid WhatsApp API — I'll flag it as an optional add-on.

## Phase 7 — Admin roles (Owner / Manager / Technician)

- Map to existing roles: OWNER → `proprietaire`/`admin`, MANAGER → `gestionnaire`, TECHNICIAN → `menage`/`reception`.
- Show a role **badge** in the admin header.
- Gate actions by role (e.g. only Owner/Manager record payments or cancel; Technician limited to operational status). Enforced server-side, RLS as backstop.

## Phase 8 — Reservations module (active view)

- Default to **active** reservations (`now < departure datetime`), with a toggle for history.
- Columns: name, phone, email, unit, type, guests, arrival datetime, departure datetime, status, total, paid, balance, channel, actions.
- Status set (translated): Pending validation, Confirmed, Occupied, Completed, Cancelled.
- Actions: edit, confirm, check-in, check-out, cancel — all with auto-recalculation.

## Phase 9 — Operations dashboard home

- Cards: available Chambres (e.g. 3/4), available Studios, available Appartements, upcoming arrivals (<24h), pending reservations, unread messages — each clickable to its detail.
- Color logic: green available / orange partial / red full.

## Phase 10 — Business analytics

- Period selector: week / month / quarter / custom range.
- Revenue per accommodation type (bar chart, clickable), completed vs upcoming stays, expected vs collected vs projected revenue — all using the booking-unit engine.

## Phase 11 — Urgent actions

- Arrivals within 24h and departures within 24h, each with guest, accommodation, arrival/departure time, and an action button opening the reservation.

## Phase 12 — Strict multilingual (FR / EN / DE)

- Move every remaining hardcoded FR string (statuses, admin labels, validation, buttons, dashboards) into `translations.ts` with full EN + DE.
- Translate all reservation/payment statuses. No mixed-language output anywhere, including emails per selected language.

---

## Technical notes
- Schema changes are additive only (new nullable columns + new status values); current rows and RLS are preserved.
- Billing logic centralized in `operations.ts` so pricing, invoices, dashboard, and analytics stay in lockstep.
- Status vocabulary maps onto existing enums (`nouvelle`=Pending, `confirmée`=Confirmed, `checkin`=Occupied, `terminée`=Completed, `annulée`=Cancelled) to avoid breaking historical data.
- Fully automatic WhatsApp send (vs. one-tap deep link) requires a paid WhatsApp Business API key — optional, called out in Phase 6.

## Suggested execution order
I recommend shipping in this order: **1 → 2 → 3 → 4 → 8** (core booking integrity + forms + reservations), then **5 → 6 → 11 → 9 → 10**, and finishing with **7 → 12** (roles + full translation sweep). 

Tell me to proceed and I'll start with Phases 1–4 (datetime + billing engine + forms), or reprioritize if you want a different module first.