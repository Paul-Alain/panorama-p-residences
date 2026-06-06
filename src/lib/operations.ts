/**
 * Shared operational vocabulary for the manager dashboard.
 * Pure, client + server safe: status enums, French labels, allowed workflow
 * transitions, and derivation helpers for unit + payment status.
 */

// ── Reservation lifecycle ────────────────────────────────────────────────
// Statuses stored in DB: nouvelle, confirmée, annulée
// "logé" is a DISPLAY-ONLY derived status (confirmée + departure passed)
export type ResStatus =
  | "nouvelle"
  | "confirmée"
  | "annulée"
  | "checkin"
  | "terminée";

export const RES_STATUS_LABELS: Record<string, string> = {
  nouvelle:  "En attente de confirmation",
  confirmée: "Confirmée",
  logé:      "Logé ✓",
  annulée:   "Annulée",
  // legacy labels kept for DB back-compat only
  checkin:   "Logé ✓",
  encours:   "Logé ✓",
  terminée:  "Logé ✓",
  bloqué:    "Bloqué",
};

/** Display statuses shown in the manager Reservations table. */
export type DisplayResStatus =
  | "nouvelle"
  | "confirmée"
  | "logé"
  | "annulée";

/** Ordered list used for the status filter dropdown. */
export const DISPLAY_RES_STATUSES: DisplayResStatus[] = [
  "nouvelle",
  "confirmée",
  "logé",
  "annulée",
];

/**
 * Derive the display status from DB status + departure datetime.
 *
 * Rules:
 *  - annulée  → always "annulée"   (final, immutable)
 *  - nouvelle → always "nouvelle"  (pending confirmation)
 *  - confirmée + departure NOT yet passed → "confirmée"
 *  - confirmée + departure PASSED         → "logé" (final, immutable)
 */
export function displayReservationStatus(
  dbStatus: string,
  arrivalMs: number,
  departureMs: number,
  nowMs: number = Date.now(),
): DisplayResStatus {
  if (dbStatus === "annulée") return "annulée";
  if (dbStatus === "nouvelle") return "nouvelle";
  // confirmée (or legacy checkin/terminée) — driven by clock
  if (nowMs >= departureMs) return "logé";
  return "confirmée";
}

/**
 * A reservation is "locked" (cannot be edited or have its status changed)
 * when its display status is "logé" or "annulée".
 */
export function isLocked(displayStatus: DisplayResStatus): boolean {
  return displayStatus === "logé" || displayStatus === "annulée";
}

/** Maximum guests allowed per accommodation type (shared by all forms). */
export const MAX_GUESTS_BY_TYPE: Record<string, number> = {
  chambre:      2,
  studio:       2,
  appartement:  4,
};

/**
 * Allowed forward transitions (server-side enforcement).
 * Once "logé" (departure passed) no transition is possible — enforced
 * by checking the clock before applying any transition server-side.
 */
export const RES_TRANSITIONS: Record<string, ResStatus[]> = {
  nouvelle:  ["confirmée", "annulée"],
  confirmée: ["annulée"],
  annulée:   [],
  checkin:   [],
  terminée:  [],
};

export function canTransition(from: string, to: string): boolean {
  return (RES_TRANSITIONS[from] ?? []).includes(to as ResStatus);
}

/** Statuses that occupy a physical unit (count against availability). */
export const ACTIVE_RES_STATUSES = ["confirmée", "checkin"] as const;

// ── Booking channel ────────────────────────────────────────────────────────
export const CHANNEL_LABELS: Record<string, string> = {
  website:  "Site web",
  whatsapp: "WhatsApp",
  phone:    "Téléphone",
  walkin:   "Sur place",
};

// ── Payment ──────────────────────────────────────────────────────────────
export type PayStatus =
  | "non_paye"
  | "acompte"
  | "partiel"
  | "paye"
  | "solde_du";

export const PAY_STATUS_LABELS: Record<string, string> = {
  non_paye:  "Non payé",
  acompte:   "Acompte reçu",
  partiel:   "Partiellement payé",
  paye:      "Payé",
  solde_du:  "Solde dû",
};

export type PayMethod =
  | "especes"
  | "mobile_money"
  | "virement"
  | "carte_externe";

export const PAY_METHOD_LABELS: Record<string, string> = {
  especes:        "Espèces",
  mobile_money:   "Mobile Money",
  virement:       "Virement bancaire",
  carte_externe:  "Carte bancaire (hors plateforme)",
};

export function derivePaymentStatus(total: number, paid: number): PayStatus {
  if (paid <= 0) return "non_paye";
  if (total > 0 && paid >= total) return "paye";
  return "partiel";
}

// ── Unit operational status ──────────────────────────────────────────────
export type OpStatus = "actif" | "nettoyage" | "maintenance" | "bloquee";

export const OP_STATUS_LABELS: Record<string, string> = {
  actif:        "Actif",
  nettoyage:    "Nettoyage",
  maintenance:  "Maintenance",
  bloquee:      "Bloquée",
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
  libre:        "Libre",
  occupee:      "Occupée",
  arrivee:      "Arrivée prévue",
  depart:       "Départ prévu",
  nettoyage:    "Nettoyage",
  maintenance:  "Maintenance",
  bloquee:      "Bloquée",
  conflit:      "Conflit",
};

