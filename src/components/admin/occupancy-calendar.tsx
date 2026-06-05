import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ChevronLeft, ChevronRight, AlertTriangle, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { opGetCalendar } from "@/lib/operations.functions";
import { useResidence } from "@/lib/use-residence";
import { displayReservationStatus, isLocked, RES_STATUS_LABELS } from "@/lib/operations";
import {
  ReservationFormDialog, RESERVATION_QUERY_KEYS,
  type EditableReservation,
} from "./reservation-form-dialog";

// ── Constants ────────────────────────────────────────────────────────────
const WINDOW   = 30;   // 30 days visible
const DAY_W    = 44;
const LABEL_W  = 128;
const BLOCK_STATUS = "bloqué";

interface CalUnit {
  id: string; label: string; type: string;
  op_status: string; available: boolean;
}
interface CalRes {
  id: string; ref: string; name: string; phone: string;
  email: string | null; guests: number;
  arrival_date: string; departure_date: string;
  arrival_time: string; departure_time: string;
  status: string; payment_status: string; channel: string;
  logement_unit_id: string | null; unitLabel: string | null;
  logement_type: string | null; unitType: string | null;
  notes: string | null; total: number; paid: number;
  advance: number; balance: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────
const toISO = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
};

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00") - Date.parse(a + "T00:00:00")) / 86_400_000);

function calToEditable(r: CalRes): EditableReservation {
  return {
    id: r.id, name: r.name, phone: r.phone, email: r.email,
    logement_type: r.logement_type, guests: r.guests,
    arrival_date: r.arrival_date, departure_date: r.departure_date,
    arrival_time: r.arrival_time, departure_time: r.departure_time,
    channel: r.channel, advance: r.advance,
    total_amount: r.total, notes: r.notes, status: r.status,
  };
}

/** Bar color class based on display status */
function barClass(r: CalRes): string {
  const arrMs = new Date(`${r.arrival_date}T${r.arrival_time.slice(0, 5)}:00`).getTime();
  const depMs = new Date(`${r.departure_date}T${r.departure_time.slice(0, 5)}:00`).getTime();
  const ds    = displayReservationStatus(r.status, arrMs, depMs);
  switch (ds) {
    case "nouvelle":  return "cal-pending";
    case "confirmée": return "cal-confirmed";
    case "logé":      return "cal-completed";
    case "annulée":   return "cal-cancelled";
    default:          return "cal-pending";
  }
}

