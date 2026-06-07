import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertStaff,
  assertAdminOrOwner,
  assertCanManageTeam,
  getUserRoles,
  actorName,
  logActivity,
} from "@/lib/staff-guard";
import {
  derivePaymentStatus,
  bookingUnitsFrom,
  computeUnitStatus,
  displayReservationStatus,
  MAX_GUESTS_BY_TYPE,
  shortRef,
  RES_STATUS_LABELS,
  PAY_METHOD_LABELS,
  DEFAULT_CHECKIN_TIME,
  DEFAULT_CHECKOUT_TIME,
} from "@/lib/operations";
import { formatDateFr, formatMoney } from "@/lib/format";

const UUID = z.string().uuid();
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const BLOCK_STATUS = "bloqué";

// ── Types used across handlers ───────────────────────────────────────────
interface UnitRow {
  id: string;
  label: string;
  sort_order: number;
  available: boolean;
  op_status: string;
  type: string;
  category_title: string;
  price: number;
}
interface ResRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  guests: number;
  arrival_date: string;
  departure_date: string;
  arrival_time: string | null;
  departure_time: string | null;
  channel: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  advance_amount: number;
  logement_unit_id: string | null;
  logement_type: string | null;
  notes: string | null;
  created_at?: string;
}

// Cameroun = UTC+1 (Africa/Douala) — toutes les comparaisons de dates utilisent cette référence
const CAMEROUN_OFFSET_MS = 1 * 60 * 60 * 1000; // UTC+1

function nowCameroun(): number {
  return Date.now() + CAMEROUN_OFFSET_MS - new Date().getTimezoneOffset() * 60_000;
}

function todayLocalIso(): string {
  const utc = Date.now() + CAMEROUN_OFFSET_MS;
  return new Date(utc).toISOString().slice(0, 10);
}

function dateTimeMs(date: string, time: string | null | undefined, fallback: string): number {
  const t = (time ?? fallback).slice(0, 5);
  // Parse as Cameroun local time (UTC+1)
  return new Date(`${date}T${t}:00+01:00`).getTime();
}

// ── Staff status (UI gate) ───────────────────────────────────────────────
export const staffGetStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const roles = await getUserRoles(supabase, userId);
    const staffRoles = [
      "admin",
      "proprietaire",
      "gestionnaire",
      "technicien",
      "reception",
      "menage",
      "comptable",
    ];
    const isStaff = roles.some((r) => staffRoles.includes(r));
    return {
      isStaff,
      isAdmin: roles.includes("admin") || roles.includes("proprietaire"),
      canManageTeam:
        roles.includes("admin") ||
        roles.includes("proprietaire"),
      roles,
    };
  });

// ── Shared loaders (inside handlers only) ────────────────────────────────
async function loadUnits(supabase: any): Promise<UnitRow[]> {
  const { data, error } = await supabase
    .from("logement_units")
    .select("id, label, sort_order, available, op_status, logements(type, title_fr, price)")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((u: any) => ({
    id: u.id,
    label: u.label,
    sort_order: u.sort_order,
    available: u.available,
    op_status: u.op_status ?? "actif",
    type: u.logements?.type ?? "",
    category_title: u.logements?.title_fr ?? "",
    price: Number(u.logements?.price ?? 0),
  }));
}

async function loadReservations(supabase: any): Promise<ResRow[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, name, phone, email, guests, arrival_date, departure_date, arrival_time, departure_time, channel, status, payment_status, total_amount, advance_amount, logement_unit_id, logement_type, notes, created_at",
    )
    .order("arrival_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ResRow[];
}

async function loadPaymentsMap(supabase: any): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("payments").select("reservation_id, amount");
  if (error) throw new Error(error.message);
  const m = new Map<string, number>();
  for (const p of data ?? []) {
    m.set(p.reservation_id, (m.get(p.reservation_id) ?? 0) + Number(p.amount));
  }
  return m;
}

function bookingUnitsOf(r: ResRow): number {
  return bookingUnitsFrom(
    r.arrival_date,
    r.arrival_time ?? DEFAULT_CHECKIN_TIME,
    r.departure_date,
    r.departure_time ?? DEFAULT_CHECKOUT_TIME,
  );
}

function effectiveTotal(r: ResRow, unitPrice: number): number {
  if (Number(r.total_amount) > 0) return Number(r.total_amount);
  return bookingUnitsOf(r) * unitPrice;
}

