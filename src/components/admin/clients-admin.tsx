import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, Search, Phone, Mail, User,
  ArrowLeft, Users, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { opListClients, opGetClientDetail } from "@/lib/operations.functions";
import { RES_STATUS_LABELS, PAY_STATUS_LABELS, PAY_METHOD_LABELS } from "@/lib/operations";
import { formatDateFr, formatMoney } from "@/lib/format";
import { useResidence } from "@/lib/use-residence";

const PAGE_SIZE = 20;

export function ClientsAdmin() {
  const residence  = useResidence();
  const runList    = useServerFn(opListClients);
  const runDetail  = useServerFn(opGetClientDetail);
  const [search,    setSearch]    = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [page,      setPage]      = useState(1);

  const { data = [], isLoading } = useQuery({
    queryKey: ["op-clients"],
    queryFn:  () => runList(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["op-client-detail", activeKey],
    queryFn:  () => runDetail({ data: { key: activeKey! } }),
    enabled:  !!activeKey,
  });

  const filtered = data.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${c.name} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-gold" />;

  // ── Détail client ──────────────────────────────────────────────────────
  if (activeKey) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={() => setActiveKey(null)}>
          <ArrowLeft className="h-4 w-4" /> Retour aux clients
        </Button>
        {detailLoading || !detail ? (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <h2 className="font-display text-xl font-semibold">{detail.profile.name}</h2>
              <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {detail.profile.phone}
                </span>
                {detail.profile.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {detail.profile.email}
                  </span>
                )}
              </p>
              <p className="mt-3 text-sm">
                Total dépensé :{" "}
                <span className="font-semibold text-gold">
                  {formatMoney(detail.totalSpent, residence.currency)}
                </span>
              </p>
            </div>

            <DetailSection title="Réservations">
              {detail.reservations.length === 0 ? <Empty /> : detail.reservations.map((r) => (
                <DetailLine key={r.id}
                  left={`${r.ref} · ${formatDateFr(r.arrival)} → ${formatDateFr(r.departure)}`}
                  right={
                    <span className="flex gap-1">
                      <Badge variant="outline">{RES_STATUS_LABELS[r.status] ?? r.status}</Badge>
                      <Badge variant="secondary">{PAY_STATUS_LABELS[r.paymentStatus] ?? r.paymentStatus}</Badge>
                    </span>
                  }
                />
              ))}
            </DetailSection>

            <DetailSection title="Paiements">
              {detail.payments.length === 0 ? <Empty /> : detail.payments.map((p) => (
                <DetailLine key={p.id}
                  left={`${formatMoney(p.amount, residence.currency)} · ${PAY_METHOD_LABELS[p.method] ?? p.method}`}
                  right={<span className="text-xs text-muted-foreground">{formatDateFr(p.createdAt)}</span>}
                />
              ))}
            </DetailSection>

            <DetailSection title="Messages">
              {detail.messages.length === 0 ? <Empty /> : detail.messages.map((m) => (
                <DetailLine key={m.id}
                  left={formatDateFr(m.createdAt)}
                  right={<Badge variant="outline">{m.status}</Badge>}
                />
              ))}
            </DetailSection>
          </>
        )}
      </div>
    );
  }

  // ── Liste clients ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
          <Users className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Clients ayant séjourné</h2>
          <p className="text-xs text-muted-foreground">
            Uniquement les clients dont au moins une réservation a atteint le statut{" "}
            <span className="font-medium text-blue-700">Logé ✓</span>
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">{data.length} client(s)</Badge>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par nom, téléphone ou email"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            {search ? "Aucun client ne correspond à la recherche." : "Aucun client ayant séjourné pour le moment."}
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Nom
                    </span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Téléphone
                    </span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center">Séjours</th>
                  <th className="px-4 py-3">Dernier séjour</th>
                  <th className="px-4 py-3 text-right">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pageItems.map((c) => (
                  <tr key={c.key} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.phone}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.email ?? <span className="italic opacity-50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary">{c.reservations}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.lastStay ? formatDateFr(c.lastStay) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline"
                        onClick={() => setActiveKey(c.key)}>
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{filtered.length} client(s)</span>
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
    </div>
  );
}

// ── Sous-composants détail ────────────────────────────────────────────────
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-base font-semibold">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailLine({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2 text-sm">
      <span>{left}</span>
      {right}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">—</p>;
}
