export interface Country {
  /** ISO 3166-1 alpha-2 code */
  code: string;
  /** Local name */
  name: string;
  /** Dial code without the leading "+" */
  dial: string;
  /** Flag emoji */
  flag: string;
}

/**
 * Focused list of countries (Central Africa + frequent traveller origins).
 * Sorted with Cameroon first since Panorama P is based in Bafoussam.
 */
export const COUNTRIES: Country[] = [
  { code: "CM", name: "Cameroun", dial: "237", flag: "🇨🇲" },
  { code: "FR", name: "France", dial: "33", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", dial: "32", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", dial: "41", flag: "🇨🇭" },
  { code: "DE", name: "Allemagne", dial: "49", flag: "🇩🇪" },
  { code: "GB", name: "Royaume-Uni", dial: "44", flag: "🇬🇧" },
  { code: "US", name: "États-Unis / Canada", dial: "1", flag: "🇺🇸" },
  { code: "ES", name: "Espagne", dial: "34", flag: "🇪🇸" },
  { code: "IT", name: "Italie", dial: "39", flag: "🇮🇹" },
  { code: "NL", name: "Pays-Bas", dial: "31", flag: "🇳🇱" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "GA", name: "Gabon", dial: "241", flag: "🇬🇦" },
  { code: "CG", name: "Congo", dial: "242", flag: "🇨🇬" },
  { code: "CD", name: "RD Congo", dial: "243", flag: "🇨🇩" },
  { code: "TD", name: "Tchad", dial: "235", flag: "🇹🇩" },
  { code: "CF", name: "Centrafrique", dial: "236", flag: "🇨🇫" },
  { code: "GQ", name: "Guinée équatoriale", dial: "240", flag: "🇬🇶" },
  { code: "CI", name: "Côte d'Ivoire", dial: "225", flag: "🇨🇮" },
  { code: "SN", name: "Sénégal", dial: "221", flag: "🇸🇳" },
  { code: "ML", name: "Mali", dial: "223", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", dial: "226", flag: "🇧🇫" },
  { code: "BJ", name: "Bénin", dial: "229", flag: "🇧🇯" },
  { code: "TG", name: "Togo", dial: "228", flag: "🇹🇬" },
  { code: "NG", name: "Nigéria", dial: "234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", dial: "233", flag: "🇬🇭" },
  { code: "MA", name: "Maroc", dial: "212", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", dial: "213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", dial: "216", flag: "🇹🇳" },
  { code: "AE", name: "Émirats arabes unis", dial: "971", flag: "🇦🇪" },
  { code: "CN", name: "Chine", dial: "86", flag: "🇨🇳" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

/** Split a full E.164 number into the matching country + local digits. */
export function splitPhone(full: string): { country: Country; local: string } {
  const digits = full.replace(/[^\d]/g, "");
  if (digits) {
    // Try the longest dial codes first to avoid ambiguous prefixes.
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
      if (digits.startsWith(c.dial)) {
        return { country: c, local: digits.slice(c.dial.length) };
      }
    }
  }
  return { country: DEFAULT_COUNTRY, local: "" };
}