// ── Full reservations list (enriched) ────────────────────────────────────
export const opListReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const [units, reservations, paidMap] = await Promise.all([
      loadUnits(sb),
      loadReservations(sb),
      loadPaymentsMap(sb),
    ]);
    const unitById = new Map(units.map((u) => [u.id, u]));
    const priceByType = new Map<string, number>();
    for (const u of units) if (!priceByType.has(u.type)) priceByType.set(u.type, u.price);
    const priceOf = (r: ResRow) =>
      (r.logement_unit_id ? unitById.get(r.logement_unit_id)?.price : undefined) ??
      (r.logement_type ? priceByType.get(r.logement_type) : undefined) ??
      0;

    const nowMs = Date.now();
    const todayIso = todayLocalIso();

    // Build a map: type → first available unit id (for unassigned reservations)
    const firstUnitByType = new Map<string, string>();
    for (const u of units) {
      if (!firstUnitByType.has(u.type)) firstUnitByType.set(u.type, u.id);
    }

   return reservations
      .filter((r) => r.status !== BLOCK_STATUS)
      .map((r) => {
        const billableUnits = bookingUnitsOf(r);
        const unitPrice = priceOf(r);
        const autoTotal  = billableUnits * unitPrice;
        const rawTotal   = r.total_amount !== null && r.total_amount !== undefined ? Number(r.total_amount) : null;
        const rawAdvance = Number(r.advance_amount);
        
        // --- CORRECTION CHIRURGICALE : Priorité au montant réel de la base de données ---
        const total   = rawTotal !== null && Number.isFinite(rawTotal) ? rawTotal : autoTotal;
        const advance = Number.isFinite(rawAdvance) && rawAdvance >= 0 ? rawAdvance : 0;
        const paid = paidMap.get(r.id) ?? 0;
        const nowMs       = nowCameroun();
        const arrivalMs   = dateTimeMs(r.arrival_date,   r.arrival_time,   DEFAULT_CHECKIN_TIME);
        const departureMs = dateTimeMs(r.departure_date, r.departure_time, DEFAULT_CHECKOUT_TIME);
        
        // --- CORRECTION CHIRURGICALE : Priorité au vrai statut de la base de données ---
        const dbStatus    = r.status && r.status.trim() !== "" ? r.status : "nouvelle";
        
        // Auto-assign unit for calendar display if not assigned
        const effectiveUnitId = r.logement_unit_id ??
          (r.logement_type ? firstUnitByType.get(r.logement_type) ?? null : null);
        return {
          id: r.id,
          ref: shortRef(r.id),
          name: r.name,
          phone: r.phone,
          email: r.email,
          guests: r.guests,
          arrival_date: r.arrival_date,
          departure_date: r.departure_date,
          arrival_time: r.arrival_time ?? DEFAULT_CHECKIN_TIME,
          departure_time: r.departure_time ?? DEFAULT_CHECKOUT_TIME,
          channel: r.channel ?? "website",
          status: dbStatus,
          displayStatus: displayReservationStatus(dbStatus, arrivalMs, departureMs, nowMs),
          payment_status: r.payment_status,
          unitId: effectiveUnitId,
          unitLabel: effectiveUnitId ? unitById.get(effectiveUnitId)?.label ?? "—" : "—",
          logement_type: r.logement_type,
          units: billableUnits,
          unitPrice,
          total,
          advance,
          paid,
          balance: Math.max(0, total - advance),
          // Active = not cancelled AND departure date not yet passed
          active: r.status !== "annulée" && r.departure_date >= todayIso,
          notes: r.notes,
          message: r.notes,
          created_at: r.created_at ?? r.arrival_date,
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
// ── Occupancy calendar (read-only operational view) ──────────────────────
// Returns every physical unit plus all reservations (any status, incl.
// historical & cancelled) enriched with payment figures so the calendar can
// render occupancy blocks, conflict detection and a read-only detail panel
// without any further round-trips. Strictly read — no mutations here.
export const opGetCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const [units, reservations, paidMap] = await Promise.all([
      loadUnits(sb),
      loadReservations(sb),
      loadPaymentsMap(sb),
    ]);
    const unitById = new Map(units.map((u) => [u.id, u]));
    const priceByType = new Map<string, number>();
    for (const u of units) if (!priceByType.has(u.type)) priceByType.set(u.type, u.price);
    const firstUnitByType = new Map<string, string>();
    for (const u of units) if (!firstUnitByType.has(u.type)) firstUnitByType.set(u.type, u.id);
    const priceOf = (r: ResRow) =>
      (r.logement_unit_id ? unitById.get(r.logement_unit_id)?.price : undefined) ??
      (r.logement_type ? priceByType.get(r.logement_type) : undefined) ??
      0;

    const calUnits = units.map((u) => ({
      id: u.id,
      label: u.label,
      type: u.type,
      op_status: u.op_status,
      available: u.available,
    }));

    const calReservations = reservations.map((r) => {
      const rawTotal   = Number(r.total_amount);
      const rawAdvance = Number(r.advance_amount);
      const autoTotal  = effectiveTotal(r, priceOf(r));
      const total   = Number.isFinite(rawTotal)   && rawTotal   > 0 ? rawTotal   : autoTotal;
      const advance = Number.isFinite(rawAdvance) && rawAdvance >= 0 ? rawAdvance : 0;
      const paid = paidMap.get(r.id) ?? 0;
      // Auto-assign unit for calendar display if not assigned
      const effectiveUnitId = r.logement_unit_id ??
        (r.logement_type ? firstUnitByType.get(r.logement_type) ?? null : null);
      return {
        id: r.id,
        ref: shortRef(r.id),
        name: r.name,
        phone: r.phone,
        email: r.email,
        guests: r.guests,
        arrival_date: r.arrival_date,
        departure_date: r.departure_date,
        arrival_time: r.arrival_time ?? DEFAULT_CHECKIN_TIME,
        departure_time: r.departure_time ?? DEFAULT_CHECKOUT_TIME,
        status: r.status,
        payment_status: r.payment_status,
        channel: r.channel ?? "website",
        logement_unit_id: effectiveUnitId,
        unitLabel: effectiveUnitId ? unitById.get(effectiveUnitId)?.label ?? null : null,
        logement_type: r.logement_type,
        unitType: effectiveUnitId ? unitById.get(effectiveUnitId)?.type ?? null : null,
        notes: r.notes,
        total,
        paid,
        advance,
        balance: Math.max(0, total - advance),
      };
    });

    return { units: calUnits, reservations: calReservations };
  });




// ── Dashboard ────────────────────────────────────────────────────────────
export const opGetDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const today = todayLocalIso();

    const [units, reservations, paidMap, msgRes, payRows] = await Promise.all([
      loadUnits(sb),
      loadReservations(sb),
      loadPaymentsMap(sb),
      sb.from("messages").select("status"),
      sb.from("payments").select("amount, created_at"),
    ]);

    const unitById = new Map(units.map((u) => [u.id, u]));
    const priceByType = new Map<string, number>();
    for (const u of units) if (!priceByType.has(u.type)) priceByType.set(u.type, u.price);

    const priceOf = (r: ResRow) =>
      (r.logement_unit_id ? unitById.get(r.logement_unit_id)?.price : undefined) ??
      (r.logement_type ? priceByType.get(r.logement_type) : undefined) ??
      0;

    // group reservations by unit (active only, exclude cancelled/finished)
    const byUnit = new Map<string, ResRow[]>();
    for (const r of reservations) {
      if (!r.logement_unit_id) continue;
      const arr = byUnit.get(r.logement_unit_id) ?? [];
      arr.push(r);
      byUnit.set(r.logement_unit_id, arr);
    }

    // Unit state cards
    const unitCards = units.map((u) => {
      const bookings = (byUnit.get(u.id) ?? []).map((b) => ({
        arrival_date: b.arrival_date,
        departure_date: b.departure_date,
        status: b.status,
      }));
      const status = computeUnitStatus(u.op_status, bookings, today);
      // current or next guest
      const sorted = (byUnit.get(u.id) ?? [])
        .filter((b) => b.status !== "annulée" && b.status !== "terminée" && b.status !== BLOCK_STATUS)
        .sort((a, b) => a.arrival_date.localeCompare(b.arrival_date));
      const current = sorted.find((b) => b.arrival_date <= today && b.departure_date > today);
      const next = sorted.find((b) => b.arrival_date > today);
      const r = current ?? next;
      return {
        id: u.id,
        label: u.label,
        type: u.type,
        opStatus: u.op_status,
        available: u.available,
        status,
        guestName: r?.name ?? null,
        guestPhase: current ? "actuel" : next ? "prochain" : null,
        period: r ? `${formatDateFr(r.arrival_date)} → ${formatDateFr(r.departure_date)}` : null,
        paymentStatus: r?.payment_status ?? null,
        reservationId: r?.id ?? null,
      };
    });

    // Occupancy today
    const occupiedToday = unitCards.filter((c) => c.status === "occupee" || c.status === "depart").length;
    const totalUnits = units.length;
    const availableNow = unitCards.filter((c) => c.status === "libre" || c.status === "arrivee").length;

    // Arrivals / departures today
    const fmtRes = (r: ResRow) => {
      const total = effectiveTotal(r, priceOf(r));
      const paid = paidMap.get(r.id) ?? 0;
      return {
        id: r.id,
        ref: shortRef(r.id),
        name: r.name,
        phone: r.phone,
        guests: r.guests,
        status: r.status,
        paymentStatus: r.payment_status,
        unitLabel: r.logement_unit_id ? unitById.get(r.logement_unit_id)?.label ?? "—" : "—",
        unitId: r.logement_unit_id,
        type: r.logement_type,
        arrival: r.arrival_date,
        departure: r.departure_date,
        arrivalTime: r.arrival_time ?? DEFAULT_CHECKIN_TIME,
        departureTime: r.departure_time ?? DEFAULT_CHECKOUT_TIME,
        units: bookingUnitsOf(r),
        balance: Math.max(0, total - paid),
        total,
        paid,
      };
    };

    const arrivals = reservations
      .filter((r) => r.arrival_date === today && r.status !== "annulée" && r.status !== BLOCK_STATUS && r.status !== "terminée")
      .map(fmtRes);
    const departures = reservations
      .filter((r) => r.departure_date === today && r.status !== "annulée" && r.status !== BLOCK_STATUS)
      .map(fmtRes);

    // KPIs
    const pendingRequests = reservations.filter((r) => r.status === "nouvelle").length;
    const newMessages = (msgRes.data ?? []).filter((m: any) => m.status !== "répondu" && m.status !== "traité").length;
    const paymentsToVerify = reservations.filter((r) => {
      if (!["confirmée", "checkin"].includes(r.status)) return false;
      const total = effectiveTotal(r, priceOf(r));
      const paid = paidMap.get(r.id) ?? 0;
      return paid < total;
    }).length;

    const monthPrefix = today.slice(0, 7);
    const monthRevenue = (payRows.data ?? [])
      .filter((p: any) => (p.created_at ?? "").slice(0, 7) === monthPrefix)
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Urgent actions
    type Urgent = {
      id: string;
      level: "haute" | "moyenne" | "basse";
      label: string;
      action: "checkin" | "checkout" | "payment" | "confirm" | "unit" | "view";
      reservationId?: string;
      unitId?: string;
    };
    const urgent: Urgent[] = [];

    // Conflicts: >1 active booking overlapping on a unit
    for (const u of units) {
      const active = (byUnit.get(u.id) ?? []).filter(
        (b) => ["confirmée", "checkin"].includes(b.status),
      );
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const a = active[i];
          const b = active[j];
          if (a.arrival_date < b.departure_date && b.arrival_date < a.departure_date) {
            urgent.push({
              id: `conflit-${u.id}-${a.id}-${b.id}`,
              level: "haute",
              label: `Conflit de réservation sur ${u.label} : ${a.name} et ${b.name}`,
              action: "view",
              unitId: u.id,
              reservationId: a.id,
            });
          }
        }
      }
    }

    for (const a of arrivals) {
      if (a.paid < a.total) {
        urgent.push({
          id: `arr-${a.id}`,
          level: "haute",
          label: `Arrivée aujourd'hui sans paiement vérifié : ${a.name} (${a.unitLabel})`,
          action: "payment",
          reservationId: a.id,
        });
      }
    }
    for (const dp of departures) {
      if (dp.balance > 0) {
        urgent.push({
          id: `dep-${dp.id}`,
          level: "haute",
          label: `Départ aujourd'hui avec solde restant : ${dp.name} — ${formatMoney(dp.balance)}`,
          action: "payment",
          reservationId: dp.id,
        });
      }
    }
    for (const r of reservations.filter((r) => r.status === "nouvelle")) {
      urgent.push({
        id: `dem-${r.id}`,
        level: "moyenne",
        label: `Nouvelle demande de réservation : ${r.name}`,
        action: "confirm",
        reservationId: r.id,
      });
    }
    for (const u of units.filter((u) => u.op_status === "maintenance")) {
      urgent.push({
        id: `mnt-${u.id}`,
        level: "basse",
        label: `Unité en maintenance : ${u.label}`,
        action: "unit",
        unitId: u.id,
      });
    }

    // Per-type availability (Chambre / Studio / Appartement)
    const typeAvailability = (["chambre", "studio", "appartement"] as const).map((type) => {
      const cards = unitCards.filter((c) => c.type === type);
      const available = cards.filter((c) => c.status === "libre" || c.status === "arrivee").length;
      const total = cards.length;
      const ratio = total === 0 ? 0 : available / total;
      const level = available === 0 ? "full" : ratio >= 1 ? "free" : "partial";
      return { type, available, total, level };
    });

    // Upcoming windows (next 24h) by datetime
    const nowMs = Date.now();
    const in24h = nowMs + 24 * 60 * 60 * 1000;
    const toMs = (d: string, t: string | null | undefined, fallback: string) =>
      new Date(`${d}T${(t ?? fallback).slice(0, 5)}:00`).getTime();
    const upcomingArrivals = reservations
      .filter((r) => {
        if (r.status === "annulée" || r.status === BLOCK_STATUS || r.status === "terminée") return false;
        const ms = toMs(r.arrival_date, r.arrival_time, DEFAULT_CHECKIN_TIME);
        return ms >= nowMs && ms <= in24h;
      })
      .map(fmtRes);
    const upcomingDepartures = reservations
      .filter((r) => {
        if (r.status === "annulée" || r.status === BLOCK_STATUS) return false;
        const ms = toMs(r.departure_date, r.departure_time, DEFAULT_CHECKOUT_TIME);
        return ms >= nowMs && ms <= in24h;
      })
      .map(fmtRes);

    return {
      today,
      kpis: {
        occupancyRate: totalUnits > 0 ? Math.round((occupiedToday / totalUnits) * 100) : 0,
        availableUnits: availableNow,
        totalUnits,
        arrivals: arrivals.length,
        departures: departures.length,
        upcomingArrivals: upcomingArrivals.length,
        pendingRequests,
        paymentsToVerify,
        newMessages,
        monthRevenue,
      },
      typeAvailability,
      urgent,
      arrivals,
      departures,
      upcomingArrivals,
      upcomingDepartures,
      units: unitCards,
    };
  });

