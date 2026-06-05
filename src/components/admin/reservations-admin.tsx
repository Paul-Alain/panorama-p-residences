import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Search, Plus, ChevronLeft, ChevronRight,
  CheckCircle2, Pencil, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { opListReservations, opSetReservationStatus } from "@/lib/operations.functions";
import {
  RES_STATUS_LABELS, DISPLAY_RES_STATUSES,
  isLocked, type DisplayResStatus,
} from "@/lib/operations";
import { formatDateFr, formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";
import {
  ReservationFormDialog, RESERVATION_QUERY_KEYS,
  type EditableReservation,
} from "./reservation-form-dialog";

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  chambre: "Chambre", studio: "Studio", appartement: "Appartement",
};
const CHANNEL_LABELS: Record<string, string> = {
  website: "Site web", whatsapp: "WhatsApp", phone: "Téléphone", walkin: "Sur place",
};

type ResItem = Awaited<ReturnType<typeof opListReservations>>[number];

function statusBadgeClass(s: DisplayResStatus) {
  switch (s) {
    case "nouvelle":  return "bg-amber-100  text-amber-700  border-amber-300";
    case "confirmée": return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "logé":      return "bg-blue-100   text-blue-700   border-blue-300";
    case "annulée":   return "bg-red-100    text-red-700    border-red-300";
    default:          return "bg-secondary  text-foreground  border-border";
  }
}

function toEditable(r: ResItem): EditableReservation {
  return {
    id: r.id, name: r.name, phone: r.phone, email: r.email,
    logement_type: r.logement_type, guests: r.guests,
    arrival_date: r.arrival_date, departure_date: r.departure_date,
    arrival_time: r.arrival_time, departure_time: r.departure_time,
    channel: r.channel, advance: r.advance,
    total_amount: r.total, notes: r.notes ?? null, status: r.status,
  };
}

