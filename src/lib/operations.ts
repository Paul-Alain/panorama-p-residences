/**
 * Shared operational vocabulary for the manager dashboard.
 * Pure, client + server safe: status enums, French labels, allowed workflow
 * transitions, and derivation helpers for unit + payment status.
 */

// ── Reservation lifecycle ────────────────────────────────────────────────
// `nouvelle` is the incoming request / pending state. `bloqué` is the
// maintenance sentinel (handled separately). Workflow is enforced server-side.
export type ResStatus =
  | "nouvelle"
  | "confirmée"
  | "checkin"
  | "terminée"
  | "annulée";

export const RES_STATUS_LABELS: Record<string, string> = {
  nouvelle: "En attente de validation",
  confirmée: "Confirmée",
  checkin: "En cours de séjour",
  encours: "En cours de séjour",
  terminée: "Terminée",
  annulée: "Annulée",
  bloqué: "Bloqué",
};

/** Display statuses surfaced in the manager Reservations table. */
export type DisplayResStatus =
  | "nouvelle"
  | "confirmée"
  | "encours"
  | "terminée"
  | "annulée";

/** Ordered list used for the status filter dropdown. */
export const DISPLAY_RES_STATUSES: DisplayResStatus[] = [
  "nouvelle",
  "confirmée",
  "encours",
  "terminée",
  "annulée",
];

/**
 * Derive the status shown to managers from the stored DB status and the stay
 * window. Confirmed bookings automatically become "En cours de séjour" while
 * the guest is within the interval, then "Terminée" once departure has passed.
 * Cancelled and pending stay as-is.
 */
export function displayReservationStatus(
  dbStatus: string,
  arrivalMs: number,
  departureMs: number,
  nowMs: number = Date.now(),
): DisplayResStatus {
  if (dbStatus === "annulée") return "annulée";
  if (dbStatus === "nouvelle") return "nouvelle";
  // confirmée / checkin / terminée are driven by the clock.
  if (nowMs >= departureMs) return "terminée";
  if (nowMs >= arrivalMs) return "encours";
  return "confirmée";
}

/** Maximum guests allowed per accommodation type (shared by all forms). */
export const MAX_GUESTS_BY_TYPE: Record<string, number> = {
  chambre: 2,
  studio: 2,
  appartement: 4,
};

/** Allowed forward transitions. Anything not listed is rejected server-side. */
export const RES_TRANSITIONS: Record<string, ResStatus[]> = {
  nouvelle: ["confirmée", "annulée"],
  confirmée: ["checkin", "annulée"],
  checkin: ["terminée"],
  terminée: [],
  annulée: [],
};

export function canTransition(from: string, to: string): boolean {
  return (RES_TRANSITIONS[from] ?? []).includes(to as ResStatus);
}

/** Statuses that occupy a physical unit (count against availability). */
export const ACTIVE_RES_STATUSES = ["confirmée", "checkin"] as const;

// ── Booking channel ────────────────────────────────────────────────────────
export const CHANNEL_LABELS: Record<string, string> = {
  website: "Site web",
  whatsapp: "WhatsApp",
  phone: "Téléphone",
  walkin: "Sur place",
};

// ── Payment ──────────────────────────────────────────────────────────────
export type PayStatus =
  | "non_paye"
  | "acompte"
  | "partiel"
  | "paye"
  | "solde_du";

export const PAY_STATUS_LABELS: Record<string, string> = {
  non_paye: "Non payé",
  acompte: "Acompte reçu",
  partiel: "Partiellement payé",
  paye: "Payé",
  solde_du: "Solde dû",
};

export type PayMethod = "especes" | "mobile_money" | "virement" | "carte_externe";

export const PAY_METHOD_LABELS: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement bancaire",
  carte_externe: "Carte bancaire (hors plateforme)",
};

/**
 * Derive a payment status from totals. Manager can still override manually to
 * `acompte` / `solde_du`, but auto-derivation keeps things consistent.
 */
export function derivePaymentStatus(total: number, paid: number): PayStatus {
  if (paid <= 0) return "non_paye";
  if (total > 0 && paid >= total) return "paye";
  return "partiel";
}

// ── Unit operational status ──────────────────────────────────────────────
export type OpStatus = "actif" | "nettoyage" | "maintenance" | "bloquee";

export const OP_STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  nettoyage: "Nettoyage",
  maintenance: "Maintenance",
  bloquee: "Bloquée",
};

// ── Computed (displayed) unit status ─────────────────────────────────────
export type UnitStatus =
  | "libre"
  | "occupee"
  | "arrivee"
  | "depart"
  | "nettoyage"
  | "maintenance"
  | "bloquee"
  | "conflit";

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  libre: "Libre",
  occupee: "Occupée",
  arrivee: "Arrivée prévue",
  depart: "Départ prévu",
  nettoyage: "Nettoyage",
  maintenance: "Maintenance",
  bloquee: "Bloquée",
  conflit: "Conflit",
};

/** Maps a unit/calendar status to one of the status fill classes in styles.css */
export function statusFillClass(s: UnitStatus | "confirmee" | "present"): string {
  switch (s) {
    case "libre":
      return "st-libre";
    case "occupee":
    case "present":
      return "st-present";
    case "confirmee":
      return "st-confirme";
    case "arrivee":
    case "depart":
      return "st-jour";
    case "conflit":
      return "st-conflit";
    case "maintenance":
      return "st-conflit";
    case "bloquee":
      return "st-bloque";
    case "nettoyage":
      return "st-nettoyage";
    default:
      return "st-libre";
  }
}

export interface UnitBookingLite {
  arrival_date: string;
  departure_date: string;
  status: string;
}

