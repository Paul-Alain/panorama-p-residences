import { useEffect, useMemo, useState } from "react";
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

/** Small red asterisk marking a required field. */
function Req() {
  return <span className="text-destructive"> *</span>;
}

/** Start of today in local time for date comparisons. */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ReservationForm({ defaultType = "" }: { defaultType?: string }) {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    arrival: "",
    departure: "",
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

  /* Date validation */
  const today = startOfToday();
  const arrivalDate = form.arrival ? new Date(form.arrival) : null;
  const departureDate = form.departure ? new Date(form.departure) : null;

  const arrivalInPast = arrivalDate !== null && arrivalDate < today;
  const departureBeforeArrival =
    departureDate !== null && arrivalDate !== null && departureDate <= arrivalDate;

  const dateInvalid = arrivalInPast || departureBeforeArrival;

  /* WhatsApp pre-filled message in the user's current language */
  const waMessage = useMemo(() => {
    const arrival = form.arrival
      ? new Date(form.arrival).toLocaleDateString(lang, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
    const departure = form.departure
      ? new Date(form.departure).toLocaleDateString(lang, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
    const type = form.type ? typeLabel(form.type) : "";
    const guests = form.guests;

    if (lang === "fr") {
      return `Bonjour Panorama P Residence,

Je souhaite effectuer une réservation.

Détails du séjour :
- Date d'arrivée : ${arrival}
- Date de départ : ${departure}
- Type de logement : ${type}
- Nombre de personnes : ${guests}

Merci de confirmer la disponibilité et les tarifs.

Cordialement,`;
    }
    if (lang === "de") {
      return `Hallo Panorama P Residence,

Ich möchte eine Reservierung vornehmen.

Aufenthaltsdetails:
- Anreisedatum: ${arrival}
- Abreisedatum: ${departure}
- Art der Unterkunft: ${type}
- Anzahl der Personen: ${guests}

Bitte bestätigen Sie die Verfügbarkeit und die Preise.

Mit freundlichen Grüßen,`;
    }
    return `Hello Panorama P Residence,

I would like to make a reservation.

Stay details:
- Check-in date: ${arrival}
- Check-out date: ${departure}
- Accommodation type: ${type}
- Number of guests: ${guests}

Please confirm availability and price.

Best regards,`;
  }, [form.arrival, form.departure, form.type, form.guests, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
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
      }),
    }).catch(() => {});
    toast.success(t.reservation.success);
    setForm({
      name: "",
      phone: "",
      email: "",
      arrival: "",
      departure: "",
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
        <Label htmlFor="r-email">{t.reservation.email}<Req /></Label>
        <Input
          id="r-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
          maxLength={160}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="r-arrival">{t.reservation.arrival}<Req /></Label>
          <Input
            id="r-arrival"
            type="date"
            value={form.arrival}
            onChange={(e) => set("arrival", e.target.value)}
            required
            aria-invalid={arrivalInPast}
            className={arrivalInPast ? "border-destructive ring-destructive" : ""}
          />
          {arrivalInPast && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {t.reservation.arrivalInPast}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-departure">{t.reservation.departure}<Req /></Label>
          <Input
            id="r-departure"
            type="date"
            value={form.departure}
            onChange={(e) => set("departure", e.target.value)}
            required
            aria-invalid={departureBeforeArrival}
            className={departureBeforeArrival ? "border-destructive ring-destructive" : ""}
          />
          {departureBeforeArrival && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {t.reservation.departureBeforeArrival}
            </p>
          )}
        </div>
      </div>

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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          variant="gold"
          size="lg"
          disabled={loading || guestsExceeded || dateInvalid}
          className="flex-1"
        >
          <CalendarCheck className="h-5 w-5" />
          {loading ? t.reservation.submitting : t.reservation.submit}
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <a href={whatsappLink(waMessage)} target="_blank" rel="noreferrer">
            <MessageCircle className="h-5 w-5" />
            {t.reservation.whatsappCta}
          </a>
        </Button>
      </div>
    </form>
  );
}
