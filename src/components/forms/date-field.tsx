import { forwardRef, useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Locale-aware date field.
 *
 * Always stores / emits an ISO date (`YYYY-MM-DD`) but DISPLAYS and accepts the
 * day-first format the residence uses everywhere:
 *   • French  → placeholder `jj/mm/aaaa`
 *   • English → placeholder `DD/MM/YYYY`
 *   • German  → placeholder `TT.MM.JJJJ`
 *
 * The visible text never depends on the browser locale (unlike a native
 * `<input type="date">`), so guests always see the expected format.
 */

const LOCALE_MAP: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE" };

function placeholderFor(lang: string): string {
  if (lang === "en") return "DD/MM/YYYY";
  if (lang === "de") return "TT.MM.JJJJ";
  return "jj/mm/aaaa";
}

/** ISO (`YYYY-MM-DD`) → display (`dd/mm/yyyy`). */
function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Display (`dd/mm/yyyy`) → ISO (`YYYY-MM-DD`) or "" when incomplete/invalid. */
function displayToIso(s: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return "";
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Auto-insert slashes as the user types digits. */
function maskTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export interface DateFieldProps {
  value: string;
  onChange: (iso: string) => void;
  lang?: string;
  id?: string;
  required?: boolean;
  invalid?: boolean;
  className?: string;
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  function DateField({ value, onChange, lang = "fr", id, required, invalid, className }, ref) {
    const [text, setText] = useState(() => isoToDisplay(value));

    // Resync the visible text only when the stored value changes externally
    // (prefill, edit dialog, reset) — never while the guest is typing.
    useEffect(() => {
      if (value !== displayToIso(text)) setText(isoToDisplay(value));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;

    return (
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          inputMode="numeric"
          autoComplete="off"
          required={required}
          placeholder={placeholderFor(lang)}
          value={text}
          aria-invalid={invalid}
          className={cn("pr-10", invalid && "border-destructive ring-destructive", className)}
          onChange={(e) => {
            const masked = maskTyping(e.target.value);
            setText(masked);
            onChange(displayToIso(masked));
          }}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              tabIndex={-1}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
              aria-label="Ouvrir le calendrier"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              defaultMonth={selectedDate}
              onSelect={(d) => {
                if (!d) return;
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                setText(isoToDisplay(iso));
                onChange(iso);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);
