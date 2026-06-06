import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { Loader2, AlertTriangle, CheckCircle2, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { opGetDashboard, opGetRevenueAnalytics } from "@/lib/operations.functions";
import { formatMoney, formatDateFr } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";
import { nowCam, dateTimeMsCam, todayCam } from "@/lib/cameroun-time";
import { displayReservationStatus } from "@/lib/operations";

// ── Types ────────────────────────────────────────────────────────────────
type FilterMode  = "month-year" | "custom";
type StatusKey   = "all" | "confirmée" | "logé" | "annulée";
type MetricKey   = "revenue" | "count" | "encaisse" | "solde";

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: "all",       label: "Tous (hors annulés)" },
  { value: "confirmée", label: "Confirmées" },
  { value: "logé",      label: "Logé ✓" },
  { value: "annulée",   label: "Annulées" },
];

const TYPE_LABELS: Record<string, string> = {
  chambre: "Chambres", studio: "Studios", appartement: "Appartement",
};

const BAR_COLOR = "#1d4ed8"; // blue-700

// ── Date helpers ─────────────────────────────────────────────────────────
function isoDay(d: Date) { return todayCam(); } // utilise l'heure Cameroun
function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const last  = new Date(year, month, 0).getDate();
  const end   = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

// ── Month/Year selectors ─────────────────────────────────────────────────
const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
const YEARS = Array.from({ length: 41 }, (_, i) => 2020 + i); // 2020 → 2060