// Generate list of months for filter, covering every year from 2025 to 2050
function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  for (let year = 2025; year <= 2050; year++) {
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, 1);
      const value = `${year}-${String(m + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
  }
  return options;
}

export function ReservationsAdmin() {
  const qc        = useQueryClient();
  const residence = useResidence();
  const runList   = useServerFn(opListReservations);
  const runStatus = useServerFn(opSetReservationStatus);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn:  () => runList(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [search,     setSearch]     = useState("");
  const [status,     setStatus]     = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [page,       setPage]       = useState(1);
  const [busyId,     setBusyId]     = useState<string | null>(null);
  const [editing,    setEditing]    = useState<EditableReservation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sort,       setSort]       = useState<{ column: "arrival" | "departure"; dir: "asc" | "desc" } | null>(null);

  // "Actives" = departure datetime not yet passed
  const nowMs = Date.now();
  const activeCount = useMemo(() =>
    data.filter((r) => {
      const depMs = new Date(
        `${r.departure_date}T${(r.departure_time ?? "11:00").slice(0, 5)}:00`
      ).getTime();
      return r.status !== "annulée" && depMs > nowMs;
    }).length,
  [data, nowMs]);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const invalidate = () =>
    Promise.all(RESERVATION_QUERY_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.filter((r) => {
      // Active filter: departure not yet passed
      if (monthFilter === "active") {
        const depMs = new Date(
          `${r.departure_date}T${(r.departure_time ?? "11:00").slice(0, 5)}:00`
        ).getTime();
        if (r.status === "annulée" || depMs <= nowMs) return false;
      }
      // Month filter: by arrival date
      if (monthFilter !== "all" && monthFilter !== "active") {
        if (!r.arrival_date.startsWith(monthFilter)) return false;
      }
      // Search
      if (q) {
        const hay = `${r.name} ${r.phone} ${r.email ?? ""} ${r.ref}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Status filter
      if (status !== "all" && r.displayStatus !== status) return false;
      return true;
    });

    if (!sort) return list;
    const key = sort.column === "arrival" ? "arrival_date" : "departure_date";
    return [...list].sort((a, b) => {
      const cmp = (a as any)[key].localeCompare((b as any)[key]);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [data, search, status, monthFilter, sort, nowMs]);

  useEffect(() => setPage(1), [search, status, monthFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
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

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="gold" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvelle réservation
        </Button>
      </div>

      {/* Filters row */}
      <div className="grid gap-2 sm:grid-cols-4">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, tél, e-mail, réf.)" className="pl-9" />
        </div>

        {/* Month filter */}
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger><SelectValue placeholder="Tous les mois" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les mois</SelectItem>
            <SelectItem value="active">
              Réservations actives ({activeCount})
            </SelectItem>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {DISPLAY_RES_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{RES_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status summary badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        {DISPLAY_RES_STATUSES.map((s) => {
          const count = data.filter((r) => r.displayStatus === s).length;
          if (count === 0) return null;
          return (
            <button key={s}
              onClick={() => setStatus(s === status ? "all" : s)}
              className={`rounded-full border px-3 py-1 font-medium transition ${statusBadgeClass(s)} ${status === s ? "ring-2 ring-offset-1" : ""}`}>
              {RES_STATUS_LABELS[s]} · {count}
            </button>
          );
        })}
        <span className="rounded-full border border-border/60 bg-secondary px-3 py-1 text-muted-foreground">
          Total : {data.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">Aucune réservation trouvée.</p>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Réf.</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Téléphone</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-center">Pers.</th>
                  <SortHeader label="Arrivée"  column="arrival"   sort={sort} onSort={setSort} />
                  <SortHeader label="Départ"   column="departure" sort={sort} onSort={setSort} />
                  <th className="px-3 py-2 text-center">Unités</th>
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Avance</th>
                  <th className="px-3 py-2 text-right">Solde</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pageItems.map((r) => {
                  const locked = isLocked(r.displayStatus as DisplayResStatus);
                  return (
                    <tr key={r.id}
                      className={`hover:bg-secondary/30 ${locked ? "opacity-70" : ""}`}>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.ref}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.phone}</td>
                      <td className="px-3 py-2">{TYPE_LABELS[r.logement_type ?? ""] ?? "—"}</td>
                      <td className="px-3 py-2 text-center">{r.guests}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDateFr(r.arrival_date)}
                        <span className="ml-1 text-muted-foreground">{r.arrival_time}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDateFr(r.departure_date)}
                        <span className="ml-1 text-muted-foreground">{r.departure_time}</span>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">{r.units}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {CHANNEL_LABELS[r.channel] ?? r.channel}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(r.displayStatus as DisplayResStatus)}`}>
                          {locked && <Lock className="h-3 w-3" />}
                          {RES_STATUS_LABELS[r.displayStatus] ?? r.displayStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {formatMoney(r.total, residence.currency)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-emerald-600">
                        {formatMoney(r.advance, residence.currency)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-gold">
                        {formatMoney(r.balance, residence.currency)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <RowActions r={r} busyId={busyId} locked={locked}
                            onEdit={() => setEditing(toEditable(r))}
                            act={act} runStatus={runStatus} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{filtered.length} réservation(s)</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <ReservationFormDialog open={createOpen} onOpenChange={setCreateOpen}
        onSaved={invalidate} />
      <ReservationFormDialog
        open={!!editing} onOpenChange={(v) => !v && setEditing(null)}
        reservation={editing} onSaved={invalidate} />
    </div>
  );
}

function SortHeader({ label, column, sort, onSort }: {
  label: string;
  column: "arrival" | "departure";
  sort: { column: "arrival" | "departure"; dir: "asc" | "desc" } | null;
  onSort: (s: { column: "arrival" | "departure"; dir: "asc" | "desc" } | null) => void;
}) {
  const active = sort?.column === column;
  const Icon   = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="cursor-pointer select-none px-3 py-2"
      onClick={() => {
        if (!active)                  onSort({ column, dir: "asc" });
        else if (sort!.dir === "asc") onSort({ column, dir: "desc" });
        else                          onSort(null);
      }}>
      <span className="inline-flex items-center gap-1">
        {label} <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
    </th>
  );
}

function RowActions({ r, busyId, locked, onEdit, act, runStatus }: {
  r: ResItem;
  busyId: string | null;
  locked: boolean;
  onEdit: () => void;
  act: (id: string, fn: () => Promise<unknown>, ok: string) => Promise<void>;
  runStatus: (a: { data: { id: string; status: any } }) => Promise<unknown>;
}) {
  const loading = busyId === r.id;
  if (locked) return <Lock className="h-4 w-4 text-muted-foreground/40" />;
  return (
    <>
      <Button size="sm" variant="ghost" onClick={onEdit} title="Modifier">
        <Pencil className="h-4 w-4" />
      </Button>
      {r.displayStatus === "nouvelle" && (
        <Button size="sm" variant="outline" disabled={loading}
          onClick={() => act(r.id,
            () => runStatus({ data: { id: r.id, status: "confirmée" } }),
            "Réservation confirmée.")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          Confirmer
        </Button>
      )}
      {(r.displayStatus === "nouvelle" || r.displayStatus === "confirmée") && (
        <Button size="sm" variant="ghost"
          className="text-destructive hover:text-destructive" disabled={loading}
          onClick={() => {
            const label = r.displayStatus === "nouvelle" ? "Rejeter" : "Annuler";
            const ok    = r.displayStatus === "nouvelle" ? "Réservation rejetée." : "Réservation annulée.";
            if (confirm(`${label} cette réservation ?`))
              act(r.id, () => runStatus({ data: { id: r.id, status: "annulée" } }), ok);
          }}>
          <XCircle className="h-4 w-4" />
          {r.displayStatus === "nouvelle" ? "Rejeter" : "Annuler"}
        </Button>
      )}
    </>
  );
}
