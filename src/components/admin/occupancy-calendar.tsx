import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Wrench, FileDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  adminGetOccupancy,
  adminAssignReservationUnit,
  adminUpdateReservationStatus,
  adminUpdateReservationDates,
  adminBlockDates,
  adminUnblockDates,
} from "@/lib/admin.functions";
import { exportMonthlyOccupancyPdf, type MonthlyOccupancyRow } from "@/lib/admin-export";

interface OccUnit {
  id: string;
  label: string;
  available: boolean;
  type: string;
}
interface OccReservation {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  guests: number;
  arrival_date: string;
  departure_date: string;
  status: string;
  logement_unit_id: string | null;
  logement_type: string | null;
  message: string | null;
}

const BLOCK_STATUS = "bloqué";
const STATUSES = ["nouvelle", "confirmée", "terminée", "annulée"] as const;
const WINDOW = 14;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const nightsBetween = (a: string, d: string) =>
  Math.max(0, Math.round((Date.parse(d) - Date.parse(a)) / 86_400_000));

export function OccupancyCalendar() {
  const { t, lang } = useLanguage();
  const o = t.admin.dash.occupancy;
  const ex = t.admin.dash.exports;
  const statusLabels = t.admin.dash.reservationStatus as Record<string, string>;
  const qc = useQueryClient();

  const runOcc = useServerFn(adminGetOccupancy);
  const runAssign = useServerFn(adminAssignReservationUnit);
  const runStatus = useServerFn(adminUpdateReservationStatus);
  const runDates = useServerFn(adminUpdateReservationDates);
  const runBlock = useServerFn(adminBlockDates);
  const runUnblock = useServerFn(adminUnblockDates);

  const today = toISO(new Date());
  const [start, setStart] = useState(today);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Selected reservation (quick actions dialog)
  const [selected, setSelected] = useState<OccReservation | null>(null);
  const [editArrival, setEditArrival] = useState("");
  const [editDeparture, setEditDeparture] = useState("");

  // Block dialog
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockUnit, setBlockUnit] = useState("");
  const [blockFrom, setBlockFrom] = useState(today);
  const [blockTo, setBlockTo] = useState(addDays(today, 1));
  const [blockReason, setBlockReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-occupancy"],
    queryFn: async () =>
      (await runOcc()) as { units: OccUnit[]; reservations: OccReservation[] },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (selected) {
      setEditArrival(selected.arrival_date);
      setEditDeparture(selected.departure_date);
    }
  }, [selected]);

  const days = useMemo(
    () => Array.from({ length: WINDOW }, (_, i) => addDays(start, i)),
    [start],
  );

  const units = data?.units ?? [];
  const reservations = data?.reservations ?? [];

  const resFor = (unitId: string, day: string) =>
    reservations.find(
      (r) =>
        r.logement_unit_id === unitId &&
        r.arrival_date <= day &&
        r.departure_date > day,
    );

  /** Visual state of a cell. */
  const cellState = (r: OccReservation | undefined, day: string) => {
    if (!r) return day === today ? "today" : "free";
    if (r.status === BLOCK_STATUS) return "blocked";
    if (r.arrival_date <= today && r.departure_date > today) return "occupied";
    return "reserved";
  };

  const stateClass: Record<string, string> = {
    free: "bg-secondary/30 hover:bg-secondary/50",
    today: "bg-secondary/70",
    reserved: "bg-gold/45 hover:bg-gold/60",
    occupied: "bg-gold hover:bg-gold/90",
    blocked:
      "bg-destructive/70 hover:bg-destructive [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.25)_3px,rgba(255,255,255,0.25)_6px)]",
  };

  const unassigned = useMemo(
    () =>
      reservations.filter(
        (r) =>
          !r.logement_unit_id &&
          r.status !== BLOCK_STATUS &&
          r.departure_date >= today,
      ),
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
  const fmtStatus = (s: string) => statusLabels[s] ?? s;

  const assign = async (reservationId: string, unitId: string) => {
    setAssigningId(reservationId);
    try {
      await runAssign({ data: { reservationId, unitId } });
      await qc.invalidateQueries({ queryKey: ["admin-occupancy"] });
      toast.success(o.assigned);
    } catch {
      toast.error(o.error);
    }
    setAssigningId(null);
  };

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-occupancy"] }),
      qc.invalidateQueries({ queryKey: ["admin-kpis"] }),
      qc.invalidateQueries({ queryKey: ["admin-reservations"] }),
      qc.invalidateQueries({ queryKey: ["admin-stats"] }),
    ]);
  };

  const changeStatus = async (next: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await runStatus({ data: { id: selected.id, status: next as typeof STATUSES[number] } });
      await refresh();
      toast.success(o.saved);
      setSelected(null);
    } catch {
      toast.error(o.error);
    }
    setBusy(false);
  };

  const saveDates = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await runDates({ data: { id: selected.id, arrival: editArrival, departure: editDeparture } });
      await refresh();
      toast.success(o.saved);
      setSelected(null);
    } catch {
      toast.error(o.error);
    }
    setBusy(false);
  };

  const reassign = async (unitId: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await runAssign({ data: { reservationId: selected.id, unitId } });
      await refresh();
      toast.success(o.saved);
      setSelected(null);
    } catch {
      toast.error(o.error);
    }
    setBusy(false);
  };

  const unblock = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await runUnblock({ data: { id: selected.id } });
      await refresh();
      toast.success(o.unblocked);
      setSelected(null);
    } catch {
      toast.error(o.error);
    }
    setBusy(false);
  };

  const submitBlock = async () => {
    if (!blockUnit) return;
    setBusy(true);
    try {
      await runBlock({
        data: {
          unitId: blockUnit,
          arrival: blockFrom,
          departure: blockTo,
          reason: blockReason || undefined,
        },
      });
      await refresh();
      toast.success(o.blockedToast);
      setBlockOpen(false);
      setBlockReason("");
    } catch {
      toast.error(o.error);
    }
    setBusy(false);
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
      return e > s ? nightsBetween(s, e) : 0;
    };

    const rows: MonthlyOccupancyRow[] = units.map((u) => {
      const occ = reservations
        .filter((r) => r.logement_unit_id === u.id && r.status !== "annulée")
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{o.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{o.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportMonthly}>
            <FileDown className="h-4 w-4" /> {o.monthlyReport ?? ex.monthly}
          </Button>
          <Button variant="gold" size="sm" onClick={() => setBlockOpen(true)}>
            <Wrench className="h-4 w-4" /> {o.block}
          </Button>
        </div>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-border bg-secondary/40" /> {o.free}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-gold/45" /> {o.reserved}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-gold" /> {o.occupied}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-destructive/70" /> {o.blocked}
        </span>
      </div>

      {units.length === 0 ? (
        <p className="text-muted-foreground">{o.none}</p>
      ) : (
        <TooltipProvider delayDuration={150}>
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
                      const r = resFor(unit.id, d);
                      const state = cellState(r, d);
                      const cell = (
                        <div className={`h-7 rounded-sm ${stateClass[state]}`} />
                      );
                      if (!r) {
                        return (
                          <td key={d} className="p-0.5">
                            {cell}
                          </td>
                        );
                      }
                      return (
                        <td key={d} className="p-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setSelected(r)}
                                className="block w-full"
                                aria-label={r.name}
                              >
                                {cell}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{r.name}</p>
                              {r.status !== BLOCK_STATUS && r.phone !== "—" && (
                                <p className="text-xs">{r.phone}</p>
                              )}
                              <p className="text-xs">
                                {fmtDay(r.arrival_date)} → {fmtDay(r.departure_date)}
                              </p>
                              <p className="text-xs opacity-80">{fmtStatus(r.status)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
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
                  <Select onValueChange={(v) => assign(r.id, v)} disabled={assigningId === r.id}>
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

      {/* Quick-actions dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.status === BLOCK_STATUS ? (
                    <>
                      <Wrench className="h-4 w-4 text-destructive" /> {selected.name}
                    </>
                  ) : (
                    o.details
                  )}
                </DialogTitle>
              </DialogHeader>

              {selected.status === BLOCK_STATUS ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {fmtDay(selected.arrival_date)} → {fmtDay(selected.departure_date)}
                  </p>
                  <Button variant="destructive" onClick={unblock} disabled={busy} className="w-full">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {o.unblock}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Guest info */}
                  <div className="rounded-lg bg-secondary/40 p-3 text-sm">
                    <p className="font-medium">{selected.name}</p>
                    <p className="text-muted-foreground">
                      {o.phone}: {selected.phone}
                      {selected.email ? ` · ${selected.email}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {selected.guests} {t.admin.dash.reservations.guests} ·{" "}
                      <Badge variant="outline">{fmtStatus(selected.status)}</Badge>
                    </p>
                    {selected.message && selected.message !== "MAINTENANCE" && (
                      <p className="mt-1.5 text-muted-foreground">{selected.message}</p>
                    )}
                  </div>

                  {/* Change status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{o.changeStatus}</Label>
                    <Select value={selected.status} onValueChange={changeStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {fmtStatus(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reassign unit */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{o.reassign}</Label>
                    <Select
                      value={selected.logement_unit_id ?? undefined}
                      onValueChange={reassign}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={o.assignPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Edit dates */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{o.editDates}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={editArrival}
                        onChange={(e) => setEditArrival(e.target.value)}
                      />
                      <Input
                        type="date"
                        value={editDeparture}
                        onChange={(e) => setEditDeparture(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={saveDates}
                      disabled={busy || editDeparture <= editArrival}
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {o.save}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Block dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{o.blockTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{o.unit}</Label>
              <Select value={blockUnit} onValueChange={setBlockUnit}>
                <SelectTrigger>
                  <SelectValue placeholder={o.assignPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{o.arrival}</Label>
                <Input type="date" value={blockFrom} onChange={(e) => setBlockFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{o.departure}</Label>
                <Input type="date" value={blockTo} onChange={(e) => setBlockTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{o.reason}</Label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>
              {o.cancel}
            </Button>
            <Button
              variant="gold"
              onClick={submitBlock}
              disabled={busy || !blockUnit || blockTo <= blockFrom}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {o.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
