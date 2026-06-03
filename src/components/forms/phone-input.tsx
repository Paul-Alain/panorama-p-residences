import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, DEFAULT_COUNTRY, splitPhone, type Country } from "@/lib/countries";

interface PhoneInputProps {
  /** Full international number, e.g. "+237699000000". */
  value: string;
  onChange: (full: string) => void;
  id?: string;
  required?: boolean;
}

/**
 * Phone field with a country dropdown. The country selection sets the
 * international dialing prefix; the text input holds the local digits.
 * The combined value emitted upward is always E.164 ("+<dial><digits>").
 */
export function PhoneInput({ value, onChange, id, required }: PhoneInputProps) {
  const [manualCountry, setManualCountry] = useState<Country | null>(null);

  // Derive country + local number from the controlled value, unless the user
  // explicitly picked a country (so an empty number keeps their choice).
  const derived = useMemo(() => splitPhone(value), [value]);
  const country = manualCountry ?? (value ? derived.country : DEFAULT_COUNTRY);
  const local = value ? derived.local : "";

  const emit = (c: Country, num: string) => {
    const digits = num.replace(/[^\d]/g, "");
    onChange(digits ? `+${c.dial}${digits}` : "");
  };

  return (
    <div className="flex gap-2">
      <Select
        value={country.code}
        onValueChange={(code) => {
          const c = COUNTRIES.find((x) => x.code === code) ?? DEFAULT_COUNTRY;
          setManualCountry(c);
          emit(c, local);
        }}
      >
        <SelectTrigger className="w-[7.5rem] shrink-0">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span aria-hidden>{country.flag}</span>
              <span>+{country.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span aria-hidden>{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={local}
        onChange={(e) => emit(country, e.target.value)}
        required={required}
        maxLength={15}
        placeholder="699 00 00 00"
      />
    </div>
  );
}
