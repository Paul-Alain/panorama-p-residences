import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Lock,
  AlertTriangle,
  Phone,
  Mail,
  User,
  CalendarDays,
  Clock,
  Home,
  CreditCard,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/language-context";
import { supabase } from "@/integrations/supabase/client";
import { opGetCalendar } from "@/lib/operations.functions";
import { exportMonthlyOccupancyPdf, type MonthlyOccupancyRow } from "@/lib/admin-export";
import { useResidence } from "@/lib/use-residence";
import { formatMoney } from "@/lib/format";
import {
  ReservationFormDialog,
  type EditableReservation,
} from "./reservation-form-dialog";

/** Map a calendar reservation to the shape the edit dialog expects. */
function calToEditable(r: CalRes): EditableReservation {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    logement_type: r.logement_type,
    guests: r.guests,
    arrival_date: r.arrival_date,
    departure_date: r.departure_date,
    arrival_time: r.arrival_time,
    departure_time: r.departure_time,
    channel: r.channel,
    advance: r.advance,
    notes: r.notes,
  };
}

interface CalUnit {
  id: string;
  label: string;
  type: string;
  op_status: string;
  available: boolean;
}
interface CalRes {
  id: string;
  ref: string;
  name: string;
  phone: string;
  email: string | null;
  guests: number;
  arrival_date: string;
  departure_date: string;
  arrival_time: string;
  departure_time: string;
  status: string;
  payment_status: string;
  channel: string;
  logement_unit_id: string | null;
  unitLabel: string | null;
  logement_type: string | null;
  unitType: string | null;
  notes: string | null;
  total: number;
  paid: number;
  advance: number;
  balance: number;
}

const BLOCK_STATUS = "bloqué";
const WINDOW = 14;
const DAY_W = 48;
const LABEL_W = 132;
const ACTIVE = ["nouvelle", "confirmée", "checkin"];

const toISO = (d: Date) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00") - Date.parse(a + "T00:00:00")) / 86_400_000);

