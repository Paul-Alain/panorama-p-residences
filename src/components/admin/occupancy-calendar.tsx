import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/language-context";
import { adminGetOccupancy, adminAssignReservationUnit } from "@/lib/admin.functions";

interface OccUnit {
  id: string;
  label: string;
  available: boolean;
  type: string;
}
interface OccReservation {
  id: string;
  name: string;
  arrival_date: string;
  departure_date: string;
  status: string;
  logement_unit_id: string | null;
  logement_type: string | null;
}

const WINDOW = 14;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export function OccupancyCalendar() {
  const { t, lang } = useLanguage();
  const o = t.admin.dash.occupancy;
  const qc = useQueryClient();
  const runOcc = useServerFn(adminGetOccupancy);
  const runAssign = useServerFn(adminAssignReservationUnit);

  const today = toISO(new Date());
  const [start, setStart] = useState(today);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-occupancy"],
    queryFn: async () =>
      (await runOcc()) as { units: OccUnit[]; reservations: OccReservation[] },
  });

  const days = useMemo(
    () => Array.from({ length: WINDOW }, (_, i) => addDays(start, i)),
    [start],
  );

  const units = data?.units ?? [];
  const reservations = data?.reservations ?? [];

  /** A reservation occupies [arrival, departure): blocks arrival..departure-1. */
  const isBooked = (unitId: string, day: string) =>
    reservations.some(
      (r) =>
        r.logement_unit_id === unitId &&
        r.arrival_date <= day &&
        r.departure_date > day,
    );

  const guestFor = (unitId: string, day: string) =>
    reservations.find(
      (r) =>
        r.logement_unit_id === unitId &&
        r.arrival_date <= day &&
        r.departure_date > day,
    )?.name;

  const unassigned = useMemo(
    () => reservations.filter((r) => !r.logement_unit_id && r.departure_date >= today),
    [reservations, today],
  );

  const fmtDay = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(lang, { day: "2-digit", month: "short" });
  };
  const fmtShort = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(lang, { day: "2-digit", month: "2-digit" });
  };

  const assign = async (reservationId: string, unitId: string) => {
    setAssigningId(reservationId);
    try {
      await runAssign({ data: { reservationId, unitId } });
      await qc.invalidateQueries({ queryKey: ["admin-occupancy"] });
      toast.success(o.assigned);
    } catch {
      toast.error("Erreur");
    }
    setAssigningId(null);
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{o.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{o.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStart(addDays(start, -WINDOW))}>
            <ChevronLeft className="h-4 w-4" /> {o.prev}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStart(today)}>
            {o.today}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStart(addDays(start, WINDOW))}>
            {o.next} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-border bg-secondary/40" /> {o.free}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-gold" /> {o.booked}
        </span>
      </div>

      {units.length === 0 ? (
        <p className="text-muted-foreground">{o.none}</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background p-2 text-left font-medium">
                  {fmtDay(days[0])} – {fmtDay(days[WINDOW - 1])}
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className={`min-w-[42px] p-1.5 text-center text-[11px] font-medium ${
                      d === today ? "text-gold" : "text-muted-foreground"
                    }`}
                  >
                    {fmtShort(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-background py-1.5 pr-3 font-medium">
                    {unit.label}
                  </td>
                  {days.map((d) => {
                    const booked = isBooked(unit.id, d);
                    return (
                      <td key={d} className="p-0.5">
                        <div
                          title={booked ? guestFor(unit.id, d) : undefined}
                          className={`h-7 rounded-sm ${
                            booked
                              ? "bg-gold"
                              : d === today
                                ? "bg-secondary/70"
                                : "bg-secondary/30"
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unassigned reservations */}
      {unassigned.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">{o.unassigned}</h3>
          <div className="space-y-2">
            {unassigned.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-muted-foreground">
                    {fmtDay(r.arrival_date)} → {fmtDay(r.departure_date)}
                    {r.logement_type ? ` · ${r.logement_type}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(v) => assign(r.id, v)}
                    disabled={assigningId === r.id}
                  >
                    <SelectTrigger className="h-9 w-44">
                      <SelectValue placeholder={o.assignPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {[...units]
                        .sort((a, b) => {
                          const am = r.logement_type && a.type === r.logement_type ? 0 : 1;
                          const bm = r.logement_type && b.type === r.logement_type ? 0 : 1;
                          return am - bm;
                        })
                        .map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {assigningId === r.id && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
