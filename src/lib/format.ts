/**
 * Centralised French date/number formatting for the manager dashboard.
 * All dates are displayed as `jeu 05 nov 2026` — never ISO or US formats.
 */

function toDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  // Date-only strings (YYYY-MM-DD) must be parsed as local time to avoid
  // off-by-one shifts caused by UTC midnight parsing.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `jeu 05 nov 2026` */
export function formatDateFr(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(/\./g, "");
}

/** `05 nov` — compact, for tight columns */
export function formatDayMonth(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  })
    .format(d)
    .replace(/\./g, "");
}

/** `jeu 05 nov 2026 à 14:32` */
export function formatDateTimeFr(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  const date = formatDateFr(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${date} à ${time}`;
}

/** Relative French label: "il y a 5 min", "il y a 2 j" */
export function formatRelativeFr(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 30) return `il y a ${j} j`;
  return formatDateFr(d);
}

/** `25 000 FCFA` */
export function formatMoney(amount: number | null | undefined, currency = "FCFA"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `0 ${currency}`;
  return `${Math.round(n).toLocaleString("fr-FR")} ${currency}`;
}

/** Today as `YYYY-MM-DD` in local time (matches Supabase date columns). */
export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