// ── Reservation status transitions ───────────────────────────────────────
export const opSetReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: UUID,
        status: z.enum(["nouvelle", "confirmée", "annulée"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;

    const { data: row, error: e0 } = await sb
      .from("reservations")
      .select("status, name, logement_unit_id, arrival_date, departure_date, departure_time")
      .eq("id", data.id)
      .single();
    if (e0) throw new Error(e0.message);

    // Check if departure has passed → reservation is "logé" → LOCKED
    const departureMs = dateTimeMs(row.departure_date, row.departure_time, DEFAULT_CHECKOUT_TIME);
    const nowMs = nowCameroun();

    if (row.status === "confirmée" && nowMs >= departureMs) {
      throw new Error("Cette réservation est verrouillée (client logé) — aucune modification possible.");
    }
    if (row.status === "annulée") {
      throw new Error("Cette réservation est annulée — aucune modification possible.");
    }

    // Cancellation only allowed before departure
    if (data.status === "annulée" && nowMs > departureMs) {
      throw new Error("Impossible d'annuler : la date de départ est déjà dépassée.");
    }

    // Conflict check when confirming with a physical unit assigned
    if (data.status === "confirmée" && row.logement_unit_id) {
      await ensureNoConflict(sb, row.logement_unit_id, row.arrival_date, row.departure_date, data.id);
    }

    const patch: Record<string, unknown> = { status: data.status };

    // Quand annulée → montants à 0
    if (data.status === "annulée") {
      patch.total_amount   = 0;
      patch.advance_amount = 0;
    }

    const { error } = await sb
      .from("reservations")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const name = await actorName(sb, context.userId);
    await logActivity(sb, {
      userId: context.userId,
      userName: name,
      action: "statut_reservation",
      objectType: "reservation",
      objectId: data.id,
      summary: `${row.name} → ${RES_STATUS_LABELS[data.status]}`,
    });
    return { ok: true };
  });

