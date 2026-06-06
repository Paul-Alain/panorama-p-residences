import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CalendarCheck, Loader2, Lock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/forms/phone-input";
import { DateField } from "@/components/forms/date-field";
import { TimeField } from "@/components/forms/time-field";
import { supabase } from "@/integrations/supabase/client";
import { opCreateReservation, opUpdateReservation } from "@/lib/operations.functions";
import {
  bookingUnitsFrom, MAX_GUESTS_BY_TYPE,
  displayReservationStatus, isLocked,
  RES_STATUS_LABELS,
} from "@/lib/operations";
import { formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";
import { useLanguage } from "@/lib/i18n/language-context";

const TYPE_OPTIONS = ["chambre", "studio", "appartement"] as const;
type LogementType = (typeof TYPE_OPTIONS)[number];

const TYPE_LABELS: Record<LogementType, string> = {
  chambre:     "Chambre",
  studio:      "Studio",
  appartement: "Appartement",
};

const DEFAULT_ARRIVAL_TIME   = "14:00";
const DEFAULT_DEPARTURE_TIME = "11:00";

export const RESERVATION_QUERY_KEYS = [
  "op-dashboard",
  "admin-reservations",
  "op-clients",
  "op-calendar",
  "op-payments",
  "op-revenue",
  "op-analytics",
];

export interface EditableReservation {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  logement_type: string | null;
  guests: number;
  arrival_date: string;
  departure_date: string;
  arrival_time: string;
  departure_time: string;
  channel: string;
  advance: number;
  total_amount?: number;
  notes?: string | null;
  status?: string;
}

function Req() {
  return <span className="text-destructive"> *</span>;
}

export function ReservationFormDialog({
  open,
  onOpenChange,
  reservation,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservation?: EditableReservation | null;
  onSaved?: () => void;
}) {
  const qc        = useQueryClient();
  const residence = useResidence();
  const { lang }  = useLanguage();
  const runCreate = useServerFn(opCreateReservation);
  const runUpdate = useServerFn(opUpdateReservation);
  const isEdit    = !!reservation;

  // Detect locked status (logé or annulée)
  const locked = useMemo(() => {
    if (!reservation) return false;
    const arrMs = new Date(
      `${reservation.arrival_date}T${(reservation.arrival_time ?? DEFAULT_ARRIVAL_TIME).slice(0, 5)}:00`,
    ).getTime();
    const depMs = new Date(
      `${reservation.departure_date}T${(reservation.departure_time ?? DEFAULT_DEPARTURE_TIME).slice(0, 5)}:00`,
    ).getTime();
    const ds = displayReservationStatus(reservation.status ?? "nouvelle", arrMs, depMs);
    return isLocked(ds);
  }, [reservation]);

  const displayStatus = useMemo(() => {
    if (!reservation) return null;
    const arrMs = new Date(
      `${reservation.arrival_date}T${(reservation.arrival_time ?? DEFAULT_ARRIVAL_TIME).slice(0, 5)}:00`,
    ).getTime();
    const depMs = new Date(
      `${reservation.departure_date}T${(reservation.departure_time ?? DEFAULT_DEPARTURE_TIME).slice(0, 5)}:00`,
    ).getTime();
    return displayReservationStatus(reservation.status ?? "nouvelle", arrMs, depMs);
  }, [reservation]);

  // Load default prices per type
  const { data: defaultPriceByType = {} } = useQuery({
    queryKey: ["logement-prices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("logements")
        .select("type, price")
        .order("sort_order", { ascending: true });
      const map: Record<string, number> = {};
      for (const l of data ?? []) {
        if (map[l.type] === undefined) map[l.type] = Number(l.price) || 0;
      }
      return map;
    },
    staleTime: 60_000,
  });

  const empty = {
    name:           "",
    phone:          "",
    email:          "",
    type:           "",
    guests:         "1",
    arrival:        "",
    departure:      "",
    arrivalTime:    DEFAULT_ARRIVAL_TIME,
    departureTime:  DEFAULT_DEPARTURE_TIME,
    advance:        "0",
    addAdvance:     "0",
    notes:          "",
    customUnitPrice: "", // empty = use default price
  };

  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!open) return;
    if (reservation) {
      // Compute default unit price for this type
      const defPrice = defaultPriceByType[reservation.logement_type ?? ""] ?? 0;
      // Compute auto total to detect if price was customized
      const billUnits = bookingUnitsFrom(
        reservation.arrival_date,
        reservation.arrival_time ?? DEFAULT_ARRIVAL_TIME,
        reservation.departure_date,
        reservation.departure_time ?? DEFAULT_DEPARTURE_TIME,
      );
      const autoTotal = billUnits * defPrice;
      // If total_amount is set and differs from auto, derive the custom unit price
      const savedTotal = reservation.total_amount ?? 0;
      const customUnit = savedTotal > 0 && billUnits > 0 && savedTotal !== autoTotal
        ? String(Math.round(savedTotal / billUnits))
        : "";

      setForm({
        name:           reservation.name ?? "",
        phone:          reservation.phone ?? "",
        email:          reservation.email ?? "",
        type:           reservation.logement_type ?? "",
        guests:         String(reservation.guests ?? 1),
        arrival:        reservation.arrival_date ?? "",
        departure:      reservation.departure_date ?? "",
        arrivalTime:    (reservation.arrival_time   ?? DEFAULT_ARRIVAL_TIME).slice(0, 5),
        departureTime:  (reservation.departure_time ?? DEFAULT_DEPARTURE_TIME).slice(0, 5),
        advance:        String(reservation.advance ?? 0),
        addAdvance:     "0",
        notes:          reservation.notes ?? "",
        customUnitPrice: customUnit,
      });
    } else {
      setForm(empty);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation]);

  const maxGuests      = form.type ? MAX_GUESTS_BY_TYPE[form.type as LogementType] : undefined;
  const guestsNum      = Number(form.guests) || 0;
  const guestsExceeded = maxGuests !== undefined && guestsNum > maxGuests;

  const toDateTime = (date: string, time: string) =>
    date ? new Date(`${date}T${time || "00:00"}:00`) : null;
  const arrivalDT   = toDateTime(form.arrival, form.arrivalTime);
  const departureDT = toDateTime(form.departure, form.departureTime);
  const departureBeforeArrival =
    departureDT !== null && arrivalDT !== null && departureDT <= arrivalDT;
  // Avertissement (non bloquant) si arrivée dans le passé — utile pour saisies rétroactives
  const arrivalInPast = arrivalDT !== null && arrivalDT.getTime() < Date.now() - 60_000;

  // Billing units
  const units = useMemo(() => {
    if (!form.arrival || !form.departure) return 0;
    return bookingUnitsFrom(
      form.arrival,   form.arrivalTime,
      form.departure, form.departureTime,
    );
  }, [form.arrival, form.departure, form.arrivalTime, form.departureTime]);

  // Default unit price for selected type
  const defaultUnitPrice = form.type ? (defaultPriceByType[form.type] ?? 0) : 0;

  // Effective unit price: custom if set, else default
  const customUnitNum  = Number(form.customUnitPrice);
  const effectiveUnitPrice = form.customUnitPrice !== "" && customUnitNum >= 0
    ? customUnitNum
    : defaultUnitPrice;

  const isCustomPrice = form.customUnitPrice !== "" && customUnitNum !== defaultUnitPrice;
  const total         = units * effectiveUnitPrice;

  const baseAdvance  = Number(form.advance) || 0;
  const addedAdvance = Number(form.addAdvance) || 0;
  const advanceNum   = baseAdvance + addedAdvance;
  const balance      = Math.max(0, total - advanceNum);

  const invalidateAll = () =>
    Promise.all(RESERVATION_QUERY_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const submit = async () => {
    if (!form.name.trim())    return toast.error("Le nom du client est obligatoire.");
    if (!form.phone.trim())   return toast.error("Le téléphone est obligatoire.");
    if (!form.type)           return toast.error("Choisissez un type de logement.");
    if (!form.arrival || !form.departure) return toast.error("Dates invalides.");
    if (departureBeforeArrival)
      return toast.error("La date/heure de départ doit suivre l'arrivée.");
    if (guestsExceeded)
      return toast.error(`Ce logement accueille au maximum ${maxGuests} personne(s).`);

    const payload = {
      name:          form.name.trim(),
      phone:         form.phone.trim(),
      email:         form.email.trim() || undefined,
      logementType:  form.type as LogementType,
      arrival:       form.arrival,
      departure:     form.departure,
      arrivalTime:   form.arrivalTime   || DEFAULT_ARRIVAL_TIME,
      departureTime: form.departureTime || DEFAULT_DEPARTURE_TIME,
      channel:       "walkin" as const,
      guests:        guestsNum || 1,
      advance:       advanceNum,
      totalAmount:   total,
      notes:         form.notes.trim() || undefined,
    };

    setBusy(true);
    try {
      if (reservation) {
        await runUpdate({ data: { id: reservation.id, ...payload } });
        toast.success("Réservation mise à jour.");
      } else {
        await runCreate({ data: payload });
        toast.success("Réservation créée.");
      }
      await invalidateAll();
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  };

  // Status badge color
  const statusColor = () => {
    switch (displayStatus) {
      case "nouvelle":  return "bg-amber-100 text-amber-700 border-amber-300";
      case "confirmée": return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "logé":      return "bg-blue-100 text-blue-700 border-blue-300";
      case "annulée":   return "bg-red-100 text-red-700 border-red-300";
      default:          return "bg-secondary text-foreground border-border";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between font-display text-xl">
            <span>{isEdit ? "Modifier la réservation" : "Nouvelle réservation"}</span>
            {displayStatus && (
              <span className={`rounded-full border px-3 py-0.5 text-xs font-medium ${statusColor()}`}>
                {locked && <Lock className="mr-1 inline h-3 w-3" />}
                {RES_STATUS_LABELS[displayStatus]}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {locked ? (
          /* ── READ-ONLY VIEW for logé / annulée ── */
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
              <Lock className="mr-1 inline h-3 w-3" />
              Cette réservation est verrouillée — aucune modification possible.
            </div>
            <ReadOnlyField label="Client"       value={reservation!.name} />
            <ReadOnlyField label="Téléphone"    value={reservation!.phone} />
            <ReadOnlyField label="E-mail"       value={reservation!.email ?? "—"} />
            <ReadOnlyField label="Type"         value={TYPE_LABELS[reservation!.logement_type as LogementType] ?? "—"} />
            <ReadOnlyField label="Personnes"    value={String(reservation!.guests)} />
            <ReadOnlyField label="Arrivée"      value={`${reservation!.arrival_date} à ${reservation!.arrival_time}`} />
            <ReadOnlyField label="Départ"       value={`${reservation!.departure_date} à ${reservation!.departure_time}`} />
            <ReadOnlyField label="Total"        value={formatMoney(reservation!.total_amount ?? 0, residence.currency)} />
            <ReadOnlyField label="Avance"       value={formatMoney(reservation!.advance, residence.currency)} />
            <ReadOnlyField label="Solde"        value={formatMoney(Math.max(0, (reservation!.total_amount ?? 0) - reservation!.advance), residence.currency)} />
            {reservation!.notes && <ReadOnlyField label="Notes" value={reservation!.notes ?? ""} />}
          </div>
        ) : (
          /* ── EDITABLE FORM ── */
          <div className="space-y-5">
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> Champs obligatoires.
            </p>

            {/* Client info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nr-name">Nom complet<Req /></Label>
                <Input id="nr-name" value={form.name} maxLength={120}
                  onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nr-phone">Téléphone<Req /></Label>
                <PhoneInput id="nr-phone" value={form.phone} onChange={(v) => set("phone", v)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nr-email">E-mail</Label>
              <Input id="nr-email" type="email" value={form.email} maxLength={160}
                onChange={(e) => set("email", e.target.value)} />
            </div>

            {/* Type + guests */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type de logement<Req /></Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => {
                      const max = MAX_GUESTS_BY_TYPE[v as LogementType];
                      return {
                        ...f,
                        type: v,
                        guests: String(Math.min(Number(f.guests) || 1, max)),
                        customUnitPrice: "", // reset custom price on type change
                      };
                    })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nr-guests">Nombre de personnes<Req /></Label>
                <Input id="nr-guests" type="number" min={1} max={maxGuests ?? 4}
                  value={form.guests} onChange={(e) => set("guests", e.target.value)}
                  aria-invalid={guestsExceeded} />
                {guestsExceeded && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Maximum {maxGuests} personne(s).
                  </p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date d'arrivée<Req /></Label>
                <DateField id="nr-arrival" lang={lang} value={form.arrival}
                  onChange={(v) => set("arrival", v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Heure d'arrivée<Req /></Label>
                <TimeField id="nr-arrival-time" lang={lang} value={form.arrivalTime}
                  onChange={(v) => set("arrivalTime", v)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date de départ<Req /></Label>
                <DateField id="nr-departure" lang={lang} value={form.departure}
                  onChange={(v) => set("departure", v)} invalid={departureBeforeArrival} />
              </div>
              <div className="space-y-1.5">
                <Label>Heure de départ<Req /></Label>
                <TimeField id="nr-departure-time" lang={lang} value={form.departureTime}
                  onChange={(v) => set("departureTime", v)} invalid={departureBeforeArrival} />
              </div>
            </div>
            {departureBeforeArrival && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Le départ doit suivre l'arrivée.
              </p>
            )}
            {arrivalInPast && !departureBeforeArrival && (
              <p className="flex items-center gap-1.5 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Date d'arrivée dans le passé — saisie rétroactive enregistrée.
              </p>
            )}

            {/* Prix unitaire négociable */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Prix</p>
                {isCustomPrice && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Prix négocié
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Default unit price info */}
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Prix unitaire par défaut</p>
                  <p className="font-mono text-sm font-semibold text-muted-foreground">
                    {formatMoney(defaultUnitPrice, residence.currency)}
                  </p>
                </div>

                {/* Negotiable unit price */}
                <div className="space-y-1.5">
                  <Label htmlFor="nr-unit-price" className="text-xs">
                    Prix unitaire négocié
                  </Label>
                  <Input
                    id="nr-unit-price"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder={String(defaultUnitPrice)}
                    value={form.customUnitPrice}
                    onChange={(e) => set("customUnitPrice", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Laisser vide = prix par défaut
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/50 bg-card p-3 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Unités</p>
                  <p className="font-semibold tabular-nums">{units}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total à payer</p>
                  <p className={`font-semibold tabular-nums ${isCustomPrice ? "text-amber-600" : ""}`}>
                    {formatMoney(total, residence.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Solde restant</p>
                  <p className="font-semibold tabular-nums text-gold">
                    {formatMoney(balance, residence.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Avance */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nr-add-advance">Ajouter une avance</Label>
                <Input id="nr-add-advance" type="number" min={0} inputMode="numeric"
                  value={form.addAdvance} onChange={(e) => set("addAdvance", e.target.value)}
                  placeholder="0" />
                <p className="text-[11px] text-muted-foreground">Montant encaissé maintenant.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Montant avancé total</Label>
                <Input readOnly value={formatMoney(advanceNum, residence.currency)}
                  className="bg-secondary/40 font-semibold" tabIndex={-1} />
                {addedAdvance > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatMoney(baseAdvance, residence.currency)} + {formatMoney(addedAdvance, residence.currency)}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="nr-notes">Notes / message</Label>
              <Textarea id="nr-notes" rows={3} value={form.notes} maxLength={1000}
                onChange={(e) => set("notes", e.target.value)} />
            </div>

            <Button variant="gold" size="lg" className="w-full"
              disabled={busy || guestsExceeded || departureBeforeArrival} onClick={submit}>
              {busy
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <CalendarCheck className="h-5 w-5" />}
              {isEdit ? "Enregistrer les modifications" : "Créer la réservation"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
