import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Locale-aware time field.
 *
 * Always stores / emits 24-hour `HH:MM` but DISPLAYS:
 *   • English → 12-hour with an AM / PM selector (American format)
 *   • French / German → 24-hour `HH:MM`
 *
 * The visible format never depends on the browser locale (unlike a native
 * `<input type="time">`).
 */

interface Parts {
  h: string;
  min: string;
  ap: "AM" | "PM";
}

function parse(value: string, en: boolean): Parts {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!m) return { h: "", min: "", ap: "AM" };
  const h = Number(m[1]);
  if (en) {
    const ap: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return { h: String(h12), min: m[2], ap };
  }
  return { h: String(h).padStart(2, "0"), min: m[2], ap: "AM" };
}

function compose(h: string, min: string, ap: "AM" | "PM", en: boolean): string {
  if (h === "" || min === "") return "";
  let hh = Number(h);
  let mm = Number(min);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return "";
  if (en) {
    hh = hh % 12;
    if (ap === "PM") hh += 12;
  }
  hh = Math.max(0, Math.min(23, hh));
  mm = Math.max(0, Math.min(59, mm));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export interface TimeFieldProps {
  value: string;
  onChange: (v: string) => void;
  lang?: string;
  id?: string;
  required?: boolean;
  invalid?: boolean;
  className?: string;
}

export function TimeField({
  value,
  onChange,
  lang = "fr",
  id,
  required,
  invalid,
  className,
}: TimeFieldProps) {
  const en = lang === "en";
  const [h, setH] = useState(() => parse(value, en).h);
  const [min, setMin] = useState(() => parse(value, en).min);
  const [ap, setAp] = useState<"AM" | "PM">(() => parse(value, en).ap);

  // Resync from the stored value only when it changes externally.
  useEffect(() => {
    if (value !== compose(h, min, ap, en)) {
      const p = parse(value, en);
      setH(p.h);
      setMin(p.min);
      setAp(p.ap);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, en]);

  const emit = (nh: string, nmin: string, nap: "AM" | "PM") =>
    onChange(compose(nh, nmin, nap, en));

  const invalidCls = cn(invalid && "border-destructive ring-destructive", className);

  return (
    <div className="flex items-center gap-1.5">
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={en ? 1 : 0}
        max={en ? 12 : 23}
        required={required}
        placeholder={en ? "hh" : "HH"}
        value={h}
        aria-invalid={invalid}
        className={cn("w-16 text-center", invalidCls)}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setH(v);
          emit(v, min, ap);
        }}
      />
      <span className="text-muted-foreground">:</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        required={required}
        placeholder="mm"
        value={min}
        aria-invalid={invalid}
        className={cn("w-16 text-center", invalidCls)}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setMin(v);
          emit(h, v, ap);
        }}
      />
      {en && (
        <Select
          value={ap}
          onValueChange={(v) => {
            const next = v as "AM" | "PM";
            setAp(next);
            emit(h, min, next);
          }}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