async function ensureNoConflict(
  sb: any,
  unitId: string,
  arrival: string,
  departure: string,
  excludeId: string,
): Promise<void> {
  const { data, error } = await sb
    .from("reservations")
    .select("id, arrival_date, departure_date, status")
    .eq("logement_unit_id", unitId)
    .in("status", ["confirmée", "checkin", "bloqué"])
    .neq("id", excludeId);
  if (error) throw new Error(error.message);
  for (const r of data ?? []) {
    if (arrival < r.departure_date && r.arrival_date < departure) {
      throw new Error("Conflit : cette unité est déjà réservée sur cette période.");
    }
  }
}

export const opCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: UUID }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: row, error } = await sb
      .from("reservations")
      .select("status, name")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (!["confirmée"].includes(row.status))
      throw new Error("Le check-in n'est possible que pour une réservation confirmée.");
    const { error: e2 } = await sb
      .from("reservations")
      .update({ status: "checkin", checkin_at: new Date().toISOString() })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);
    const name = await actorName(sb, context.userId);
    await logActivity(sb, {
      userId: context.userId,
      userName: name,
      action: "checkin",
      objectType: "reservation",
      objectId: data.id,
      summary: `Check-in : ${row.name}`,
    });
    return { ok: true };
  });

export const opCheckOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: UUID }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: row, error } = await sb
      .from("reservations")
      .select("status, name, logement_unit_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (!["checkin", "confirmée"].includes(row.status))
      throw new Error("Le check-out n'est possible que pour un client présent.");
    const { error: e2 } = await sb
      .from("reservations")
      .update({ status: "terminée", checkout_at: new Date().toISOString() })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);
    // Mark unit for cleaning after checkout.
    if (row.logement_unit_id) {
      await sb.from("logement_units").update({ op_status: "nettoyage" }).eq("id", row.logement_unit_id);
    }
    const name = await actorName(sb, context.userId);
    await logActivity(sb, {
      userId: context.userId,
      userName: name,
      action: "checkout",
      objectType: "reservation",
      objectId: data.id,
      summary: `Check-out : ${row.name}`,
    });
    return { ok: true };
  });

// ── Unit operational status ──────────────────────────────────────────────
export const opSetUnitOpStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        unitId: UUID,
        opStatus: z.enum(["actif", "nettoyage", "maintenance", "bloquee"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const { error } = await sb
      .from("logement_units")
      .update({ op_status: data.opStatus })
      .eq("id", data.unitId);
    if (error) throw new Error(error.message);
    const name = await actorName(sb, context.userId);
    await logActivity(sb, {
      userId: context.userId,
      userName: name,
      action: "statut_unite",
      objectType: "unit",
      objectId: data.unitId,
      summary: `Unité → ${data.opStatus}`,
    });
    return { ok: true };
  });

