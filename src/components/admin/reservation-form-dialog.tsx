import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CalendarCheck, Loader2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  opCreateReservation,
  opUpdateReservation,
} from "@/lib/operations.functions";
import {
  bookingUnitsFrom,
  MAX_GUESTS_BY_TYPE,
  displayReservationStatus,
  isLocked,
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

const KEYS = [
  "op-dashboard",
  "admin-reservations",
  "op-clients",
  "admin-occupancy",
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservation?: EditableReservation | null;
}) {
  const qc        = useQueryClient();
  const residence = useResidence();
  const { lang }  = useLanguage();
  const runCreate = useServerFn(opCreateReservation);
  const runUpdate = useServerFn(opUpdateReservation);
  const isEdit    = !!reservation;

  // Determine if this reservation is locked (logé or annulée)
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

  // Load prices per type
  const { data: priceByType = {} } = useQuery({
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
    name:          "",
    phone:         "",
    email:         "",
    type:          "",
    guests:        "1",
    arrival:       "",
    departure:     "",
    arrivalTime:   DEFAULT_ARRIVAL_TIME,
    departureTime: DEFAULT_DEPARTURE_TIME,
    advance:       "0",
    addAdvance:    "0",
    notes:         "",
    customTotal:   "",   // empty = auto-calculated
  };

  const [form, setForm]   = useState(empty);
  const [busy, setBusy]   = useState(false);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!open) return;
    if (reservation) {
      setForm({
        name:          reservation.name ?? "",
        phone:         reservation.phone ?? "",
        email:         reservation.email ?? "",
        type:          reservation.logement_type ?? "",
        guests:        String(reservation.guests ?? 1),
        arrival:       reservation.arrival_date ?? "",
        departure:     reservation.departure_date ?? "",
        arrivalTime:   (reservation.arrival_time   ?? DEFAULT_ARRIVAL_TIME).slice(0, 5),
        departureTime: (reservation.departure_time ?? DEFAULT_DEPARTURE_TIME).slice(0, 5),
        advance:       String(reservation.advance ?? 0),
        addAdvance:    "0",
        notes:         reservation.notes ?? "",
        // If total was already overridden (>0 and different from auto), pre-fill
        customTotal:   reservation.total_amount && reservation.total_amount > 0
          ? String(reservation.total_amount)
          : "",
      });
    } else {
      setForm(empty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation]);

  const maxGuests    = form.type ? MAX_GUESTS_BY_TYPE[form.type as LogementType] : undefined;
  const guestsNum    = Number(form.guests) || 0;
  const guestsExceeded = maxGuests !== undefined && guestsNum > maxGuests;

  const toDateTime = (date: string, time: string) =>
    date ? new Date(`${date}T${time || "00:00"}:00`) : null;
  const arrivalDT   = toDateTime(form.arrival, form.arrivalTime);
  const departureDT = toDateTime(form.departure, form.departureTime);
  const departureBeforeArrival =
    departureDT !== null && arrivalDT !== null && departureDT <= arrivalDT;

  // Auto-calculated values
  const units = useMemo(() => {
    if (!form.arrival || !form.departure) return 0;
    return bookingUnitsFrom(
      form.arrival,   form.arrivalTime,
      form.departure, form.departureTime,
    );
  }, [form.arrival, form.departure, form.arrivalTime, form.departureTime]);

  const unitPrice  = form.type ? (priceByType[form.type] ?? 0) : 0;
  const autoTotal  = units * unitPrice;

  // If gestionnaire entered a custom total, use it; otherwise use auto
  const customTotalNum = Number(form.customTotal);
  const total = form.customTotal !== "" && customTotalNum >= 0
    ? customTotalNum
    : autoTotal;

  const isCustomPrice = form.customTotal !== "" && customTotalNum !== autoTotal;

  const baseAdvance  = Number(form.advance) || 0;
  const addedAdvance = Number(form.addAdvance) || 0;
  const advanceNum   = baseAdvance + addedAdvance;
  const balance      = Math.max(0, total - advanceNum);

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
      totalAmount:   total > 0 ? total : 0,
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
      await Promise.all(KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Modifier la réservation" : "Nouvelle réservation"}
          </DialogTitle>
        </DialogHeader>

        {locked ? (
          <div className="rounded-xl border border-blue-300/40 bg-blue-50 p-4 text-sm text-blue-700">
            <p className="font-semibold">Réservation verrouillée</p>
            <p className="mt-1 text-xs">
              Cette réservation est marquée <strong>Logé ✓</strong> ou <strong>Annulée</strong> —
              elle ne peut plus être modifiée.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> Champs obligatoires.
            </p>

            {/* Client */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nr-name">Nom complet<Req /></Label>
                <Input id="nr-name" value={form.name} maxLength={120}
                  onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nr-phone">Téléphone<Req /></Label>
                <PhoneInput id="nr-phone" value={form.phone}
                  onChange={(v) => set("phone", v)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nr-email">E-mail</Label>
              <Input id="nr-email" type="email" value={form.email}
                maxLength={160} onChange={(e) => set("email", e.target.value)} />
            </div>

            {/* Type + Guests */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type de logement<Req /></Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => {
                      const max     = MAX_GUESTS_BY_TYPE[v as LogementType];
                      const current = Number(f.guests) || 1;
                      return { ...f, type: v, guests: String(Math.min(current, max)), customTotal: "" };
                    })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>{TYPE_LABELS[type]}</SelectItem>
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
                    Maximum {maxGuests} personne(s) pour ce logement.
                  </p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nr-arrival">Date d'arrivée<Req /></Label>
                <DateField id="nr-arrival" lang={lang} value={form.arrival}
                  onChange={(v) => set("arrival", v)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nr-arrival-time">Heure d'arrivée<Req /></Label>
                <TimeField id="nr-arrival-time" lang={lang} value={form.arrivalTime}
                  onChange={(v) => set("arrivalTime", v)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nr-departure">Date de départ<Req /></Label>
                <DateField id="nr-departure" lang={lang} value={form.departure}
                  onChange={(v) => set("departure", v)}
                  invalid={departureBeforeArrival} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nr-departure-time">Heure de départ<Req /></Label>
                <TimeField id="nr-departure-time" lang={lang} value={form.departureTime}
                  onChange={(v) => set("departureTime", v)}
                  invalid={departureBeforeArrival} />
              </div>
            </div>
            {departureBeforeArrival && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Le départ doit suivre l'arrivée.
              </p>
            )}

            {/* Prix */}
            <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/30 p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Prix</p>
                {isCustomPrice && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Prix négocié
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Auto total (read-only info) */}
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Prix calculé ({units} unité{units > 1 ? "s" : ""} × {formatMoney(unitPrice, residence.currency)})
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {formatMoney(autoTotal, residence.currency)}
                  </p>
                </div>

                {/* Custom total (editable) */}
                <div className="space-y-1.5">
                  <Label htmlFor="nr-custom-total" className="flex items-center gap-1 text-xs">
                    Prix total négocié
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    id="nr-custom-total"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder={String(autoTotal)}
                    value={form.customTotal}
                    onChange={(e) => set("customTotal", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Laisser vide = prix automatique
                  </p>
                </div>
              </div>
            </div>

            {/* Avance */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nr-add-advance">Ajouter une avance (FCFA)</Label>
                <Input id="nr-add-advance" type="number" min={0} inputMode="numeric"
                  value={form.addAdvance} onChange={(e) => set("addAdvance", e.target.value)}
                  placeholder="0" />
                <p className="text-[11px] text-muted-foreground">
                  Montant encaissé maintenant.
                </p>
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

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
              <div>
                <p className="text-[11px] text-muted-foreground">Unités</p>
                <p className="font-semibold tabular-nums">{units}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total à payer</p>
                <p className={`font-semibold tabular-nums ${isCustomPrice ? "text-amber-600" : ""}`}>
                  {formatMoney(total, residence.currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Solde restant</p>
                <p className="font-semibold tabular-nums text-gold">
                  {formatMoney(balance, residence.currency)}
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="nr-notes">Notes / message</Label>
              <Textarea id="nr-notes" rows={3} value={form.notes} maxLength={1000}
                onChange={(e) => set("notes", e.target.value)} />
            </div>

            <Button
              variant="gold"
              size="lg"
              className="w-full"
              disabled={busy || guestsExceeded || departureBeforeArrival}
              onClick={submit}
            >
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