export function statusFillClass(s: UnitStatus | "confirmee" | "present"): string {
  switch (s) {
    case "libre":       return "st-libre";
    case "occupee":
    case "present":     return "st-present";
    case "confirmee":   return "st-confirme";
    case "arrivee":
    case "depart":      return "st-jour";
    case "conflit":
    case "maintenance": return "st-conflit";
    case "bloquee":     return "st-bloque";
    case "nettoyage":   return "st-nettoyage";
    default:            return "st-libre";
  }
}

export interface UnitBookingLite {
  arrival_date: string;
  departure_date: string;
  status: string;
}

export function computeUnitStatus(
  opStatus: string,
  bookings: UnitBookingLite[],
  today: string,
): UnitStatus {
  if (opStatus === "maintenance") return "maintenance";
  if (opStatus === "bloquee")     return "bloquee";
  if (opStatus === "nettoyage")   return "nettoyage";

  const active = bookings.filter(
    (b) => b.status !== "annulée" && b.status !== "terminée",
  );
  const overlap = active.filter(
    (b) => b.arrival_date <= today && b.departure_date > today,
  );
  const realOverlap    = overlap.filter((b) => b.status !== "bloqué");
  const blockedOverlap = overlap.filter((b) => b.status === "bloqué");

  if (realOverlap.length > 1) return "conflit";

  const arrivesToday = active.some(
    (b) => b.status !== "bloqué" && b.arrival_date === today,
  );
  const departsToday = active.some(
    (b) => b.status !== "bloqué" && b.departure_date === today,
  );

  if (realOverlap.length === 1)   return "occupee";
  if (blockedOverlap.length > 0)  return "bloquee";
  if (departsToday)               return "depart";
  if (arrivesToday)               return "arrivee";
  return "libre";
}

export function nightsBetween(arrival: string, departure: string): number {
  const a = Date.parse(arrival);
  const d = Date.parse(departure);
  if (Number.isNaN(a) || Number.isNaN(d)) return 0;
  return Math.max(0, Math.round((d - a) / 86_400_000));
}

// ── Booking-unit billing rule ─────────────────────────────────────────────
export const DEFAULT_CHECKIN_TIME  = "14:00";
export const DEFAULT_CHECKOUT_TIME = "11:00";

export function toDateTime(date: string, time?: string | null): Date {
  const t = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  return new Date(`${date}T${t}:00`);
}

/**
 * Number of billable units (noon-crossing rule).
 * Each time 12:00 falls strictly inside [arrival, departure[ = +1 unit.
 * Minimum 1 unit.
 */
export function bookingUnits(arrival: Date, departure: Date): number {
  if (
    !(arrival instanceof Date) ||
    !(departure instanceof Date) ||
    Number.isNaN(arrival.getTime()) ||
    Number.isNaN(departure.getTime()) ||
    departure <= arrival
  ) return 0;

  let crossings = 0;
  const noon = new Date(arrival);
  noon.setHours(12, 0, 0, 0);
  if (noon <= arrival) noon.setDate(noon.getDate() + 1);
  while (noon < departure) {
    crossings += 1;
    noon.setDate(noon.getDate() + 1);
  }
  return Math.max(1, crossings);
}

export function bookingUnitsFrom(
  arrivalDate: string,
  arrivalTime: string | null | undefined,
  departureDate: string,
  departureTime: string | null | undefined,
): number {
  return bookingUnits(
    toDateTime(arrivalDate, arrivalTime   ?? DEFAULT_CHECKIN_TIME),
    toDateTime(departureDate, departureTime ?? DEFAULT_CHECKOUT_TIME),
  );
}

export function shortRef(id: string): string {
  return `RP-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

// ── Team roles ───────────────────────────────────────────────────────────
export const TEAM_ROLE_LABELS: Record<string, string> = {
  admin:        "Administrateur",
  proprietaire: "Propriétaire",
  gestionnaire: "Gestionnaire",
  technicien:   "Technicien",
  reception:    "Réception",
  menage:       "Ménage",
  comptable:    "Comptable",
};

export const ASSIGNABLE_ROLES = [
  "proprietaire",
  "gestionnaire",
] as const;

export type RoleTier = "owner" | "manager" | "technician" | null;

export function roleTier(roles: string[]): RoleTier {
  if (roles.includes("admin") || roles.includes("proprietaire")) return "owner";
  if (roles.includes("gestionnaire") || roles.includes("comptable")) return "manager";
  if (roles.includes("technicien") || roles.includes("reception") || roles.includes("menage")) return "technician";
  return null;
}

export function canManageTeam(roles: string[]): boolean {
  return roles.includes("admin") || roles.includes("proprietaire");
}

export const ROLE_TIER_LABELS: Record<"fr" | "en" | "de", Record<Exclude<RoleTier, null>, string>> = {
  fr: { owner: "Propriétaire", manager: "Gestionnaire", technician: "Technicien" },
  en: { owner: "Owner",        manager: "Manager",      technician: "Technician" },
  de: { owner: "Eigentümer",   manager: "Manager",      technician: "Techniker"  },
};

export function canManageFinance(tier: RoleTier): boolean {
  return tier === "owner" || tier === "manager";
}