// ── Payments ─────────────────────────────────────────────────────────────
async function recomputePaymentStatus(sb: any, reservationId: string): Promise<{ total: number; paid: number; balance: number; status: string }> {
  const { data: r, error } = await sb
    .from("reservations")
    .select("total_amount, arrival_date, departure_date, arrival_time, departure_time, logement_unit_id, logement_type")
    .eq("id", reservationId)
    .single();
  if (error) throw new Error(error.message);

  let price = 0;
  if (r.logement_unit_id) {
    const { data: u } = await sb
      .from("logement_units")
      .select("logements(price)")
      .eq("id", r.logement_unit_id)
      .maybeSingle();
    price = Number((u as any)?.logements?.price ?? 0);
  } else if (r.logement_type) {
    const { data: l } = await sb
      .from("logements")
      .select("price")
      .eq("type", r.logement_type)
      .limit(1)
      .maybeSingle();
    price = Number((l as any)?.price ?? 0);
  }
  const units = bookingUnitsFrom(
    r.arrival_date,
    r.arrival_time ?? DEFAULT_CHECKIN_TIME,
    r.departure_date,
    r.departure_time ?? DEFAULT_CHECKOUT_TIME,
  );
  const total = Number(r.total_amount) > 0 ? Number(r.total_amount) : units * price;

  const { data: pays } = await sb.from("payments").select("amount").eq("reservation_id", reservationId);
  const paid = (pays ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const status = derivePaymentStatus(total, paid);
  await sb.from("reservations").update({ payment_status: status }).eq("id", reservationId);
  return { total, paid, balance: Math.max(0, total - paid), status };
}

export const opAddPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reservationId: UUID,
        amount: z.number().positive().max(100_000_000),
        method: z.enum(["especes", "mobile_money", "virement", "carte_externe"]),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const name = await actorName(sb, context.userId);

    const { error } = await sb.from("payments").insert({
      reservation_id: data.reservationId,
      amount: data.amount,
      method: data.method,
      recorded_by: context.userId,
      recorded_by_name: name,
      note: data.note?.trim() || null,
    });
    if (error) throw new Error(error.message);

    const totals = await recomputePaymentStatus(sb, data.reservationId);

    // Notify the client (best-effort).
    const { data: r } = await sb
      .from("reservations")
      .select("name, email")
      .eq("id", data.reservationId)
      .single();
    if (r?.email) {
      try {
        const { enqueueAppEmail } = await import("@/lib/email/enqueue.server");
        await enqueueAppEmail({
          templateName: "payment-receipt",
          recipientEmail: r.email,
          idempotencyKey: `payment-${data.reservationId}-${Date.now()}`,
          templateData: {
            name: r.name || "cher client",
            amount: formatMoney(data.amount),
            date: formatDateFr(new Date()),
            reference: shortRef(data.reservationId),
            method: PAY_METHOD_LABELS[data.method],
            balance: formatMoney(totals.balance),
          },
        });
      } catch (e) {
        console.error("payment receipt email failed", e);
      }
    }

    await logActivity(sb, {
      userId: context.userId,
      userName: name,
      action: "paiement_ajoute",
      objectType: "reservation",
      objectId: data.reservationId,
      summary: `Paiement ${formatMoney(data.amount)} (${PAY_METHOD_LABELS[data.method]}) — ${r?.name ?? ""}`,
    });

    return { ok: true, ...totals };
  });

export const opListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const { data, error } = await sb
      .from("payments")
      .select("id, reservation_id, amount, method, recorded_by_name, note, created_at, reservations(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: any) => ({
      id: p.id,
      reservationId: p.reservation_id,
      ref: shortRef(p.reservation_id),
      amount: Number(p.amount),
      method: p.method,
      recordedBy: p.recorded_by_name ?? "—",
      note: p.note,
      createdAt: p.created_at,
      clientName: p.reservations?.name ?? "—",
    }));
  });

export const opSetReservationTotal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: UUID, totalAmount: z.number().min(0).max(100_000_000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const { error } = await sb
      .from("reservations")
      .update({ total_amount: data.totalAmount })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await recomputePaymentStatus(sb, data.id);
    return { ok: true };
  });

export const opSetPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: UUID,
        paymentStatus: z.enum(["non_paye", "acompte", "partiel", "paye", "solde_du"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("reservations")
      .update({ payment_status: data.paymentStatus })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Reservation detail ───────────────────────────────────────────────────
export const opGetReservationDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: UUID }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: r, error } = await sb
      .from("reservations")
      .select("*, logement_units(label), payments(id, amount, method, recorded_by_name, note, created_at)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const totals = await recomputePaymentStatus(sb, data.id);
    const allUnits = await loadUnits(sb);
    return {
      reservation: {
        id: r.id,
        ref: shortRef(r.id),
        name: r.name,
        phone: r.phone,
        email: r.email,
        guests: r.guests,
        arrival_date: r.arrival_date,
        departure_date: r.departure_date,
        arrival_time: r.arrival_time ?? DEFAULT_CHECKIN_TIME,
        departure_time: r.departure_time ?? DEFAULT_CHECKOUT_TIME,
        channel: r.channel ?? "website",
        units: bookingUnitsFrom(
          r.arrival_date,
          r.arrival_time ?? DEFAULT_CHECKIN_TIME,
          r.departure_date,
          r.departure_time ?? DEFAULT_CHECKOUT_TIME,
        ),
        status: r.status,
        payment_status: r.payment_status,
        total_amount: Number(r.total_amount),
        notes: r.notes,
        unitLabel: (r as any).logement_units?.label ?? null,
        unitId: r.logement_unit_id,
        logement_type: r.logement_type,
      },
      payments: ((r as any).payments ?? [])
        .map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          recordedBy: p.recorded_by_name ?? "—",
          note: p.note,
          createdAt: p.created_at,
        }))
        .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)),
      units: allUnits.map((u) => ({ id: u.id, label: u.label, type: u.type })),
      totals,
    };
  });

// ── Manager-created reservation (mirrors the public site form) ────────────
const LOGEMENT_TYPE = z.enum(["chambre", "studio", "appartement"]);

const reservationFormBase = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  logementType: LOGEMENT_TYPE,
  arrival: DATE,
  departure: DATE,
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  channel: z.enum(["website", "whatsapp", "phone", "walkin"]).default("walkin"),
  guests: z.number().int().min(1).max(20),
  advance: z.number().min(0).max(100_000_000).default(0),
  // Optional custom total set by gestionnaire (price negotiation)
  totalAmount: z.number().min(0).max(100_000_000).optional(),
  notes: z.string().max(1000).optional(),
});

const departureAfterArrival = (v: {
  arrival: string;
  departure: string;
  arrivalTime?: string;
  departureTime?: string;
}) => {
  const arrMs = new Date(`${v.arrival}T${(v.arrivalTime ?? DEFAULT_CHECKIN_TIME).slice(0,5)}:00`).getTime();
  const depMs = new Date(`${v.departure}T${(v.departureTime ?? DEFAULT_CHECKOUT_TIME).slice(0,5)}:00`).getTime();
  return depMs > arrMs;
};

const guestsWithinCapacity = (v: { logementType: string; guests: number }) =>
  v.guests >= 1 && v.guests <= (MAX_GUESTS_BY_TYPE[v.logementType] ?? 20);

const amountsValid = (v: { advance?: number; totalAmount?: number }) => {
  if ((v.advance ?? 0) < 0) return false;
  if ((v.totalAmount ?? 0) < 0) return false;
  return true;
};

const reservationFormSchema = reservationFormBase
  .refine(departureAfterArrival, {
    message: "La date/heure de départ doit suivre l'arrivée.",
  })
  .refine(guestsWithinCapacity, {
    message: "Le nombre de personnes dépasse la capacité maximale de ce logement.",
  })
  .refine(amountsValid, {
    message: "Les montants ne peuvent pas être négatifs.",
  });

