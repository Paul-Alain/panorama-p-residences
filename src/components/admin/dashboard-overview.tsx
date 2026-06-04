import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Percent,
  DoorOpen,
  Plane,
  LogOut,
  LogIn,
  Clock,
  Coins,
  CreditCard,
  Mail,
  AlertTriangle,
  Eye,
  Plus,
  Wrench,
  Ban,
  Sparkles,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { opGetDashboard, opCheckIn, opCheckOut, opSetUnitOpStatus } from "@/lib/operations.functions";
import {
  UNIT_STATUS_LABELS,
  PAY_STATUS_LABELS,
  statusFillClass,
  type UnitStatus,
} from "@/lib/operations";
import { formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";
import { ReservationDetailDialog } from "./reservation-detail-dialog";

const KEYS = ["op-dashboard", "admin-reservations", "op-payments", "admin-occupancy"];

export function DashboardOverview() {
  const qc = useQueryClient();
  const residence = useResidence();
  const runDash = useServerFn(opGetDashboard);
  const runCheckIn = useServerFn(opCheckIn);
  const runCheckOut = useServerFn(opCheckOut);
  const runUnitStatus = useServerFn(opSetUnitOpStatus);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["op-dashboard"],
    queryFn: () => runDash(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => Promise.all(KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const doAction = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      await fn();
      await invalidate();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusyId(null);
  };

  const openDetail = (id: string | null) => id && setDetailId(id);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const k = data.kpis;
  const kpiCards: { icon: LucideIcon; label: string; value: string; accent?: boolean }[] = [
    { icon: Percent, label: "Occupation aujourd'hui", value: `${k.occupancyRate}%`, accent: true },
    { icon: DoorOpen, label: "Unités disponibles", value: `${k.availableUnits}/${k.totalUnits}` },
    { icon: Plane, label: "Arrivées aujourd'hui", value: String(k.arrivals) },
    { icon: LogOut, label: "Départs aujourd'hui", value: String(k.departures) },
    { icon: Clock, label: "Demandes en attente", value: String(k.pendingRequests), accent: k.pendingRequests > 0 },
    { icon: CreditCard, label: "Paiements à vérifier", value: String(k.paymentsToVerify), accent: k.paymentsToVerify > 0 },
    { icon: Mail, label: "Messages à traiter", value: String(k.newMessages), accent: k.newMessages > 0 },
    { icon: Coins, label: "Revenus du mois", value: formatMoney(k.monthRevenue, residence.currency) },
  ];

  return (
    <div className="space-y-8">
      {/* Header action */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Opérations du jour</h2>
        <Button variant="gold" size="sm" onClick={() => { setPresetUnit(null); setNewOpen(true); }}>
          <Plus className="h-4 w-4" /> Nouvelle réservation
        </Button>
      </div>

      {/* Per-type availability (green / orange / red) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(data.typeAvailability ?? []).map((tA) => {
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
                {tA.level === "full" ? "Complet" : tA.level === "partial" ? "Partiellement occupé" : "Disponible"}
              </p>
            </div>
          );
        })}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border p-4 shadow-soft ${c.accent ? "border-gold/40 bg-gradient-to-br from-gold/10 to-transparent" : "border-border/60 bg-card"}`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${c.accent ? "bg-gold/20 text-gold" : "bg-secondary text-muted-foreground"}`}>
              <c.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{c.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Next 24h (arrivals / departures) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingColumn
          title="Arrivées sous 24h"
          icon={Plane}
          rows={data.upcomingArrivals ?? []}
          empty="Aucune arrivée dans les 24 prochaines heures."
          kind="arrival"
          onView={openDetail}
        />
        <UpcomingColumn
          title="Départs sous 24h"
          icon={LogOut}
          rows={data.upcomingDepartures ?? []}
          empty="Aucun départ dans les 24 prochaines heures."
          kind="departure"
          onView={openDetail}
        />
      </div>

      {/* Urgent actions */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-gold" /> Actions urgentes
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-soft">
          {data.urgent.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune action urgente. Tout est à jour ✨</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {data.urgent.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${u.level === "haute" ? "st-dot-conflit" : u.level === "moyenne" ? "st-dot-jour" : "st-dot-bloque"}`} />
                  <span className="min-w-0 flex-1 text-sm">{u.label}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                    {u.level}
                  </Badge>
                  {u.reservationId && (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => openDetail(u.reservationId!)}>
                      Traiter
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Today: arrivals & departures */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TodayColumn
          title="Arrivées du jour"
          icon={Plane}
          rows={data.arrivals}
          empty="Aucune arrivée aujourd'hui."
          action="checkin"
          busyId={busyId}
          onView={openDetail}
          onAction={(id) => doAction(id, () => runCheckIn({ data: { id } }), "Check-in effectué.")}
        />
        <TodayColumn
          title="Départs du jour"
          icon={LogOut}
          rows={data.departures}
          empty="Aucun départ aujourd'hui."
          action="checkout"
          busyId={busyId}
          onView={openDetail}
          onAction={(id) => doAction(id, () => runCheckOut({ data: { id } }), "Check-out effectué.")}
        />
      </div>

      {/* 9 units state */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">État des unités</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.units.map((u) => (
            <div key={u.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="font-medium">{u.label}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusFillClass(u.status as UnitStatus)}`}>
                  {UNIT_STATUS_LABELS[u.status as UnitStatus]}
                </span>
              </div>
              <div className="mt-2 min-h-[2.5rem] text-sm text-muted-foreground">
                {u.guestName ? (
                  <>
                    <p className="text-foreground">
                      {u.guestName}{" "}
                      <span className="text-xs text-muted-foreground">({u.guestPhase})</span>
                    </p>
                    <p className="text-xs">{u.period}</p>
                    {u.paymentStatus && (
                      <p className="text-xs">{PAY_STATUS_LABELS[u.paymentStatus] ?? u.paymentStatus}</p>
                    )}
                  </>
                ) : (
                  <p>Aucun client à venir</p>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
                <Button size="sm" variant="outline" disabled={!u.reservationId} onClick={() => openDetail(u.reservationId)}>
                  <Eye className="h-4 w-4" /> Voir
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setPresetUnit(u.id); setNewOpen(true); }}>
                  <Plus className="h-4 w-4" /> Réserver
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" disabled={busyId === u.id}>
                      {busyId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "•••"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => doAction(u.id, () => runUnitStatus({ data: { unitId: u.id, opStatus: "bloquee" } }), "Unité bloquée.")}>
                      <Ban className="h-4 w-4" /> Bloquer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => doAction(u.id, () => runUnitStatus({ data: { unitId: u.id, opStatus: "maintenance" } }), "Unité en maintenance.")}>
                      <Wrench className="h-4 w-4" /> Maintenance
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => doAction(u.id, () => runUnitStatus({ data: { unitId: u.id, opStatus: "nettoyage" } }), "Unité en nettoyage.")}>
                      <Sparkles className="h-4 w-4" /> Nettoyage
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => doAction(u.id, () => runUnitStatus({ data: { unitId: u.id, opStatus: "actif" } }), "Unité réactivée.")}>
                      <RotateCcw className="h-4 w-4" /> Remettre actif
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ReservationDetailDialog reservationId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} />
      <NewReservationDialog open={newOpen} onOpenChange={setNewOpen} presetUnitId={presetUnit} />
    </div>
  );
}

interface TodayRow {
  id: string;
  name: string;
  unitLabel: string;
  guests: number;
  paymentStatus: string;
  status: string;
}

function TodayColumn({
  title,
  icon: Icon,
  rows,
  empty,
  action,
  busyId,
  onView,
  onAction,
}: {
  title: string;
  icon: LucideIcon;
  rows: TodayRow[];
  empty: string;
  action: "checkin" | "checkout";
  busyId: string | null;
  onView: (id: string) => void;
  onAction: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <p className="flex items-center gap-2 font-medium">
        <Icon className="h-4 w-4 text-gold" /> {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => {
            const canAct = action === "checkin" ? r.status === "confirmée" : r.status === "checkin";
            return (
              <li key={r.id} className="rounded-xl border border-border/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button className="font-medium hover:text-gold" onClick={() => onView(r.id)}>
                      {r.name}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {r.unitLabel} · {r.guests} pers. · {PAY_STATUS_LABELS[r.paymentStatus] ?? r.paymentStatus}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={canAct ? "gold" : "outline"}
                    disabled={!canAct || busyId === r.id}
                    onClick={() => onAction(r.id)}
                  >
                    {busyId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : action === "checkin" ? (
                      <LogIn className="h-4 w-4" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {action === "checkin" ? "Check-in" : "Check-out"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface UpcomingRow {
  id: string;
  name: string;
  unitLabel: string;
  guests: number;
  arrival: string;
  departure: string;
  arrivalTime: string;
  departureTime: string;
}

function UpcomingColumn({
  title,
  icon: Icon,
  rows,
  empty,
  kind,
  onView,
}: {
  title: string;
  icon: LucideIcon;
  rows: UpcomingRow[];
  empty: string;
  kind: "arrival" | "departure";
  onView: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <p className="flex items-center gap-2 font-medium">
        <Icon className="h-4 w-4 text-gold" /> {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/50 p-3">
              <div className="min-w-0">
                <button className="font-medium hover:text-gold" onClick={() => onView(r.id)}>
                  {r.name}
                </button>
                <p className="text-xs text-muted-foreground">
                  {r.unitLabel} · {r.guests} pers. ·{" "}
                  {kind === "arrival" ? r.arrivalTime : r.departureTime}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onView(r.id)}>
                <Eye className="h-4 w-4" /> Ouvrir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

