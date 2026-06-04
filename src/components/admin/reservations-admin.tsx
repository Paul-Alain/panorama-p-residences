import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Pencil,
  XCircle,
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
} from "@/lib/operations.functions";
import {
  RES_STATUS_LABELS,
  DISPLAY_RES_STATUSES,
} from "@/lib/operations";
import { formatDateFr, formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";
import {
  ReservationFormDialog,
  type EditableReservation,
} from "./reservation-form-dialog";

const PAGE_SIZE = 20;
const KEYS = ["op-dashboard", "admin-reservations", "op-payments", "admin-occupancy", "op-calendar"];

const TYPE_LABELS: Record<string, string> = {
  chambre: "Chambre",
  studio: "Studio",
  appartement: "Appartement",
};

type ResItem = Awaited<ReturnType<typeof opListReservations>>[number];

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "confirmée" || s === "encours") return "default";
  if (s === "terminée") return "secondary";
  if (s === "annulée") return "destructive";
  return "outline";
}

function toEditable(r: ResItem): EditableReservation {
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
    notes: r.notes ?? null,
  };
}

export function ReservationsAdmin() {
  const qc = useQueryClient();
  const residence = useResidence();
  const runList = useServerFn(opListReservations);
  const runStatus = useServerFn(opSetReservationStatus);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: () => runList(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"active" | "all">("active");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  
  const [editing, setEditing] = useState<EditableReservation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const invalidate = () => Promise.all(KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (view === "active" && !r.active) return false;
      if (q) {
        const hay = `${r.name} ${r.phone} ${r.email ?? ""} ${r.ref}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status !== "all" && r.displayStatus !== status) return false;
      return true;
    });
  }, [data, search, status, view]);

  useEffect(() => setPage(1), [search, status, view]);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant={view === "active" ? "gold" : "outline"}
            size="sm"
            onClick={() => setView("active")}
          >
            Réservations actives
          </Button>
          <Button
            variant={view === "all" ? "gold" : "outline"}
            size="sm"
            onClick={() => setView("all")}
          >
            Historique complet
          </Button>
        </div>
        <Button variant="gold" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvelle réservation
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, téléphone, e-mail, réf.)" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {DISPLAY_RES_STATUSES.map((s) => (
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
          {/* Data table (rows / columns) — scrolls horizontally on small screens */}
          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Téléphone</th>
                  <th className="px-3 py-2">E-mail</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Pers.</th>
                  <th className="px-3 py-2">Arrivée</th>
                  <th className="px-3 py-2">Départ</th>
                  <th className="px-3 py-2 text-center">Unités</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2 text-right">Total à payer</th>
                  <th className="px-3 py-2 text-right">Avancé</th>
                  <th className="px-3 py-2 text-right">Solde</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pageItems.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="px-3 py-2">
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-1 font-mono text-[11px] text-muted-foreground">{r.ref}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.phone}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.email || "—"}</td>
                    <td className="px-3 py-2">{TYPE_LABELS[r.logement_type ?? ""] ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{r.guests}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateFr(r.arrival_date)} <span className="text-muted-foreground">{r.arrival_time}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateFr(r.departure_date)} <span className="text-muted-foreground">{r.departure_time}</span></td>
                    <td className="px-3 py-2 text-center font-medium">{r.units}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(r.displayStatus)}>{RES_STATUS_LABELS[r.displayStatus] ?? r.displayStatus}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{formatMoney(r.total, residence.currency)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap text-emerald-600">{formatMoney(r.advance, residence.currency)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap text-gold">{formatMoney(r.balance, residence.currency)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <RowActions r={r} busyId={busyId} onEdit={() => setEditing(toEditable(r))} act={act} runStatus={runStatus} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <ReservationFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ReservationFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        reservation={editing}
      />
    </div>
  );
}

function RowActions({
  r,
  busyId,
  onView,
  onEdit,
  act,
  runStatus,
}: {
  r: ResItem;
  busyId: string | null;
  onView: () => void;
  onEdit: () => void;
  act: (id: string, fn: () => Promise<unknown>, ok: string) => Promise<void>;
  runStatus: (a: { data: { id: string; status: any } }) => Promise<unknown>;
}) {
  const loading = busyId === r.id;
  return (
    <>
      <Button size="sm" variant="ghost" onClick={onView} title="Voir détails">
        <Eye className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onEdit} title="Modifier">
        <Pencil className="h-4 w-4" />
      </Button>
      {r.displayStatus === "nouvelle" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => act(r.id, () => runStatus({ data: { id: r.id, status: "confirmée" } }), "Réservation confirmée.")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirmer
        </Button>
      )}
      {r.active && r.displayStatus !== "annulée" && (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={loading}
          onClick={() => {
            if (confirm("Annuler cette réservation ?"))
              act(r.id, () => runStatus({ data: { id: r.id, status: "annulée" } }), "Réservation annulée.");
          }}
          title="Annuler"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