const reservationUpdateSchema = reservationFormBase
  .extend({ id: UUID })
  .refine(departureAfterArrival, {
    message: "La date/heure de départ doit suivre l'arrivée.",
  })
  .refine(guestsWithinCapacity, {
    message: "Le nombre de personnes dépasse la capacité maximale de ce logement.",
  })
  .refine(amountsValid, {
    message: "Les montants ne peuvent pas être négatifs.",
  });

/**
 * Pick the first available unit of a given accommodation type that has no
 * booking conflict over the requested period. Returns null if none is free.
 */
async function pickFreeUnit(
  sb: any,
  logementType: string,
  arrival: string,
  departure: string,
  excludeId = "00000000-0000-0000-0000-000000000000",
): Promise<string | null> {
  const units = await loadUnits(sb);
  const candidates = units
    .filter(
      (u) =>
        u.type === logementType &&
        u.available &&
        (u.op_status === "actif" || !u.op_status),
    )
    .sort((a, b) => a.sort_order - b.sort_order);
  if (candidates.length === 0) return null;

  const { data: active } = await sb
    .from("reservations")
    .select("logement_unit_id, arrival_date, departure_date")
    .in("status", ["nouvelle", "confirmée", "checkin", "bloqué"])
    .neq("id", excludeId);

  const overlaps = (unitId: string) =>
    (active ?? []).some(
      (r: any) =>
        r.logement_unit_id === unitId &&
        arrival < r.departure_date &&
        r.arrival_date < departure,
    );

  for (const u of candidates) {
    if (!overlaps(u.id)) return u.id;
  }
  return null;
}

export const opCreateReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reservationFormSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;

    // Auto-assign a free unit of the chosen type so the booking is visible on
    // the occupancy calendar (which is organised by unit).
    const unitId = await pickFreeUnit(
      sb,
      data.logementType,
      data.arrival,
      data.departure,
    );

    const { data: inserted, error } = await sb
      .from("reservations")
      .insert({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        logement_unit_id: unitId,
        logement_type: data.logementType,
        arrival_date: data.arrival,
        departure_date: data.departure,
        arrival_time: data.arrivalTime ?? DEFAULT_CHECKIN_TIME,
        departure_time: data.departureTime ?? DEFAULT_CHECKOUT_TIME,
        channel: data.channel,
        guests: data.guests,
        status: "nouvelle",
        advance_amount: data.advance,
        total_amount: data.totalAmount ?? 0,
        notes: data.notes?.trim() || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const name = await actorName(sb, context.userId);
    await logActivity(sb, {
      userId: context.userId,
      userName: name,
      action: "reservation_creee",
      objectType: "reservation",
      objectId: inserted.id,
      summary: `Réservation créée : ${data.name} (${data.logementType})`,
    });
    return { ok: true, id: inserted.id };
  });

// ── Manager edit of an existing reservation ──────────────────────────────
export const opUpdateReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reservationUpdateSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;

    // Keep the unit assignment coherent with the (possibly changed) type so the
    // booking stays visible on the occupancy calendar.
    const { data: existing } = await sb
      .from("reservations")
      .select("logement_unit_id, logement_type")
      .eq("id", data.id)
      .single();

    const unitRow = existing?.logement_unit_id
      ? (await loadUnits(sb)).find((u) => u.id === existing.logement_unit_id)
      : undefined;
    const needsUnit =
      !existing?.logement_unit_id ||
      (unitRow && unitRow.type !== data.logementType);

    const newUnitId = needsUnit
      ? await pickFreeUnit(sb, data.logementType, data.arrival, data.departure, data.id)
      : existing?.logement_unit_id ?? null;

    const { error } = await sb
      .from("reservations")
      .update({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        logement_type: data.logementType,
        logement_unit_id: newUnitId,
        arrival_date: data.arrival,
        departure_date: data.departure,
        arrival_time: data.arrivalTime ?? DEFAULT_CHECKIN_TIME,
        departure_time: data.departureTime ?? DEFAULT_CHECKOUT_TIME,
        channel: data.channel,
        guests: data.guests,
        advance_amount: data.advance,
        total_amount: data.totalAmount ?? 0,
        notes: data.notes?.trim() || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const name = await actorName(sb, context.userId);
    await logActivity(sb, {
      userId: context.userId,
      userName: name,
      action: "reservation_modifiee",
      objectType: "reservation",
      objectId: data.id,
      summary: `Réservation modifiée : ${data.name}`,
    });
    return { ok: true, id: data.id };
  });


export const opAssignUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reservationId: UUID, unitId: UUID.nullable() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    if (data.unitId) {
      const { data: r } = await sb
        .from("reservations")
        .select("arrival_date, departure_date")
        .eq("id", data.reservationId)
        .single();
      if (r) await ensureNoConflict(sb, data.unitId, r.arrival_date, r.departure_date, data.reservationId);
    }
    const { error } = await sb
      .from("reservations")
      .update({ logement_unit_id: data.unitId })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Clients (merge duplicates) ───────────────────────────────────────────
export const opListClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const [resv, paidMap] = await Promise.all([loadReservations(sb), loadPaymentsMap(sb)]);

    const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
    const nowMs = Date.now();

    const clients = new Map<
      string,
      {
        key: string;
        name: string;
        phone: string;
        email: string | null;
        reservations: number;
        lastStay: string | null;
        totalSpent: number;
      }
    >();

    for (const r of resv) {
      if (r.status === BLOCK_STATUS || r.status === "annulée") continue;
      const name = (r.name ?? "").trim();
      if (!name) continue;

      // Un client est "ayant séjourné" si son statut est confirmée
      // ET sa date/heure de départ est dépassée (= logé)
      const depMs = new Date(
        `${r.departure_date}T${(r.departure_time ?? DEFAULT_CHECKOUT_TIME).slice(0, 5)}:00`
      ).getTime();
      const isLoge = r.status === "confirmée" && depMs <= nowMs;
      // Aussi accepter les anciens statuts legacy (checkin, terminée)
      const isLegacy = r.status === "checkin" || r.status === "terminée";
      if (!isLoge && !isLegacy) continue;

      const key = norm(r.email) || norm(r.phone) || norm(name);
      const paid = paidMap.get(r.id) ?? 0;
      const existing = clients.get(key);
      if (existing) {
        existing.reservations += 1;
        existing.totalSpent += paid;
        if (!existing.lastStay || r.departure_date > existing.lastStay)
          existing.lastStay = r.departure_date;
        if (!existing.email && r.email) existing.email = r.email;
      } else {
        clients.set(key, {
          key,
          name,
          phone: r.phone,
          email: r.email,
          reservations: 1,
          lastStay: r.departure_date,
          totalSpent: paid,
        });
      }
    }
    return Array.from(clients.values()).sort((a, b) =>
      (b.lastStay ?? "").localeCompare(a.lastStay ?? "")
    );
  });

