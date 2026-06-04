import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Phone,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  LogIn,
  LogOut,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  opListReservations,
  opSetReservationStatus,
  opCheckIn,
  opCheckOut,
} from "@/lib/operations.functions";
import { RES_STATUS_LABELS, PAY_STATUS_LABELS } from "@/lib/operations";
import { formatDateFr, formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";
import { ReservationDetailDialog } from "./reservation-detail-dialog";

const PAGE_SIZE = 20;
const KEYS = ["op-dashboard", "admin-reservations", "op-payments", "admin-occupancy"];

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "confirmée" || s === "checkin") return "default";
  if (s === "terminée") return "secondary";
  if (s === "annulée") return "destructive";
  return "outline";
}

export function ReservationsAdmin() {
  const qc = useQueryClient();
  const residence = useResidence();
  const runList = useServerFn(opListReservations);
  const runStatus = useServerFn(opSetReservationStatus);
  const runCheckIn = useServerFn(opCheckIn);
  const runCheckOut = useServerFn(opCheckOut);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: () => runList(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const invalidate = () => Promise.all(KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (q) {
        const hay = `${r.name} ${r.phone} ${r.email ?? ""} ${r.ref} ${r.unitLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [data, search, status]);

  useEffect(() => setPage(1), [search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const STATUSES = ["nouvelle", "confirmée", "checkin", "terminée", "annulée"];

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, téléphone, unité, réf.)" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {RES_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">Aucune réservation.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border/60 lg:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Réf.</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Téléphone</th>
                  <th className="px-3 py-2">Unité</th>
                  <th className="px-3 py-2">Arrivée</th>
                  <th className="px-3 py-2">Départ</th>
                  <th className="px-3 py-2">Pers.</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Paiement</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pageItems.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.phone}</td>
                    <td className="px-3 py-2">{r.unitLabel}</td>
                    <td className="px-3 py-2">{formatDateFr(r.arrival_date)}</td>
                    <td className="px-3 py-2">{formatDateFr(r.departure_date)}</td>
                    <td className="px-3 py-2 text-center">{r.guests}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(r.status)}>{RES_STATUS_LABELS[r.status] ?? r.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs">{PAY_STATUS_LABELS[r.payment_status] ?? r.payment_status}</span>
                      {r.balance > 0 && <span className="block text-xs text-gold">{formatMoney(r.balance, residence.currency)}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <RowActions r={r} busyId={busyId} onView={() => setDetailId(r.id)} act={act} runStatus={runStatus} runCheckIn={runCheckIn} runCheckOut={runCheckOut} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {pageItems.map((r) => (
              <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{r.name} <span className="font-mono text-xs text-muted-foreground">{r.ref}</span></p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {r.phone}
                    </p>
                  </div>
                  <Badge variant={statusVariant(r.status)}>{RES_STATUS_LABELS[r.status] ?? r.status}</Badge>
                </div>
                <p className="mt-2 text-sm">{r.unitLabel} · {r.guests} pers.</p>
                <p className="text-sm text-muted-foreground">{formatDateFr(r.arrival_date)} → {formatDateFr(r.departure_date)}</p>
                <p className="mt-1 text-sm">
                  {PAY_STATUS_LABELS[r.payment_status] ?? r.payment_status}
                  {r.balance > 0 && <span className="text-gold"> · solde {formatMoney(r.balance, residence.currency)}</span>}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border/50 pt-3">
                  <RowActions r={r} busyId={busyId} onView={() => setDetailId(r.id)} act={act} runStatus={runStatus} runCheckIn={runCheckIn} runCheckOut={runCheckOut} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{filtered.length} réservation(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ReservationDetailDialog reservationId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} />
    </div>
  );
}

interface Row {
  id: string;
  status: string;
}

function RowActions({
  r,
  busyId,
  onView,
  act,
  runStatus,
  runCheckIn,
  runCheckOut,
}: {
  r: Row;
  busyId: string | null;
  onView: () => void;
  act: (id: string, fn: () => Promise<unknown>, ok: string) => Promise<void>;
  runStatus: (a: { data: { id: string; status: any } }) => Promise<unknown>;
  runCheckIn: (a: { data: { id: string } }) => Promise<unknown>;
  runCheckOut: (a: { data: { id: string } }) => Promise<unknown>;
}) {
  const loading = busyId === r.id;
  return (
    <>
      <Button size="sm" variant="ghost" onClick={onView} title="Voir détails">
        <Eye className="h-4 w-4" />
      </Button>
      {r.status === "nouvelle" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => act(r.id, () => runStatus({ data: { id: r.id, status: "confirmée" } }), "Confirmée.")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirmer
        </Button>
      )}
      {r.status === "confirmée" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => act(r.id, () => runCheckIn({ data: { id: r.id } }), "Check-in effectué.")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Check-in
        </Button>
      )}
      {r.status === "checkin" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => act(r.id, () => runCheckOut({ data: { id: r.id } }), "Check-out effectué.")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Check-out
        </Button>
      )}
    </>
  );
}