/**
 * Compute today's display status for a physical unit, combining its manual
 * op_status with overlapping reservations. `today` is a YYYY-MM-DD string.
 */
export function computeUnitStatus(
  opStatus: string,
  bookings: UnitBookingLite[],
  today: string,
): UnitStatus {
  if (opStatus === "maintenance") return "maintenance";
  if (opStatus === "bloquee") return "bloquee";
  if (opStatus === "nettoyage") return "nettoyage";

  // Bookings that still hold the unit (exclude cancelled / completed).
  const active = bookings.filter(
    (b) => b.status !== "annulée" && b.status !== "terminée",
  );

  // Reservations overlapping today (departure day is checkout = free).
  const overlap = active.filter(
    (b) => b.arrival_date <= today && b.departure_date > today,
  );
  const realOverlap = overlap.filter((b) => b.status !== "bloqué");
  const blockedOverlap = overlap.filter((b) => b.status === "bloqué");

  if (realOverlap.length > 1) return "conflit";

  const arrivesToday = active.some(
    (b) => b.status !== "bloqué" && b.arrival_date === today,
  );
  const departsToday = active.some(
    (b) => b.status !== "bloqué" && b.departure_date === today,
  );

  if (realOverlap.length === 1) return "occupee";
  if (blockedOverlap.length > 0) return "bloquee";
  if (departsToday) return "depart";
  if (arrivesToday) return "arrivee";
  return "libre";
}


export function nightsBetween(arrival: string, departure: string): number {
  const a = Date.parse(arrival);
  const d = Date.parse(departure);
  if (Number.isNaN(a) || Number.isNaN(d)) return 0;
  return Math.max(0, Math.round((d - a) / 86_400_000));
}

// ── Booking-unit billing rule (replaces the old nights/24h rule) ──────────
// Default wall-clock times used when a reservation has no explicit time.
export const DEFAULT_CHECKIN_TIME = "14:00";
export const DEFAULT_CHECKOUT_TIME = "11:00";

/** Build a Date from a `YYYY-MM-DD` date and an `HH:MM` time (local wall clock). */
export function toDateTime(date: string, time?: string | null): Date {
  const t = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  return new Date(`${date}T${t}:00`);
}

/**
 * Number of billable booking units for a stay.
 *
 * Rule (noon-crossing): the stay always costs at least 1 unit. One additional
 * unit is billed for **each** time the daily 12:00 (noon) checkpoint falls
 * strictly inside the [arrival, departure[ interval. The result is therefore
 * `max(1, number of noons crossed)`.
 *
 *   10 Jun 10:00 → 11 Jun 14:00 = 2  (crosses 10 Jun 12:00 and 11 Jun 12:00)
 *   10 Jun 13:00 → 10 Jun 18:00 = 1  (no noon crossed → minimum 1)
 *   10 Jun 09:00 → 10 Jun 13:00 = 1  (crosses one noon)
 */
export function bookingUnits(arrival: Date, departure: Date): number {
  if (
    !(arrival instanceof Date) ||
    !(departure instanceof Date) ||
    Number.isNaN(arrival.getTime()) ||
    Number.isNaN(departure.getTime()) ||
    departure <= arrival
  ) {
    return 0;
  }
  let crossings = 0;
  // First noon strictly after the arrival instant.
  const noon = new Date(arrival);
  noon.setHours(12, 0, 0, 0);
  if (noon <= arrival) noon.setDate(noon.getDate() + 1);
  while (noon < departure) {
    crossings += 1;
    noon.setDate(noon.getDate() + 1);
  }
  return Math.max(1, crossings);
}

/** Convenience wrapper computing booking units from date + time strings. */
export function bookingUnitsFrom(
  arrivalDate: string,
  arrivalTime: string | null | undefined,
  departureDate: string,
  departureTime: string | null | undefined,
): number {
  return bookingUnits(
    toDateTime(arrivalDate, arrivalTime ?? DEFAULT_CHECKIN_TIME),
    toDateTime(departureDate, departureTime ?? DEFAULT_CHECKOUT_TIME),
  );
}

/** Short reference derived from a reservation id (e.g. `RP-8F3A`). */
export function shortRef(id: string): string {
  return `RP-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

// ── Team roles ───────────────────────────────────────────────────────────
export const TEAM_ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  proprietaire: "Propriétaire",
  gestionnaire: "Gestionnaire",
  reception: "Réception",
  menage: "Ménage",
  comptable: "Comptable",
};

export const ASSIGNABLE_ROLES = [
  "proprietaire",
  "gestionnaire",
  "reception",
  "menage",
  "comptable",
] as const;

// ── Role tiers (Owner / Manager / Technician) ────────────────────────────
export type RoleTier = "owner" | "manager" | "technician" | null;

/** Collapse the granular roles into the three operational tiers. */
export function roleTier(roles: string[]): RoleTier {
  if (roles.includes("admin") || roles.includes("proprietaire")) return "owner";
  if (roles.includes("gestionnaire") || roles.includes("comptable")) return "manager";
  if (roles.includes("reception") || roles.includes("menage")) return "technician";
  return null;
}

/** Tier display labels per language. */
export const ROLE_TIER_LABELS: Record<"fr" | "en" | "de", Record<Exclude<RoleTier, null>, string>> = {
  fr: { owner: "Propriétaire", manager: "Gestionnaire", technician: "Technicien" },
  en: { owner: "Owner", manager: "Manager", technician: "Technician" },
  de: { owner: "Eigentümer", manager: "Manager", technician: "Techniker" },
};

/** Whether a tier may perform financial / destructive operations. */
export function canManageFinance(tier: RoleTier): boolean {
  return tier === "owner" || tier === "manager";
}

