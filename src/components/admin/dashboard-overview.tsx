import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Loader2, TrendingUp, Wallet, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { opGetDashboard, opGetRevenueAnalytics } from "@/lib/operations.functions";
import { formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";

type Period = "week" | "month" | "quarter" | "year" | "custom";
type StatusFilter = "terminée" | "all" | "confirmée" | "encours" | "nouvelle";
type Metric = "total" | "collected" | "balance";

const TYPE_COLORS = ["hsl(43 74% 49%)", "hsl(200 70% 45%)", "hsl(160 60% 40%)"];

function isoDay(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function rangeFor(period: Period): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  if (period === "week") start.setDate(now.getDate() - 7);
  else if (period === "month") start.setMonth(now.getMonth() - 1);
  else if (period === "quarter") start.setMonth(now.getMonth() - 3);
  else if (period === "year") start.setFullYear(now.getFullYear() - 1);
  return { start: isoDay(start), end: isoDay(end) };
}

export function DashboardOverview() {
  const residence = useResidence();
  const runDash = useServerFn(opGetDashboard);
  const runRevenue = useServerFn(opGetRevenueAnalytics);

  const { data: dash, isLoading: loadingDash } = useQuery({
    queryKey: ["op-dashboard"],
    queryFn: () => runDash(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [period, setPeriod] = useState<Period>("year");
  const [customStart, setCustomStart] = useState(rangeFor("year").start);
  const [customEnd, setCustomEnd] = useState(rangeFor("year").end);
  const [status, setStatus] = useState<StatusFilter>("terminée");
  const [metric, setMetric] = useState<Metric>("total");

  const range = useMemo(
    () => (period === "custom" ? { start: customStart, end: customEnd } : rangeFor(period)),
    [period, customStart, customEnd],
  );

  const { data: rev, isLoading: loadingRev } = useQuery({
    queryKey: ["op-revenue", range.start, range.end],
    queryFn: () => runRevenue({ data: range }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const periods: { value: Period; label: string }[] = [
    { value: "week", label: "Semaine" },
    { value: "month", label: "Mois" },
    { value: "quarter", label: "Trimestre" },
    { value: "year", label: "Année" },
    { value: "custom", label: "Personnalisé" },
  ];

  const statuses: { value: StatusFilter; label: string }[] = [
    { value: "terminée", label: "Terminées" },
    { value: "encours", label: "En cours" },
    { value: "confirmée", label: "Confirmées" },
    { value: "nouvelle", label: "En attente" },
    { value: "all", label: "Toutes" },
  ];

  const metrics: { value: Metric; label: string; icon: typeof TrendingUp }[] = [
    { value: "total", label: "Chiffre d'affaires", icon: TrendingUp },
    { value: "collected", label: "Encaissé (avances)", icon: Wallet },
    { value: "balance", label: "Solde restant", icon: Scale },
  ];

  const rows = rev?.byStatus?.[status] ?? [];
  const chartData = rows.map((r) => ({
    label: r.label,
    value: r[metric],
    count: r.count,
  }));
  const totalValue = rows.reduce((s, r) => s + r[metric], 0);
  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  const totalCa = rows.reduce((s, r) => s + r.total, 0);
  const totalCollected = rows.reduce((s, r) => s + r.collected, 0);
  const totalBalance = rows.reduce((s, r) => s + r.balance, 0);

  const metricLabel = metrics.find((m) => m.value === metric)!.label;
  const money = (v: number) => formatMoney(v, residence.currency);

  return (
    <div className="space-y-8">
      {/* 1) Availability right now — 3 type cards only */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Disponibilité à l'instant présent</h2>
        {loadingDash || !dash ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(dash.typeAvailability ?? []).map((tA) => {
              const label =
                tA.type === "chambre" ? "Chambres" : tA.type === "studio" ? "Studios" : "Appartements";
              const tone =
                tA.level === "free"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                  : tA.level === "partial"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                    : "border-red-500/40 bg-red-500/10 text-red-600";
              return (
                <div key={tA.type} className={`rounded-2xl border p-4 shadow-soft ${tone}`}>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
                    {tA.available}/{tA.total}
                  </p>
                  <p className="mt-0.5 text-xs opacity-80">
                    {tA.level === "full"
                      ? "Complet"
                      : tA.level === "partial"
                        ? "Partiellement occupé"
                        : "Disponible"}{" "}
                    · {tA.available} libre(s)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2) Revenue analytics from reservation history */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Analyse du chiffre d'affaires</h2>
        </div>

        {/* Filters */}
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Période :</span>
            {periods.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={period === p.value ? "gold" : "outline"}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-auto" />
                <span className="text-muted-foreground">→</span>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-auto" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Statut :</span>
            {statuses.map((s) => (
              <Button
                key={s.value}
                size="sm"
                variant={status === s.value ? "default" : "outline"}
                onClick={() => setStatus(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Indicateur :</span>
            {metrics.map((m) => (
              <Button
                key={m.value}
                size="sm"
                variant={metric === m.value ? "gold" : "outline"}
                onClick={() => setMetric(m.value)}
              >
                <m.icon className="h-4 w-4" /> {m.label}
              </Button>
            ))}
          </div>
        </div>

        {loadingRev || !rev ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <StatCard icon={TrendingUp} label="Chiffre d'affaires" value={money(totalCa)} accent={metric === "total"} />
              <StatCard icon={Wallet} label="Encaissé (avances)" value={money(totalCollected)} accent={metric === "collected"} />
              <StatCard icon={Scale} label="Solde restant" value={money(totalBalance)} accent={metric === "balance"} />
              <StatCard icon={TrendingUp} label="Réservations" value={String(totalCount)} />
            </div>

            {/* Bar chart by type with values written on bars */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <h3 className="mb-1 font-display text-base font-semibold">
                {metricLabel} par type de logement
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                {statuses.find((s) => s.value === status)!.label} · {money(totalValue)} au total
              </p>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 24, right: 8, left: 8, bottom: 8 }}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      width={78}
                      tickFormatter={(v) => money(Number(v))}
                    />
                    <Tooltip
                      formatter={(v: number) => [money(Number(v)), metricLabel]}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(v: number) => money(Number(v))}
                        style={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Per-type detail */}
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {rows.map((r) => (
                  <div key={r.type} className="rounded-xl border border-border/50 p-3">
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.count} réservation(s)</p>
                    <div className="mt-2 space-y-0.5 text-xs">
                      <p className="flex justify-between"><span className="text-muted-foreground">CA</span><span className="tabular-nums">{money(r.total)}</span></p>
                      <p className="flex justify-between"><span className="text-muted-foreground">Encaissé</span><span className="tabular-nums">{money(r.collected)}</span></p>
                      <p className="flex justify-between"><span className="text-muted-foreground">Solde</span><span className="tabular-nums">{money(r.balance)}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-soft ${accent ? "border-gold/40 bg-gradient-to-br from-gold/10 to-transparent" : "border-border/60 bg-card"}`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${accent ? "bg-gold/20 text-gold" : "bg-secondary text-muted-foreground"}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