export const opGetClientDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ key: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
    const [resv, paidMap] = await Promise.all([loadReservations(sb), loadPaymentsMap(sb)]);

    const matches = resv.filter((r) => {
      if (r.status === BLOCK_STATUS) return false;
      const key = norm(r.email) || norm(r.phone) || norm(r.name);
      return key === data.key;
    });
    const ids = matches.map((m) => m.id);

    const [{ data: pays }, { data: msgs }] = await Promise.all([
      ids.length
        ? sb.from("payments").select("id, reservation_id, amount, method, created_at").in("reservation_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      sb.from("messages").select("id, name, phone, email, message, status, created_at").order("created_at", { ascending: false }),
    ]);

    const first = matches[0];
    const phone = norm(first?.phone);
    const email = norm(first?.email);
    const clientMsgs = (msgs ?? []).filter(
      (m: any) => (email && norm(m.email) === email) || (phone && norm(m.phone) === phone),
    );

    return {
      profile: {
        name: first?.name ?? "—",
        phone: first?.phone ?? "—",
        email: first?.email ?? null,
      },
      reservations: matches
        .map((r) => ({
          id: r.id,
          ref: shortRef(r.id),
          arrival: r.arrival_date,
          departure: r.departure_date,
          status: r.status,
          paymentStatus: r.payment_status,
          guests: r.guests,
        }))
        .sort((a, b) => b.arrival.localeCompare(a.arrival)),
      payments: (pays ?? [])
        .map((p: any) => ({ id: p.id, amount: Number(p.amount), method: p.method, createdAt: p.created_at }))
        .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)),
      messages: clientMsgs.map((m: any) => ({ id: m.id, status: m.status, createdAt: m.created_at })),
      totalSpent: matches.reduce((s, r) => s + (paidMap.get(r.id) ?? 0), 0),
    };
  });

// ── Team & activity ──────────────────────────────────────────────────────
export const opListTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (error) throw new Error(error.message);

    const byUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as string);
      byUser.set(r.user_id, arr);
    }

    const authMap = new Map<string, { email: string | null; lastSignIn: string | null }>();
    for (let page = 1; ; page++) {
      const { data: list, error: e } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (e) throw new Error(e.message);
      for (const u of list.users) authMap.set(u.id, { email: u.email ?? null, lastSignIn: u.last_sign_in_at ?? null });
      if (list.users.length < 1000) break;
    }

    const ids = Array.from(byUser.keys());
    const nameMap = new Map<string, string | null>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids);
      for (const p of profs ?? []) nameMap.set(p.id, p.full_name as string | null);
    }

    return ids.map((id) => ({
      id,
      name: nameMap.get(id) ?? null,
      email: authMap.get(id)?.email ?? null,
      lastSignIn: authMap.get(id)?.lastSignIn ?? null,
      roles: byUser.get(id) ?? [],
    }));
  });

export const opSetTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      // Accept email, phone, or name — we'll try to match
      identifier: z.string().trim().min(1).max(160),
      role: z.enum(["proprietaire", "gestionnaire"]),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertCanManageTeam(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve user by email, phone or display name
    let targetId: string | null = null;
    let targetEmail: string | null = null;
    const id = data.identifier.toLowerCase().trim();

    for (let page = 1; ; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const found = list.users.find((u) =>
        (u.email ?? "").toLowerCase() === id ||
        (u.phone ?? "").replace(/\D/g, "") === id.replace(/\D/g, "") ||
        (u.user_metadata?.full_name ?? "").toLowerCase() === id ||
        (u.user_metadata?.name ?? "").toLowerCase() === id,
      );
      if (found) { targetId = found.id; targetEmail = found.email ?? null; break; }
      if (list.users.length < 1000) break;
    }
    if (!targetId) throw new Error("Aucun compte ne correspond. Le membre doit d'abord créer un compte sur le site.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: targetId, role: data.role as any }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw new Error(error.message);

    const name = await actorName(context.supabase, context.userId);
    await logActivity(context.supabase, {
      userId: context.userId, userName: name,
      action: "role_attribue", objectType: "team", objectId: targetId,
      summary: `${targetEmail ?? data.identifier} → ${data.role}`,
    });
    return { ok: true, targetEmail };
  });

// Replace gestionnaire: remove all existing gestionnaire roles then assign new one
export const opReplaceManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ identifier: z.string().trim().min(1).max(160) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertCanManageTeam(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve new manager
    let targetId: string | null = null;
    let targetEmail: string | null = null;
    const id = data.identifier.toLowerCase().trim();
    for (let page = 1; ; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const found = list.users.find((u) =>
        (u.email ?? "").toLowerCase() === id ||
        (u.phone ?? "").replace(/\D/g, "") === id.replace(/\D/g, "") ||
        (u.user_metadata?.full_name ?? "").toLowerCase() === id ||
        (u.user_metadata?.name ?? "").toLowerCase() === id,
      );
      if (found) { targetId = found.id; targetEmail = found.email ?? null; break; }
      if (list.users.length < 1000) break;
    }
    if (!targetId) throw new Error("Aucun compte ne correspond. Le membre doit d'abord créer un compte.");

    // Remove all existing gestionnaire roles
    await supabaseAdmin.from("user_roles").delete().eq("role", "gestionnaire");

    // Assign new gestionnaire
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: targetId, role: "gestionnaire" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw new Error(error.message);

    const name = await actorName(context.supabase, context.userId);
    await logActivity(context.supabase, {
      userId: context.userId, userName: name,
      action: "role_attribue", objectType: "team", objectId: targetId,
      summary: `Nouveau gestionnaire : ${targetEmail ?? data.identifier}`,
    });
    return { ok: true, targetEmail };
  });

