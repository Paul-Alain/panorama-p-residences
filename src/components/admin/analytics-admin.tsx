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
} from "recharts";
import { Loader2, TrendingUp, Wallet, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { opGetAnalytics } from "@/lib/operations.functions";
import { formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";

type Period = "week" | "month" | "quarter" | "custom";

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
  return { start: isoDay(start), end: isoDay(end) };
}

const BAR_COLORS = ["hsl(43 74% 49%)", "hsl(200 70% 45%)", "hsl(160 60% 40%)"];

export function AnalyticsAdmin() {
  const residence = useResidence();
  const runAnalytics = useServerFn(opGetAnalytics);

  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState(rangeFor("month").start);
  const [customEnd, setCustomEnd] = useState(rangeFor("month").end);

  const range = useMemo(
    () => (period === "custom" ? { start: customStart, end: customEnd } : rangeFor(period)),
    [period, customStart, customEnd],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["op-analytics", range.start, range.end],
    queryFn: () => runAnalytics({ data: range }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const periods: { value: Period; label: string }[] = [
    { value: "week", label: "Semaine" },
    { value: "month", label: "Mois" },
    { value: "quarter", label: "Trimestre" },
    { value: "custom", label: "Personnalisé" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
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

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon={TrendingUp} label="Revenu attendu" value={formatMoney(data.expectedRevenue, residence.currency)} />
            <StatCard icon={Wallet} label="Revenu encaissé" value={formatMoney(data.collectedRevenue, residence.currency)} accent />
            <StatCard icon={CalendarClock} label="Revenu projeté" value={formatMoney(data.projectedRevenue, residence.currency)} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniCard label="Réservations" value={String(data.totalReservations)} />
            <MiniCard label="Séjours terminés" value={String(data.completedStays)} />
            <MiniCard label="Séjours à venir" value={String(data.upcomingStays)} />
          </div>

          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <h3 className="mb-4 font-display text-lg font-semibold">Revenu attendu par type de logement</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByType} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={72}
                    tickFormatter={(v) => formatMoney(Number(v), residence.currency)} />
                  <Tooltip
                    formatter={(v: number) => [formatMoney(Number(v), residence.currency), "Revenu attendu"]}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  />
                  <Bar dataKey="expected" radius={[6, 6, 0, 0]}>
                    {data.revenueByType.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              {data.revenueByType.map((t) => (
                <div key={t.type} className="rounded-xl border border-border/50 p-2">
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.count} réservation(s)</p>
                  <p className="mt-1 font-display tabular-nums">{formatMoney(t.expected, residence.currency)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof TrendingUp; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-soft ${accent ? "border-gold/40 bg-gradient-to-br from-gold/10 to-transparent" : "border-border/60 bg-card"}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${accent ? "bg-gold/20 text-gold" : "bg-secondary text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 text-center shadow-soft">
      <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