// ── Main component ───────────────────────────────────────────────────────
export function OccupancyCalendar() {
  const qc       = useQueryClient();
  const runCal   = useServerFn(opGetCalendar);
  const today    = toISO(new Date());

  const [start,      setStart]      = useState(today);
  const [unitFilter, setUnitFilter] = useState("all");
  const [editing,    setEditing]    = useState<EditableReservation | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["op-calendar"],
    queryFn:  async () => (await runCal()) as { units: CalUnit[]; reservations: CalRes[] },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // ── Real-time sync with reservations table ────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("calendar-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          RESERVATION_QUERY_KEYS.forEach((k) =>
            qc.invalidateQueries({ queryKey: [k] })
          );
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const units        = data?.units ?? [];
  const reservations = data?.reservations ?? [];

  const days = useMemo(
    () => Array.from({ length: WINDOW }, (_, i) => addDays(start, i)),
    [start],
  );

  const visibleUnits = useMemo(
    () => unitFilter === "all" ? units : units.filter((u) => u.type === unitFilter),
    [units, unitFilter],
  );

  // Format helpers
  const fmtDay = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return {
      wd: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      dm: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    };
  };
  const fmtShort = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

  const invalidateAll = () =>
    Promise.all(RESERVATION_QUERY_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  const trackW = WINDOW * DAY_W;

  return (
    <div className="space-y-4">

      {/* Header + Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Unit type filter */}
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les logements</SelectItem>
            <SelectItem value="chambre">Chambres seulement</SelectItem>
            <SelectItem value="studio">Studios seulement</SelectItem>
            <SelectItem value="appartement">Appartement seulement</SelectItem>
          </SelectContent>
        </Select>

        {/* Navigation */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm"
            onClick={() => setStart(addDays(start, -WINDOW))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStart(today)}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => setStart(addDays(start, WINDOW))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <LegendDot cls="cal-dot-pending"   label="En attente" />
        <LegendDot cls="cal-dot-confirmed" label="Confirmée" />
        <LegendDot cls="cal-dot-completed" label="Logé ✓" />
        <LegendDot cls="cal-dot-maintenance" label="Annulée" />
      </div>

      {/* Calendar grid */}
      {visibleUnits.length === 0 ? (
        <p className="text-muted-foreground">Aucune unité disponible.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <div style={{ minWidth: LABEL_W + trackW }}>

            {/* Header row — dates */}
            <div className="flex border-b border-border/60 bg-card">
              <div className="sticky left-0 z-20 shrink-0 bg-card px-3 py-2 text-xs font-medium text-muted-foreground"
                style={{ width: LABEL_W }}>
                {fmtShort(days[0])} – {fmtShort(days[WINDOW - 1])}
              </div>
              {days.map((d) => {
                const f       = fmtDay(d);
                const isToday = d === today;
                const isSun   = new Date(d + "T00:00:00").getDay() === 0;
                return (
                  <div key={d}
                    className={`shrink-0 border-l border-border/50 py-1 text-center ${
                      isToday ? "bg-gold/15 font-semibold text-gold"
                      : isSun  ? "bg-secondary/40 text-muted-foreground"
                               : "text-muted-foreground"
                    }`}
                    style={{ width: DAY_W }}>
                    <div className="text-[9px] capitalize leading-tight">{f.wd}</div>
                    <div className="text-[10px] leading-tight">{f.dm}</div>
                  </div>
                );
              })}
            </div>

            {/* Unit rows */}
            {visibleUnits.map((unit) => {
              const maint = unit.op_status === "maintenance" || unit.op_status === "bloquee";

              // Only show non-cancelled reservations on calendar
              const bars = reservations
                .filter((r) =>
                  r.logement_unit_id === unit.id &&
                  r.status !== "annulée" &&
                  r.status !== BLOCK_STATUS
                )
                .map((r) => {
                  const startIdx = Math.max(0, dayDiff(start, r.arrival_date));
                  const endIdx   = Math.min(WINDOW, dayDiff(start, r.departure_date));
                  return { r, startIdx, endIdx };
                })
                .filter((b) => b.endIdx > b.startIdx && b.startIdx < WINDOW && b.endIdx > 0);

              return (
                <div key={unit.id} className="flex border-b border-border/40 last:border-b-0">
                  {/* Unit label */}
                  <div className="sticky left-0 z-20 flex shrink-0 items-center gap-1.5 bg-card px-3 py-2 text-sm font-medium"
                    style={{ width: LABEL_W }}>
                    {maint && <Wrench className="h-3.5 w-3.5 text-destructive" />}
                    <span className="truncate">{unit.label}</span>
                  </div>

                  {/* Day cells + bars */}
                  <div className="relative" style={{ width: trackW, height: 48 }}>
                    {/* Background cells */}
                    <div className="absolute inset-0 flex">
                      {days.map((d) => {
                        const isSun   = new Date(d + "T00:00:00").getDay() === 0;
                        const isToday = d === today;
                        return (
                          <div key={d}
                            className={`shrink-0 border-l border-border/40 ${
                              maint   ? "cal-maintenance opacity-30"
                              : isSun ? "bg-secondary/30"
                              : "cal-free"
                            } ${isToday ? "ring-1 ring-inset ring-gold/40" : ""}`}
                            style={{ width: DAY_W }} />
                        );
                      })}
                    </div>

                    {/* Reservation bars */}
                    {bars.map(({ r, startIdx, endIdx }) => {
                      const locked     = isLocked(displayReservationStatus(
                        r.status,
                        new Date(`${r.arrival_date}T${r.arrival_time.slice(0, 5)}:00`).getTime(),
                        new Date(`${r.departure_date}T${r.departure_time.slice(0, 5)}:00`).getTime(),
                      ));
                      return (
                        <button key={r.id} type="button"
                          onClick={() => setEditing(calToEditable(r))}
                          className={`absolute top-1 bottom-1 flex flex-col justify-center overflow-hidden rounded-md px-1.5 text-left shadow-sm transition hover:brightness-105 ${barClass(r)}`}
                          style={{
                            left:  startIdx * DAY_W + 2,
                            width: (endIdx - startIdx) * DAY_W - 4,
                          }}
                          title={`${r.name} · ${fmtShort(r.arrival_date)} → ${fmtShort(r.departure_date)}`}>
                          <span className="flex items-center gap-1 truncate text-[11px] font-semibold leading-tight">
                            {locked && "🔒 "}
                            {r.name}
                          </span>
                          <span className="truncate text-[10px] leading-tight opacity-90">
                            {fmtShort(r.arrival_date)} → {fmtShort(r.departure_date)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit dialog — same as Reservations tab */}
      <ReservationFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        reservation={editing}
        onSaved={invalidateAll}
      />
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${cls}`} /> {label}
    </span>
  );
}
