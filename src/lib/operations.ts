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
  nouvelle: "En attente",
  confirmée: "Confirmée",
  checkin: "Client présent",
  terminée: "Terminée",
  annulée: "Annulée",
  bloqué: "Bloqué",
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