export const opRemoveTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: UUID, role: z.string().min(1).max(40) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertCanManageTeam(context.supabase, context.userId);
    if (data.role === "admin") throw new Error("Le rôle administrateur ne peut pas être retiré ici.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const opListActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("activity_log")
      .select("id, user_name, action, object_type, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ── Settings ─────────────────────────────────────────────────────────────
export const opGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("residence_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const opUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(160),
        logo_url: z.string().trim().max(500).optional().or(z.literal("")),
        currency: z.string().trim().min(1).max(20),
        checkin_time: z.string().trim().max(10),
        checkout_time: z.string().trim().max(10),
        deposit_percent: z.number().int().min(0).max(100),
        cancellation_policy: z.string().max(2000).optional().or(z.literal("")),
        taxes: z.string().max(500).optional().or(z.literal("")),
        email_notifications: z.boolean(),
        language: z.enum(["fr", "en", "de"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdminOrOwner(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("residence_settings")
      .update({
        name: data.name,
        logo_url: data.logo_url || null,
        currency: data.currency,
        checkin_time: data.checkin_time,
        checkout_time: data.checkout_time,
        deposit_percent: data.deposit_percent,
        cancellation_policy: data.cancellation_policy || null,
        taxes: data.taxes || null,
        email_notifications: data.email_notifications,
        language: data.language,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Business analytics ────────────────────────────────────────────────────
export const opGetAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ start: DATE, end: DATE }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const [units, reservations, payRows] = await Promise.all([
      loadUnits(sb),
      loadReservations(sb),
      sb.from("payments").select("amount, created_at, reservation_id"),
    ]);

    const unitById = new Map(units.map((u) => [u.id, u]));
    const priceByType = new Map<string, number>();
    for (const u of units) if (!priceByType.has(u.type)) priceByType.set(u.type, u.price);
    const priceOf = (r: ResRow) =>
      (r.logement_unit_id ? unitById.get(r.logement_unit_id)?.price : undefined) ??
      (r.logement_type ? priceByType.get(r.logement_type) : undefined) ??
      0;

    const inRange = (d: string) => d >= data.start && d <= data.end;
    const todayIso = todayLocalIso();

    // Reservations whose arrival falls in the selected period (exclude cancelled/blocks).
    const periodRes = reservations.filter(
      (r) => r.status !== BLOCK_STATUS && r.status !== "annulée" && inRange(r.arrival_date),
    );

    const TYPES = ["chambre", "studio", "appartement"] as const;
    const typeLabels: Record<string, string> = {
      chambre: "Chambre",
      studio: "Studio",
      appartement: "Appartement",
    };
    const revenueByType = TYPES.map((type) => {
      const rows = periodRes.filter((r) => r.logement_type === type);
      const expected = rows.reduce((s, r) => s + effectiveTotal(r, priceOf(r)), 0);
      return { type, label: typeLabels[type], expected, count: rows.length };
    });

    const expectedRevenue = periodRes.reduce((s, r) => s + effectiveTotal(r, priceOf(r)), 0);

    // Collected = payments recorded within the period.
    const collectedRevenue = (payRows.data ?? [])
      .filter((p: any) => inRange((p.created_at ?? "").slice(0, 10)))
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Projected = expected totals of upcoming (future arrival) reservations in period.
    const projectedRevenue = periodRes
      .filter((r) => r.arrival_date >= todayIso && r.status !== "terminée")
      .reduce((s, r) => s + effectiveTotal(r, priceOf(r)), 0);

    const completedStays = periodRes.filter((r) => r.status === "terminée").length;
    const upcomingStays = periodRes.filter(
      (r) => r.arrival_date >= todayIso && r.status !== "terminée",
    ).length;

    return {
      start: data.start,
      end: data.end,
      revenueByType,
      expectedRevenue,
      collectedRevenue,
      projectedRevenue,
      completedStays,
      upcomingStays,
      totalReservations: periodRes.length,
    };
  });

// ── Revenue analytics by logement type (dashboard chart) ─────────────────
// Aggregates the reservation history over a selectable period, grouped by
// logement type and by reservation status. For each (type, status) bucket we
// expose the contracted revenue (chiffre d'affaires), the collected amount
// (avances encaissées) and the remaining balance (solde restant). The status
// reflects what managers see in the Reservations table (clock-driven), so the
// "terminée" filter matches finished stays.
export const opGetRevenueAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ start: DATE, end: DATE }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;
    const [units, reservations] = await Promise.all([
      loadUnits(sb),
      loadReservations(sb),
    ]);

    const unitById = new Map(units.map((u) => [u.id, u]));
    const priceByType = new Map<string, number>();
    for (const u of units) if (!priceByType.has(u.type)) priceByType.set(u.type, u.price);
    const priceOf = (r: ResRow) =>
      (r.logement_unit_id ? unitById.get(r.logement_unit_id)?.price : undefined) ??
      (r.logement_type ? priceByType.get(r.logement_type) : undefined) ??
      0;

    const inRange = (d: string) => d >= data.start && d <= data.end;
    const nowMs = Date.now();

    const TYPES = ["chambre", "studio", "appartement"] as const;
    const typeLabels: Record<string, string> = {
      chambre: "Chambre",
      studio: "Studio",
      appartement: "Appartement",
    };
    // Status keys exposed to the filter ("all" = every status except cancelled).
    const STATUSES = ["all", "nouvelle", "confirmée", "encours", "terminée"] as const;

    // Enrich each in-range reservation with its display status + money figures.
    const rows = reservations
      .filter((r) => r.status !== BLOCK_STATUS && r.status !== "annulée" && inRange(r.arrival_date))
      .map((r) => {
        const total = effectiveTotal(r, priceOf(r));
        const advance = Math.min(Number(r.advance_amount) || 0, total);
        const arrivalMs = new Date(
          `${r.arrival_date}T${(r.arrival_time ?? DEFAULT_CHECKIN_TIME).slice(0, 5)}:00`,
        ).getTime();
        const departureMs = new Date(
          `${r.departure_date}T${(r.departure_time ?? DEFAULT_CHECKOUT_TIME).slice(0, 5)}:00`,
        ).getTime();
        return {
          type: r.logement_type ?? "",
          status: displayReservationStatus(r.status, arrivalMs, departureMs, nowMs) as string,
          total,
          collected: advance,
          balance: Math.max(0, total - advance),
        };
      });

    // Build per-status → per-type aggregation.
    const byStatus: Record<
      string,
      { type: string; label: string; total: number; collected: number; balance: number; count: number }[]
    > = {};
    for (const status of STATUSES) {
      byStatus[status] = TYPES.map((type) => {
        const rs = rows.filter(
          (x) => x.type === type && (status === "all" || x.status === status),
        );
        return {
          type,
          label: typeLabels[type],
          total: rs.reduce((s, x) => s + x.total, 0),
          collected: rs.reduce((s, x) => s + x.collected, 0),
          balance: rs.reduce((s, x) => s + x.balance, 0),
          count: rs.length,
        };
      });
    }

    return { start: data.start, end: data.end, byStatus };
  });