// ── Main component ───────────────────────────────────────────────────────
export function DashboardOverview() {
  const residence  = useResidence();
  const qc         = useQueryClient();
  const runDash    = useServerFn(opGetDashboard);
  const runRevenue = useServerFn(opGetRevenueAnalytics);
  const money      = (v: number) => formatMoney(v, residence.currency);

  const now   = new Date(nowCam());
  const nowMs = nowCam();

  // ── Dashboard data ───────────────────────────────────────────────────
  const { data: dash, isLoading: loadingDash } = useQuery({
    queryKey: ["op-dashboard"],
    queryFn:  () => runDash(),
    staleTime: 30_000,
    refetchInterval: 60_000,      // rafraîchissement automatique toutes les 60s
    refetchOnWindowFocus: true,
  });

  // ── Dismissed urgent IDs ─────────────────────────────────────────────
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismiss = (id: string) => setDismissed((s) => new Set([...s, id]));

  // ── Chart filters ────────────────────────────────────────────────────
  const [filterMode,    setFilterMode]    = useState<FilterMode>("month-year");
  const [selMonth,      setSelMonth]      = useState(now.getMonth() + 1);
  const [selYear,       setSelYear]       = useState(now.getFullYear());
  const [customStart,   setCustomStart]   = useState(isoDay(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customEnd,     setCustomEnd]     = useState(isoDay(now));
  const [statusFilter,  setStatusFilter]  = useState<StatusKey>("all");
  const [metric,        setMetric]        = useState<MetricKey>("revenue");

  const range = useMemo(() => {
    if (filterMode === "custom") return { start: customStart, end: customEnd };
    return monthRange(selYear, selMonth);
  }, [filterMode, selMonth, selYear, customStart, customEnd]);

  const { data: rev, isLoading: loadingRev } = useQuery({
    queryKey: ["op-revenue", range.start, range.end],
    queryFn:  () => runRevenue({ data: range }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // ── Compute occupancy from reservations ──────────────────────────────
  // A unit is occupied if its reservation period includes now AND status = confirmée
  const occupancyByType = useMemo(() => {
    const today = isoDay(now);
    const allRes = [
      ...(dash?.arrivals ?? []),
      ...(dash?.departures ?? []),
      ...(dash?.upcomingArrivals ?? []),
      ...(dash?.upcomingDepartures ?? []),
    ];
    // Use unitCards from dashboard which already has status computed
    const cards = dash?.units ?? [];
    const byType: Record<string, { occupied: number; total: number }> = {
      chambre:     { occupied: 0, total: 0 },
      studio:      { occupied: 0, total: 0 },
      appartement: { occupied: 0, total: 0 },
    };
    for (const c of cards) {
      if (!byType[c.type]) continue;
      byType[c.type].total++;
      // Occupied = status occupee or depart (client still there)
      if (c.status === "occupee" || c.status === "depart") {
        byType[c.type].occupied++;
      }
    }
    return byType;
  }, [dash]);

  // ── Chart data ───────────────────────────────────────────────────────
  // Map our StatusKey to the keys used by opGetRevenueAnalytics
  const revStatusKey = useMemo(() => {
    // opGetRevenueAnalytics uses: all, nouvelle, confirmée, encours, terminée
    // We expose: all, confirmée, logé (=encours+terminée), annulée
    if (statusFilter === "logé")    return "encours";   // best proxy
    if (statusFilter === "annulée") return "all";       // handled below
    return statusFilter;
  }, [statusFilter]);

  const rows = useMemo(() => {
    const base = rev?.byStatus?.[revStatusKey] ?? [];
    // For annulée we want 0 (annulées are excluded from analytics server-side)
    if (statusFilter === "annulée") {
      return base.map((r) => ({ ...r, total: 0, collected: 0, balance: 0, count: 0 }));
    }
    return base;
  }, [rev, revStatusKey, statusFilter]);

  const metricValue = (r: any) => {
    if (metric === "revenue")  return r.total ?? 0;
    if (metric === "count")    return r.count ?? 0;
    if (metric === "encaisse") return r.collected ?? r.advance ?? 0;
    if (metric === "solde")    return r.balance ?? 0;
    return 0;
  };

  const chartData = rows.map((r) => ({
    label: TYPE_LABELS[r.type] ?? r.label,
    value: metricValue(r),
    type:  r.type,
  }));

  const aggregate = useMemo(() => {
    const total = rows.reduce((s, r) => s + metricValue(r), 0);
    const labels: Record<MetricKey, string> = {
      revenue:  "Chiffre d'affaires total",
      count:    "Nombre total de réservations",
      encaisse: "Montant encaissé total",
      solde:    "Solde restant total",
    };
    return { value: total, label: labels[metric] };
  }, [rows, metric]);

  // ── Urgent arrivals within 30h ────────────────────────────────────────
  const urgentArrivals = useMemo(() => {
    const in30h = nowMs + 30 * 60 * 60 * 1000;
    const allRes = [
      ...(dash?.arrivals ?? []),
      ...(dash?.upcomingArrivals ?? []),
    ];
    // Deduplicate by id
    const seen = new Set<string>();
    return allRes.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      if (dismissed.has(r.id)) return false;
      const arrMs = dateTimeMsCam(r.arrival, r.arrivalTime, "14:00");
      return arrMs >= nowMs && arrMs <= in30h && r.status !== "annulée";
    });
  }, [dash, nowMs, dismissed]);

  if (loadingDash) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-gold" />
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── 1. CARTES OCCUPATION EN TEMPS RÉEL ── */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Disponibilité à l'instant présent</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(["chambre", "studio", "appartement"] as const).map((type) => {
            const { occupied, total } = occupancyByType[type] ?? { occupied: 0, total: 0 };
            const free = total - occupied;
            return (
              <OccupancyCard
                key={type}
                label={TYPE_LABELS[type]}
                occupied={occupied}
                total={total}
                free={free}
              />
            );
          })}
        </div>
      </section>

      {/* ── 2. GRAPHIQUE CHIFFRE D'AFFAIRES ── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold">Analyse par type de logement</h2>

        {/* Filters */}
        <div className="space-y-3 rounded-2xl border-2 border-black/10 bg-card p-4 shadow-md">

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button size="sm"
              variant={filterMode === "month-year" ? "default" : "outline"}
              onClick={() => setFilterMode("month-year")}>
              Par mois / année
            </Button>
            <Button size="sm"
              variant={filterMode === "custom" ? "default" : "outline"}
              onClick={() => setFilterMode("custom")}>
              Période personnalisée
            </Button>
          </div>

          {/* Period selectors */}
          {filterMode === "month-year" ? (
            <div className="flex flex-wrap gap-2">
              <Select value={String(selMonth)} onValueChange={(v) => setSelMonth(Number(v))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selYear)} onValueChange={(v) => setSelYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" value={customStart}
                onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-auto" />
              <span className="text-muted-foreground">→</span>
              <Input type="date" value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-auto" />
            </div>
          )}

          {/* Status + Metric */}
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-1">
              <span className="self-center text-xs font-medium text-muted-foreground">Statut :</span>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <Button key={value} size="sm"
                  variant={statusFilter === value ? "default" : "outline"}
                  onClick={() => setStatusFilter(value)}>
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="self-center text-xs font-medium text-muted-foreground">Afficher :</span>
              <Button size="sm"
                variant={metric === "revenue" ? "gold" : "outline"}
                onClick={() => setMetric("revenue")}>
                Chiffre d'affaires
              </Button>
              <Button size="sm"
                variant={metric === "count" ? "gold" : "outline"}
                onClick={() => setMetric("count")}>
                Nombre de réservations
              </Button>
            </div>
          </div>
        </div>

        {loadingRev ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* Aggregate card 3D */}
            <AggregateCard
              label={aggregate.label}
              value={metric === "count" ? String(aggregate.value) : money(aggregate.value)}
              sub={filterMode === "month-year"
                ? `${MONTHS[selMonth - 1]} ${selYear}`
                : `${customStart} → ${customEnd}`}
            />

            {/* Bar chart */}
            <div className="rounded-2xl border-2 border-black/10 bg-card p-4 shadow-md">
              <p className="mb-1 font-display text-base font-semibold">
                {{"revenue": "Chiffre d'affaires", "count": "Nombre de réservations", "encaisse": "Montant encaissé", "solde": "Solde restant"}[metric]} par type
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Période : {filterMode === "month-year"
                  ? `${MONTHS[selMonth - 1]} ${selYear}`
                  : `${customStart} → ${customEnd}`}
                {" · "}Statut : {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 36, right: 16, left: 16, bottom: 8 }}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={13} />
                    <Tooltip
                      formatter={(v: number) =>
                        metric === "count"
                          ? [v, "Réservations"]
                          : [money(v), {"revenue": "CA", "encaisse": "Encaissé", "solde": "Solde"}[metric] ?? ""]
                      }
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLOR} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(v: number) =>
                          metric === "count" ? String(v) : money(v)
                        }
                        style={{ fontSize: 12, fontWeight: 700, fill: "#1d4ed8" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detail per type */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {rows.map((r) => (
                  <div key={r.type}
                    className="rounded-xl border-2 border-black/10 bg-secondary/40 p-3 shadow-sm">
                    <p className="text-xs font-semibold">{TYPE_LABELS[r.type] ?? r.label}</p>
                    <p className="mt-1 font-display text-base font-bold tabular-nums text-blue-700">
                      {metric === "count" ? r.count : money(metricValue(r))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.count} réservation{r.count > 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. ACTIONS URGENTES — arrivées dans les 30h ── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Actions urgentes
          {urgentArrivals.length > 0 && (
            <Badge variant="destructive">{urgentArrivals.length}</Badge>
          )}
        </h2>

        {urgentArrivals.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Aucune arrivée urgente dans les prochaines 30 heures.
          </div>
        ) : (
          <div className="space-y-2">
            {urgentArrivals.map((r) => {
              const arrMs = dateTimeMsCam(r.arrival, r.arrivalTime, "14:00");
              const hoursLeft = Math.max(0, Math.round((arrMs - nowMs) / 3_600_000));
              return (
                <div key={r.id}
                  className="flex items-start justify-between gap-3 rounded-xl border-2 border-amber-400/40 bg-amber-50 p-3 text-sm shadow-sm">
                  <div className="space-y-0.5">
                    <p className="font-semibold">
                      {r.name}
                      <span className="ml-2 font-mono text-[11px] text-muted-foreground">{r.ref}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.unitLabel} · {r.guests} pers. · Arrivée : {formatDateFr(r.arrival)} à {r.arrivalTime}
                    </p>
                    <p className="text-xs font-medium text-amber-700">
                      Dans environ {hoursLeft}h
                      {r.balance > 0 && ` · Solde restant : ${money(r.balance)}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100"
                    onClick={() => dismiss(r.id)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    C'est compris
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────

function OccupancyCard({
  label, occupied, total, free,
}: {
  label: string; occupied: number; total: number; free: number;
}) {
  const pctOccupied = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return (
    <div
      className="rounded-2xl bg-amber-800 p-5 text-white"
      style={{
        boxShadow: "4px 4px 0 0 #000, 6px 6px 0 0 rgba(0,0,0,0.3)",
        border: "3px solid #000",
      }}>
      <p className="text-sm font-semibold opacity-90">{label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="font-display text-4xl font-bold tabular-nums leading-none">
          {occupied}
          <span className="text-xl font-normal opacity-70">/{total}</span>
        </p>
        <p className="text-sm font-medium opacity-80">{pctOccupied}% occupé</p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/20">
        <div
          className="h-full rounded-full bg-white/80 transition-all"
          style={{ width: `${pctOccupied}%` }}
        />
      </div>
      <p className="mt-2 text-xs opacity-75">
        {free} libre{free > 1 ? "s" : ""} · {occupied} occupé{occupied > 1 ? "s" : ""}
      </p>
    </div>
  );
}

function AggregateCard({
  label, value, sub,
}: {
  label: string; value: string; sub: string;
}) {
  return (
    <div
      className="rounded-2xl bg-amber-800 p-5 text-white"
      style={{
        boxShadow: "5px 5px 0 0 #000, 8px 8px 0 0 rgba(0,0,0,0.25)",
        border: "3px solid #000",
      }}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs opacity-70">{sub}</p>
    </div>
  );
}
