import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CalendarCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/forms/phone-input";
import { DateField } from "@/components/forms/date-field";
import { TimeField } from "@/components/forms/time-field";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";
import { whatsappLink } from "@/lib/site-config";

const TYPE_OPTIONS = ["chambre", "studio", "appartement"] as const;
type LogementType = (typeof TYPE_OPTIONS)[number];

const MAX_GUESTS: Record<LogementType, number> = {
  chambre: 2,
  studio: 2,
  appartement: 4,
};

const DEFAULT_ARRIVAL_TIME = "14:00";
const DEFAULT_DEPARTURE_TIME = "11:00";

/** Small red asterisk marking a required field. */
function Req() {
  return <span className="text-destructive"> *</span>;
}

/** Build a Date from `YYYY-MM-DD` + `HH:MM`. */
function toDateTime(date: string, time: string) {
  if (!date) return null;
  return new Date(`${date}T${time || "00:00"}:00`);
}

const TYPE_LABELS_BI: Record<LogementType, string> = {
  chambre: "Chambre / Room",
  studio: "Studio / Studio",
  appartement: "Appartement / Apartment",
};

export function ReservationForm({ defaultType = "" }: { defaultType?: string }) {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    arrival: "",
    departure: "",
    arrivalTime: DEFAULT_ARRIVAL_TIME,
    departureTime: DEFAULT_DEPARTURE_TIME,
    type: "",
    guests: "1",
    message: "",
  });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  /* Preselect a type when coming from a logement card */
  useEffect(() => {
    if (
      defaultType &&
      !form.type &&
      (TYPE_OPTIONS as readonly string[]).includes(defaultType)
    ) {
      setForm((f) => ({ ...f, type: defaultType }));
    }
  }, [defaultType, form.type]);

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

  const maxGuests = form.type
    ? MAX_GUESTS[form.type as LogementType]
    : undefined;
  const guestsNum = Number(form.guests) || 0;
  const guestsExceeded = maxGuests !== undefined && guestsNum > maxGuests;

  const typeLabel = (type: string) =>
    t.reservation.typeOptions[type as LogementType] ?? type;

  /* Datetime validation (date + time) */
  const arrivalDT = toDateTime(form.arrival, form.arrivalTime);
  const departureDT = toDateTime(form.departure, form.departureTime);

  const arrivalInPast = arrivalDT !== null && arrivalDT.getTime() < Date.now();
  const departureBeforeArrival =
    departureDT !== null && arrivalDT !== null && departureDT <= arrivalDT;

  const dateInvalid = arrivalInPast || departureBeforeArrival;

  /* Bilingual (FR + EN) editable WhatsApp message.
     Dates/times follow the locale: French = "12 juin 2026 · 14:00" (24h),
     English = American "June 12, 2026 · 2:00 PM" (12h). */
  const LOCALE_MAP: Record<string, string> = { fr: "fr-FR", en: "en-US", de: "de-DE" };
  const fmtDate = (d: string, time: string) => {
    if (!d) return "—";
    const dt = toDateTime(d, time);
    if (!dt) return "—";
    const loc = LOCALE_MAP[lang] ?? "fr-FR";
    const datePart = dt.toLocaleDateString(loc, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timePart = dt.toLocaleTimeString(loc, {
      hour: lang === "en" ? "numeric" : "2-digit",
      minute: "2-digit",
      hour12: lang === "en",
    });
    return `${datePart} · ${timePart}`;
  };

  const defaultWaMessage = useMemo(() => {
    const arrival = fmtDate(form.arrival, form.arrivalTime);
    const departure = fmtDate(form.departure, form.departureTime);
    const type = form.type ? TYPE_LABELS_BI[form.type as LogementType] : "—";
    const guests = form.guests && Number(form.guests) > 0 ? form.guests : "1";
    return `Bonjour Panorama-P Residence, j'aimerais réserver / Hello Panorama-P Residence, I would like to book:

• Nom / Full name: ${form.name || "—"}
• Téléphone / Phone: ${form.phone || "—"}
• E-mail / Email: ${form.email || "—"}
• Arrivée / Check-in: ${arrival}
• Départ / Check-out: ${departure}
• Type de logement / Accommodation type: ${type}
• Personnes / Guests: ${guests}

Merci de me confirmer la disponibilité et le tarif SVP / Please confirm availability and price.`;
  }, [
    form.name,
    form.phone,
    form.email,
    form.arrival,
    form.departure,
    form.arrivalTime,
    form.departureTime,
    form.type,
    form.guests,
    lang,
  ]);

  /* Keep the editable message in sync until the user edits it manually. */
  const [waMessage, setWaMessage] = useState(defaultWaMessage);
  const waEdited = useRef(false);
  useEffect(() => {
    if (!waEdited.current) setWaMessage(defaultWaMessage);
  }, [defaultWaMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.arrival ||
      !form.departure ||
      !form.type
    )
      return;

    if (arrivalInPast) {
      toast.error(t.reservation.arrivalInPast);
      return;
    }
    if (departureBeforeArrival) {
      toast.error(t.reservation.departureBeforeArrival);
      return;
    }
    if (guestsExceeded) {
      toast.error(
        t.reservation.maxGuestsWarning.replace("{max}", String(maxGuests)),
      );
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
      arrival_time: form.arrivalTime || DEFAULT_ARRIVAL_TIME,
      departure_time: form.departureTime || DEFAULT_DEPARTURE_TIME,
      channel: "website",
      guests: guestsNum || 1,
      logement_unit_id: null,
      logement_type: form.type,
      message: form.message.trim().slice(0, 1000) || null,
      user_id: user?.id ?? null,
    });
    setLoading(false);
    if (error) {
      toast.error(t.reservation.error);
      return;
    }
    // Fire-and-forget: branded guest confirmation plus an automatic alert
    // to the team inbox for every new booking.
    fetch("/api/public/email/reservation-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        unitLabel: typeLabel(form.type),
        lang,
      }),
    }).catch(() => {});
    toast.success(t.reservation.success);
    waEdited.current = false;
    setForm({
      name: "",
      phone: "",
      email: "",
      arrival: "",
      departure: "",
      arrivalTime: DEFAULT_ARRIVAL_TIME,
      departureTime: DEFAULT_DEPARTURE_TIME,
      type: "",
      guests: "1",
      message: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-xs text-muted-foreground">
        <span className="text-destructive">*</span> {t.reservation.requiredHint}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-name">{t.reservation.name}<Req /></Label>
          <Input
            id="r-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-phone">{t.reservation.phone}<Req /></Label>
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
          <Label htmlFor="r-arrival">{t.reservation.arrival}<Req /></Label>
          <DateField
            id="r-arrival"
            lang={lang}
            value={form.arrival}
            onChange={(v) => set("arrival", v)}
            required
            invalid={arrivalInPast}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-arrival-time">{t.reservation.arrivalTime}<Req /></Label>
          <TimeField
            id="r-arrival-time"
            lang={lang}
            value={form.arrivalTime}
            onChange={(v) => set("arrivalTime", v)}
            required
            invalid={arrivalInPast}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        🕐 Heure de Yaoundé / Bafoussam (UTC+1)
      </p>
      {arrivalInPast && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {t.reservation.arrivalInPast}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-departure">{t.reservation.departure}<Req /></Label>
          <DateField
            id="r-departure"
            lang={lang}
            value={form.departure}
            onChange={(v) => set("departure", v)}
            required
            invalid={departureBeforeArrival}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-departure-time">{t.reservation.departureTime}<Req /></Label>
          <TimeField
            id="r-departure-time"
            lang={lang}
            value={form.departureTime}
            onChange={(v) => set("departureTime", v)}
            required
            invalid={departureBeforeArrival}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        🕐 Heure de Yaoundé / Bafoussam (UTC+1)
      </p>
      {departureBeforeArrival && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {t.reservation.departureBeforeArrival}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t.reservation.type}<Req /></Label>
          <Select
            value={form.type}
            onValueChange={(v) => {
              setForm((f) => {
                const max = MAX_GUESTS[v as LogementType];
                const current = Number(f.guests) || 1;
                return {
                  ...f,
                  type: v,
                  guests: String(Math.min(current, max)),
                };
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.reservation.typePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {typeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-guests">{t.reservation.guests}<Req /></Label>
          <Input
            id="r-guests"
            type="number"
            min={1}
            max={maxGuests ?? 4}
            value={form.guests}
            onChange={(e) => set("guests", e.target.value)}
            required
            aria-invalid={guestsExceeded}
          />
          {guestsExceeded && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {t.reservation.maxGuestsWarning.replace(
                "{max}",
                String(maxGuests),
              )}
            </p>
          )}
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

      {/* ── Option 1 : réservation en ligne ──────────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-sm font-semibold text-foreground">
          {t.reservation.onlineBlockTitle}
        </p>
        <Button
          type="submit"
          variant="gold"
          size="lg"
          disabled={loading || guestsExceeded || dateInvalid}
          className="w-full"
        >
          <CalendarCheck className="h-5 w-5" />
          {loading ? t.reservation.submitting : t.reservation.submit}
        </Button>
      </div>

      {/* ── Séparateur entre les deux options ─────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t.reservation.or}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* ── Option 2 : réservation via WhatsApp ───────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">
          {t.reservation.whatsappBlockTitle}
        </p>
        <Label htmlFor="r-wa" className="text-xs text-muted-foreground">
          {t.reservation.whatsappEditable}
        </Label>
        <Textarea
          id="r-wa"
          rows={9}
          value={waMessage}
          onChange={(e) => {
            waEdited.current = true;
            setWaMessage(e.target.value);
          }}
          className="font-mono text-xs"
        />
        <Button asChild variant="outline" size="lg" className="w-full">
          <a href={whatsappLink(waMessage)} target="_blank" rel="noreferrer">
            <MessageCircle className="h-5 w-5" />
            {t.reservation.whatsappCta}
          </a>
        </Button>
      </div>
    </form>
  );
}