export function OccupancyCalendar() {
  const { t, lang } = useLanguage();
  const o = t.admin.dash.occupancy;
  const c = o.cal;
  const ex = t.admin.dash.exports;
  const statusLabels = t.admin.dash.reservationStatus as Record<string, string>;
  const residence = useResidence();
  const qc = useQueryClient();
  const runCal = useServerFn(opGetCalendar);

  const today = toISO(new Date());
  const [start, setStart] = useState(today);
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<EditableReservation | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["op-calendar"],
    queryFn: async () =>
      (await runCal()) as { units: CalUnit[]; reservations: CalRes[] },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Real-time sync — any reservation/payment change refreshes the calendar
  useEffect(() => {
    const ch = supabase
      .channel("occupancy-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          qc.invalidateQueries({ queryKey: ["op-calendar"] });
          qc.invalidateQueries({ queryKey: ["op-dashboard"] });
          qc.invalidateQueries({ queryKey: ["admin-reservations"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          qc.invalidateQueries({ queryKey: ["op-calendar"] });
          qc.invalidateQueries({ queryKey: ["op-dashboard"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const units = data?.units ?? [];
  const reservations = data?.reservations ?? [];

  const days = useMemo(
    () => Array.from({ length: WINDOW }, (_, i) => addDays(start, i)),
    [start],
  );

  const visibleUnits = useMemo(
    () => (unitFilter === "all" ? units : units.filter((u) => u.type === unitFilter)),
    [units, unitFilter],
  );

  // Conflict set: overlapping non-cancelled/non-completed reservations on a unit
  const conflictIds = useMemo(() => {
    const set = new Set<string>();
    for (const u of units) {
      const act = reservations.filter(
        (r) =>
          r.logement_unit_id === u.id &&
          !["annulée", "terminée", BLOCK_STATUS].includes(r.status),
      );
      for (let i = 0; i < act.length; i++) {
        for (let j = i + 1; j < act.length; j++) {
          const a = act[i];
          const b = act[j];
          if (a.arrival_date < b.departure_date && b.arrival_date < a.departure_date) {
            set.add(a.id);
            set.add(b.id);
          }
        }
      }
    }
    return set;
  }, [reservations, units]);

  const statusOk = (r: CalRes) =>
    statusFilter === "all" ? r.status !== "annulée" : r.status === statusFilter;

  const barClass = (r: CalRes) => {
    if (conflictIds.has(r.id)) return "cal-conflict";
    switch (r.status) {
      case "nouvelle":
        return "cal-pending";
      case "confirmée":
        return "cal-confirmed";
      case "checkin":
        return "cal-occupied";
      case "terminée":
        return "cal-completed";
      case BLOCK_STATUS:
        return "cal-maintenance";
      default:
        return "cal-cancelled";
    }
  };

  // Summary occupancy by type (today)
  const summary = useMemo(() => {
    const types = ["chambre", "studio", "appartement"] as const;
    const labelOf: Record<string, string> = {
      chambre: c.rooms,
      studio: c.studios,
      appartement: c.apartments,
    };
    const rows = types
      .map((type) => {
        const us = units.filter((u) => u.type === type);
        if (us.length === 0) return null;
        const occ = us.filter((u) =>
          reservations.some(
            (r) =>
              r.logement_unit_id === u.id &&
              ACTIVE.includes(r.status) &&
              r.status !== "nouvelle" &&
              r.arrival_date <= today &&
              r.departure_date > today,
          ),
        ).length;
        return { label: labelOf[type], occ, total: us.length };
      })
      .filter(Boolean) as { label: string; occ: number; total: number }[];
    const occTotal = rows.reduce((s, r) => s + r.occ, 0);
    const total = rows.reduce((s, r) => s + r.total, 0);
    return { rows, occTotal, total };
  }, [units, reservations, today, c]);

  const fmtDayNum = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return {
      wd: d.toLocaleDateString(lang, { weekday: "short" }),
      dm: d.toLocaleDateString(lang, { day: "2-digit", month: "2-digit" }),
    };
  };
  const fmtShort = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(lang, { day: "2-digit", month: "2-digit" });
  };
  const fmtLong = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(lang, { day: "2-digit", month: "long", year: "numeric" });
  };

  const exportMonthly = async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const msIso = toISO(monthStart);
    const meIso = toISO(monthEnd);
    const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / 86_400_000);
    const overlap = (a: string, d: string) => {
      const s = a > msIso ? a : msIso;
      const e = d < meIso ? d : meIso;
      return e > s ? dayDiff(s, e) : 0;
    };
    const rows: MonthlyOccupancyRow[] = units.map((u) => {
      const occ = reservations
        .filter((r) => r.logement_unit_id === u.id && r.status !== "annulée" && r.status !== BLOCK_STATUS)
        .reduce((sum, r) => sum + overlap(r.arrival_date, r.departure_date), 0);
      return {
        unit: u.label,
        occupiedNights: occ,
        totalNights: daysInMonth,
        rate: daysInMonth > 0 ? Math.round((occ / daysInMonth) * 100) : 0,
      };
    });
    const totalOcc = rows.reduce((s, r) => s + r.occupiedNights, 0);
    const capacity = units.length * daysInMonth;
    const overall = capacity > 0 ? Math.round((totalOcc / capacity) * 100) : 0;
    const monthLabel = now.toLocaleDateString(lang, { month: "long", year: "numeric" });
    await exportMonthlyOccupancyPdf(monthLabel, rows, overall, ex);
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  const trackW = WINDOW * DAY_W;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            {o.title}
            <Badge variant="secondary" className="gap-1 font-normal">
              <Lock className="h-3 w-3" /> {c.readOnly}
            </Badge>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.readOnlyNote}</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportMonthly}>
          <FileDown className="h-4 w-4" /> {ex.monthly}
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-border/60 bg-card p-3 shadow-soft">
            <p className="text-xs text-muted-foreground">{row.label}</p>
            <p className="mt-0.5 font-display text-lg font-semibold">
              {row.occ}/{row.total}{" "}
              <span className="text-xs font-normal text-muted-foreground">{c.occupied}</span>
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-3 shadow-soft">
          <p className="text-xs text-muted-foreground">{c.totalOccupancy}</p>
          <p className="mt-0.5 font-display text-lg font-semibold text-gold">
            {summary.occTotal}/{summary.total}{" "}
            <span className="text-xs font-normal text-muted-foreground">{c.occupied}</span>
          </p>
        </div>
      </div>

      {/* Filters + navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{c.allUnits}</SelectItem>
            <SelectItem value="chambre">{c.roomsOnly}</SelectItem>
            <SelectItem value="studio">{c.studiosOnly}</SelectItem>
            <SelectItem value="appartement">{c.apartmentsOnly}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{c.allStatuses}</SelectItem>
            <SelectItem value="nouvelle">{statusLabels.nouvelle}</SelectItem>
            <SelectItem value="confirmée">{statusLabels.confirmée}</SelectItem>
            <SelectItem value="checkin">{statusLabels.checkin}</SelectItem>
            <SelectItem value="terminée">{statusLabels.terminée}</SelectItem>
            <SelectItem value="annulée">{statusLabels.annulée}</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <LegendDot cls="cal-dot-free" label={c.legendFree} />
        <LegendDot cls="cal-dot-pending" label={c.legendPending} />
        <LegendDot cls="cal-dot-confirmed" label={c.legendConfirmed} />
        <LegendDot cls="cal-dot-maintenance" label={c.legendMaintenance} />
        <LegendDot cls="cal-dot-conflict" label={c.legendConflict} />
        <LegendDot cls="cal-dot-completed" label={c.legendCompleted} />
      </div>

      {/* Calendar grid */}
      {visibleUnits.length === 0 ? (
        <p className="text-muted-foreground">{o.none}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <div style={{ minWidth: LABEL_W + trackW }}>
            {/* Header row */}
            <div className="flex border-b border-border/60 bg-card">
              <div
                className="sticky left-0 z-20 shrink-0 bg-card px-3 py-2 text-sm font-medium"
                style={{ width: LABEL_W }}
              >
                {fmtShort(days[0])} – {fmtShort(days[WINDOW - 1])}
              </div>
              {days.map((d) => {
                const f = fmtDayNum(d);
                const isToday = d === today;
                return (
                  <div
                    key={d}
                    className={`shrink-0 border-l border-border/50 py-1.5 text-center ${
                      isToday ? "bg-gold/15 font-semibold text-gold" : "text-muted-foreground"
                    }`}
                    style={{ width: DAY_W }}
                  >
                    <div className="text-[10px] capitalize leading-tight">{f.wd}</div>
                    <div className="text-[11px] leading-tight">{f.dm}</div>
                  </div>
                );
              })}
            </div>

            {/* Unit rows */}
            {visibleUnits.map((unit) => {
              const maint = unit.op_status === "maintenance" || unit.op_status === "bloquee";
              const bars = reservations
                .filter((r) => r.logement_unit_id === unit.id && statusOk(r))
                .map((r) => {
                  const startIdx = Math.max(0, dayDiff(start, r.arrival_date));
                  const endIdx = Math.min(WINDOW, dayDiff(start, r.departure_date));
                  return { r, startIdx, endIdx };
                })
                .filter((b) => b.endIdx > b.startIdx && b.startIdx < WINDOW && b.endIdx > 0);
              return (
                <div key={unit.id} className="flex border-b border-border/40 last:border-b-0">
                  <div
                    className="sticky left-0 z-20 flex shrink-0 items-center gap-1.5 bg-card px-3 py-2 text-sm font-medium"
                    style={{ width: LABEL_W }}
                  >
                    {maint && <Wrench className="h-3.5 w-3.5 text-destructive" />}
                    <span className="truncate">{unit.label}</span>
                  </div>
                  <div className="relative" style={{ width: trackW, height: 52 }}>
                    {/* Background day cells */}
                    <div className="absolute inset-0 flex">
                      {days.map((d) => (
                        <div
                          key={d}
                          className={`shrink-0 border-l border-border/40 ${
                            maint ? "cal-maintenance opacity-40" : "cal-free"
                          } ${d === today ? "ring-1 ring-inset ring-gold/40" : ""}`}
                          style={{ width: DAY_W }}
                        />
                      ))}
                    </div>
                    {/* Reservation bars */}
                    {bars.map(({ r, startIdx, endIdx }) => {
                      const conflict = conflictIds.has(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelected(r)}
                          className={`absolute top-1 bottom-1 flex flex-col justify-center overflow-hidden rounded-md px-1.5 text-left shadow-sm transition hover:brightness-105 ${barClass(
                            r,
                          )}`}
                          style={{
                            left: startIdx * DAY_W + 2,
                            width: (endIdx - startIdx) * DAY_W - 4,
                          }}
                          title={`${r.name} · ${fmtShort(r.arrival_date)} → ${fmtShort(r.departure_date)}`}
                        >
                          <span className="flex items-center gap-1 truncate text-[11px] font-semibold leading-tight">
                            {conflict && <AlertTriangle className="h-3 w-3 shrink-0" />}
                            {r.status === BLOCK_STATUS ? o.blocked : r.name}
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

      {/* Read-only detail panel */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          {selected && (
            <ReadOnlyPanel
              r={selected}
              c={c}
              o={o}
              statusLabels={statusLabels}
              currency={residence.currency}
              conflict={conflictIds.has(selected.id)}
              fmtLong={fmtLong}
            />
          )}
        </DialogContent>
      </Dialog>
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

function ReadOnlyPanel({
  r,
  c,
  o,
  statusLabels,
  currency,
  conflict,
  fmtLong,
}: {
  r: CalRes;
  c: Record<string, string>;
  o: Record<string, any>;
  statusLabels: Record<string, string>;
  currency: string;
  conflict: boolean;
  fmtLong: (iso: string) => string;
}) {
  const isBlock = r.status === BLOCK_STATUS;
  const payTone =
    r.payment_status === "paye"
      ? "text-emerald-600"
      : r.paid > 0
        ? "text-orange-600"
        : "text-destructive";
  const payLabel =
    r.payment_status === "paye" || (r.total > 0 && r.paid >= r.total)
      ? c.payPaid
      : r.paid > 0
        ? c.payPartial
        : c.payUnpaid;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-display text-lg">
          {isBlock ? (
            <>
              <Wrench className="h-4 w-4 text-destructive" /> {o.blocked}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-muted-foreground" /> {r.name}
            </>
          )}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 text-sm">
        {conflict && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{c.conflictTitle}</p>
              <p className="text-xs opacity-90">{c.conflictWarning}</p>
            </div>
          </div>
        )}

        {!isBlock && (
          <Section title={c.clientInfo} icon={<User className="h-3.5 w-3.5" />}>
            <Row label={c.fullName} value={r.name} />
            <Row label={o.phone} value={r.phone} icon={<Phone className="h-3.5 w-3.5" />} />
            {r.email && <Row label="Email" value={r.email} icon={<Mail className="h-3.5 w-3.5" />} />}
          </Section>
        )}

        <Section title={c.stayInfo} icon={<CalendarDays className="h-3.5 w-3.5" />}>
          <Row label={c.accommodationUnit} value={r.unitLabel ?? c.noUnit} icon={<Home className="h-3.5 w-3.5" />} />
          {!isBlock && r.logement_type && <Row label={c.accommodationType} value={r.logement_type} />}
          <Row label={c.arrivalDate} value={fmtLong(r.arrival_date)} />
          <Row label={c.arrivalTime} value={r.arrival_time} icon={<Clock className="h-3.5 w-3.5" />} />
          <Row label={c.departureDate} value={fmtLong(r.departure_date)} />
          <Row label={c.departureTime} value={r.departure_time} icon={<Clock className="h-3.5 w-3.5" />} />
        </Section>

        {!isBlock && (
          <>
            <Section title={c.paymentInfo} icon={<CreditCard className="h-3.5 w-3.5" />}>
              <Row label={c.totalAmount} value={formatMoney(r.total, currency)} />
              <Row label={c.amountPaid} value={formatMoney(r.paid, currency)} />
              <Row label={c.remainingBalance} value={formatMoney(r.balance, currency)} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">{o.status}</span>
                <Badge variant="outline" className={payTone}>
                  {payLabel}
                </Badge>
              </div>
            </Section>

            <Section title={c.reservationStatusTitle} icon={<CalendarDays className="h-3.5 w-3.5" />}>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{o.status}</span>
                <Badge>{statusLabels[r.status] ?? r.status}</Badge>
              </div>
            </Section>
          </>
        )}

        <p className="flex items-center gap-1.5 rounded-lg bg-secondary/50 p-2.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" /> {c.readOnlyNote}
        </p>
      </div>
    </>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-right font-medium">
        {icon}
        {value}
      </span>
    </div>
  );
}
