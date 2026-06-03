import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/forms/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";
import { whatsappLink } from "@/lib/site-config";
import { logementUnitsQuery, type LogementUnit } from "@/lib/data";
import { getUnitAvailability } from "@/lib/units.functions";

const CATEGORY_ORDER = ["chambre", "studio", "appartement"];

export function ReservationForm({ defaultType = "" }: { defaultType?: string }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    arrival: "",
    departure: "",
    guests: "1",
    unitId: "",
    message: "",
  });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { data: units = [] } = useQuery(logementUnitsQuery);
  const runAvailability = useServerFn(getUnitAvailability);

  const datesValid =
    !!form.arrival && !!form.departure && form.departure > form.arrival;

  /* Availability for the selected date range (booked unit ids) */
  const { data: availability, isFetching: checkingAvailability } = useQuery({
    queryKey: ["unit-availability", form.arrival, form.departure],
    queryFn: () =>
      runAvailability({ data: { arrival: form.arrival, departure: form.departure } }),
    enabled: datesValid,
  });
  const bookedIds = useMemo(
    () => new Set(availability?.bookedUnitIds ?? []),
    [availability],
  );

  const isUnitBookable = (u: LogementUnit) => u.available && !bookedIds.has(u.id);

  /* Group units by category in a stable order */
  const grouped = useMemo(() => {
    const map = new Map<string, LogementUnit[]>();
    for (const u of units) {
      if (!map.has(u.type)) map.set(u.type, []);
      map.get(u.type)!.push(u);
    }
    return Array.from(map.entries()).sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
    );
  }, [units]);

  const typeLabel: Record<string, string> = {
    studio: t.logements.types.studio,
    chambre: t.logements.types.chambre,
    appartement: t.logements.types.appartement,
  };

  /* Pre-fill from profile when user is logged in */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone_number")
        .eq("id", user.id)
        .maybeSingle();
      if (!mounted || !profile) return;
      setForm((f) => ({
        ...f,
        name: profile.full_name ?? f.name,
        phone: profile.phone_number ?? f.phone,
        email: user.email ?? f.email,
      }));
    })();
    return () => { mounted = false; };
  }, []);

  /* Preselect the first available unit matching defaultType (from a logement card) */
  useEffect(() => {
    if (!defaultType || form.unitId || units.length === 0) return;
    const match = units.find((u) => u.type === defaultType && u.available);
    if (match) setForm((f) => ({ ...f, unitId: match.id }));
  }, [defaultType, units, form.unitId]);

  /* Clear a selection that became unavailable for the chosen dates */
  useEffect(() => {
    if (form.unitId && bookedIds.has(form.unitId)) {
      setForm((f) => ({ ...f, unitId: "" }));
    }
  }, [bookedIds, form.unitId]);

  const selectedUnit = units.find((u) => u.id === form.unitId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.arrival || !form.departure)
      return;
    if (new Date(form.departure) <= new Date(form.arrival)) {
      toast.error(t.reservation.dateError);
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reservations").insert({
      name: form.name.trim().slice(0, 120),
      phone: form.phone.trim().slice(0, 40),
      email: form.email.trim().slice(0, 160) || null,
      arrival_date: form.arrival,
      departure_date: form.departure,
      guests: Number(form.guests) || 1,
      logement_unit_id: form.unitId || null,
      logement_type: selectedUnit?.type ?? null,
      message: form.message.trim().slice(0, 1000) || null,
      user_id: user?.id ?? null,
    });
    setLoading(false);
    if (error) {
      toast.error(t.reservation.error);
      return;
    }
    // Fire-and-forget branded confirmation email (only when an address is given).
    const confirmEmail = form.email.trim();
    if (confirmEmail) {
      fetch("/api/public/email/reservation-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: confirmEmail,
          name: form.name.trim(),
          unitLabel: selectedUnit?.label ?? "",
        }),
      }).catch(() => {});
    }
    toast.success(t.reservation.success);
    setForm({
      name: "",
      phone: "",
      email: "",
      arrival: "",
      departure: "",
      guests: "1",
      unitId: "",
      message: "",
    });
  };

  const waMessage = `Bonjour Panorama P,%0A${t.reservation.title}:%0A- ${form.name}%0A- ${form.arrival} → ${form.departure}%0A- ${form.guests} pers.%0A- ${selectedUnit?.label ?? ""}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-name">{t.reservation.name}</Label>
          <Input
            id="r-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-phone">{t.reservation.phone}</Label>
          <PhoneInput
            id="r-phone"
            value={form.phone}
            onChange={(v) => set("phone", v)}
            required
          />
        </div>

      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-email">{t.reservation.email}</Label>
        <Input
          id="r-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          maxLength={160}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-arrival">{t.reservation.arrival}</Label>
          <Input
            id="r-arrival"
            type="date"
            value={form.arrival}
            onChange={(e) => set("arrival", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-departure">{t.reservation.departure}</Label>
          <Input
            id="r-departure"
            type="date"
            value={form.departure}
            onChange={(e) => set("departure", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-guests">{t.reservation.guests}</Label>
          <Input
            id="r-guests"
            type="number"
            min={1}
            max={20}
            value={form.guests}
            onChange={(e) => set("guests", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t.reservation.unit}</Label>
          <Select value={form.unitId} onValueChange={(v) => set("unitId", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t.reservation.unitPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {grouped.map(([type, list]) => (
                <SelectGroup key={type}>
                  <SelectLabel>{typeLabel[type] ?? type}</SelectLabel>
                  {list.map((u) => {
                    const bookable = isUnitBookable(u);
                    return (
                      <SelectItem key={u.id} value={u.id} disabled={!bookable}>
                        {u.label}
                        {!bookable && datesValid ? ` (${t.reservation.unitBooked})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {checkingAvailability
              ? t.reservation.checkingAvailability
              : datesValid
                ? ""
                : t.reservation.selectDatesFirst}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="r-message">{t.reservation.message}</Label>
        <Textarea
          id="r-message"
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          maxLength={1000}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="gold" size="lg" disabled={loading} className="flex-1">
          <CalendarCheck className="h-5 w-5" />
          {loading ? t.reservation.submitting : t.reservation.submit}
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <a href={whatsappLink(decodeURIComponent(waMessage))} target="_blank" rel="noreferrer">
            <MessageCircle className="h-5 w-5" />
            {t.reservation.whatsappCta}
          </a>
        </Button>
      </div>
    </form>
  );
}
